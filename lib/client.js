window.__ModuleLoader__.load({ id: "dsh-search", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
// dsh-search — client half：设置侧边栏「搜索服务」页
// 页面复用 DSH 原生「模型」页的表单尺寸、层级、语义色、焦点与悬停状态；
// 交互遵循 macOS Apple HIG：互斥服务用 pop-up button，钥匙使用安全输入框，
// 仅在保存时生效，错误就近提示，且所有状态都有文字而非仅靠颜色传达。
module.exports = {
  inject: ['slots'],
  async apply(ctx) {
    let slots = ctx.slots || ctx.get('slots');
    for (let i = 0; slots === undefined && i < 60; i++) {
      await new Promise(function (resolve) { window.setTimeout(resolve, 300); });
      slots = ctx.slots || ctx.get('slots');
    }
    if (slots === undefined) {
      console.warn('[dsh-search] slots 服务未就绪，设置页未注册');
      return;
    }

    const PREFIX = '/_dsh/dsh-search';
    const STYLE_ID = 'dsh-search-settings-style';
    const SETTINGS_CSS = [
      '.dshExaSettings{max-width:720px;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:12px}',
      '.dshExaTitle{color:var(--dsw-alias-label-primary);margin:0;font-size:16px;font-weight:500;line-height:24px}',
      '.dshExaIntro{color:var(--dsw-alias-label-tertiary);margin:0;font-size:14px;line-height:22px}',
      '.dshExaStatus{border:1px solid var(--dsw-alias-border-l2);border-radius:12px;display:flex;align-items:center;gap:10px;padding:12px 14px}',
      '.dshExaStatusDot{box-sizing:border-box;border-radius:50%;flex:none;width:8px;height:8px;background:var(--dsw-alias-state-warn-primary)}',
      '.dshExaStatusDotReady{background:var(--dsw-alias-state-success-primary)}',
      '.dshExaStatusText{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:500;line-height:22px}',
      '.dshExaStatusDetail{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}',
      '.dshExaEditor{background:var(--dsw-alias-bg-module-platform);border-radius:12px;display:flex;flex-direction:column;gap:14px;padding:14px 16px}',
      '.dshExaField{display:flex;flex-direction:column;gap:6px}',
      '.dshExaFieldLabel{color:var(--dsw-alias-label-secondary);display:inline-flex;align-items:center;font-size:12px;font-weight:500;line-height:18px}',
      '.dshExaInput{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);width:100%;height:32px;font:inherit;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;padding:0 10px;font-size:14px;line-height:22px}',
      '.dshExaInput:focus{border-color:var(--dsw-alias-brand-primary);outline:none}',
      '.dshExaInput::placeholder{color:var(--dsw-alias-label-dimmed)}',
      '.dshExaSelect{cursor:pointer;max-width:300px;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\' fill=\'none\'%3E%3Cpath d=\'M3 4.5L6 7.5L9 4.5\' stroke=\'%2381858C\' stroke-width=\'1.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E");background-position:right 12px center;background-repeat:no-repeat;background-size:12px 12px;padding-right:32px}',
      '.dshExaKeyRow{display:flex;align-items:center;gap:8px;max-width:480px}',
      '.dshExaKeyRow .dshExaInput{min-width:0}',
      '.dshExaPrimaryButton,.dshExaSecondaryButton,.dshExaRevealButton{box-sizing:border-box;height:36px;font:inherit;cursor:pointer;border:none;border-radius:18px;display:inline-flex;align-items:center;justify-content:center;padding:0 14px;font-size:14px;line-height:22px}',
      '.dshExaPrimaryButton{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}',
      '.dshExaPrimaryButton:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}',
      '.dshExaSecondaryButton{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);background:transparent}',
      '.dshExaSecondaryButton:hover:not(:disabled),.dshExaRevealButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
      '.dshExaRevealButton{height:28px;flex:none;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);background:transparent;padding:0 10px;font-size:12px;line-height:18px}',
      '.dshExaPrimaryButton:disabled,.dshExaSecondaryButton:disabled,.dshExaRevealButton:disabled{opacity:.4;cursor:default}',
      '.dshExaPrimaryButton:focus-visible,.dshExaSecondaryButton:focus-visible,.dshExaRevealButton:focus-visible{box-shadow:0 0 0 2px var(--dsw-alias-border-l3);outline:none}',
      '.dshExaHint{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:18px}',
      '.dshExaHint a{color:inherit;text-decoration:underline;text-underline-offset:2px}',
      '.dshExaError{color:var(--dsw-alias-state-error-primary);margin:0;font-size:12px;line-height:18px}',
      '.dshExaSaved{color:var(--dsw-alias-state-success-primary);margin:0;font-size:12px;line-height:18px}',
      '.dshExaChanged{color:var(--dsw-alias-state-warn-primary);margin:0;font-size:12px;line-height:18px}',
      '.dshExaActions{display:flex;align-items:center;justify-content:flex-end;gap:8px}',
      '@media (max-width:560px){.dshExaKeyRow{max-width:none}.dshExaActions{justify-content:flex-start;flex-wrap:wrap}.dshExaSelect{max-width:none}}',
    ].join('');

    // 静态客户端包与 DSH 原生包一样，以包名作用域的 style 标签管理局部样式。
    function installStyles() {
      var tag = document.querySelector('style[data-dsh-search-style="' + STYLE_ID + '"]');
      if (!tag) {
        tag = document.createElement('style');
        tag.dataset.dshExaSearchStyle = STYLE_ID;
        document.head.appendChild(tag);
      }
      tag.textContent = SETTINGS_CSS;
      return function () { if (tag.textContent === SETTINGS_CSS) tag.remove(); };
    }

    function rpc(method, args) {
      const url = PREFIX + '/' + method;
      const controller = new AbortController();
      const timeout = window.setTimeout(function () { controller.abort(); }, 15000);
      return fetch(url, {
        method: args ? 'POST' : 'GET',
        headers: { 'content-type': 'application/json' },
        body: args ? JSON.stringify(args) : undefined,
        signal: controller.signal,
      }).then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (body) {
          if (!response.ok) throw new Error(body.error || ('HTTP ' + response.status));
          return body;
        });
      }).finally(function () { window.clearTimeout(timeout); });
    }

    var React = require('react');
    function h(tag, props) {
      var args = [tag, props];
      for (var i = 2; i < arguments.length; i++) args.push(arguments[i]);
      return React.createElement.apply(React, args);
    }

    function SearchServicePage() {
      var _status = React.useState(null), status = _status[0], setStatus = _status[1];
      var _provider = React.useState('exa'), provider = _provider[0], setProvider = _provider[1];
      var _apiKey = React.useState(''), apiKey = _apiKey[0], setApiKey = _apiKey[1];
      var _isKeyVisible = React.useState(false), isKeyVisible = _isKeyVisible[0], setIsKeyVisible = _isKeyVisible[1];
      var _isSaving = React.useState(false), isSaving = _isSaving[0], setIsSaving = _isSaving[1];
      var _fieldError = React.useState(''), fieldError = _fieldError[0], setFieldError = _fieldError[1];
      var _notice = React.useState(null), notice = _notice[0], setNotice = _notice[1];

      var load = React.useCallback(function () {
        return rpc('getSearchConfig').then(function (next) {
          setStatus(next);
          if (next.ok && next.provider) setProvider(next.provider);
          setApiKey('');
          setFieldError('');
        }).catch(function () {
          setStatus({ ok: false, provider: 'exa', providerLabel: 'Exa', exaKeySet: false });
          setNotice({ kind: 'error', text: '无法读取搜索配置。请刷新页面后重试。' });
        });
      }, []);

      React.useEffect(function () { load(); }, [load]);

      var savedProvider = status && status.provider ? status.provider : 'exa';
      var hasChanges = provider !== savedProvider || apiKey.trim().length > 0;
      var isExaSelected = provider === 'exa';
      var isExaReady = status && status.ok && status.provider === 'exa' && status.exaKeySet;
      var statusTitle = isExaReady ? 'Exa 已准备好' : (savedProvider === 'deepseek-official' ? '已选择 DeepSeek' : '需要 Exa API 钥匙');
      var statusDetail = isExaReady ? '搜索请求会使用 Exa。' : (savedProvider === 'deepseek-official' ? 'DeepSeek 的连接由 DSH 原有设置管理。' : '填写钥匙后即可开始搜索。');

      function handleProviderChange(event) {
        setProvider(event.target.value);
        setFieldError('');
        setNotice(null);
      }

      function handleKeyChange(event) {
        setApiKey(event.target.value);
        setFieldError('');
        setNotice(null);
      }

      function handleCancel() {
        setProvider(savedProvider);
        setApiKey('');
        setIsKeyVisible(false);
        setFieldError('');
        setNotice(null);
      }

      function handleSubmit(event) {
        event.preventDefault();
        if (!hasChanges || isSaving) return;
        var trimmedKey = apiKey.trim();
        if (isExaSelected && trimmedKey.length === 0 && !(status && status.exaKeySet)) {
          setFieldError('填写 Exa API 钥匙后才能使用 Exa 搜索。');
          return;
        }
        if (isExaSelected && apiKey.length > 0 && trimmedKey.length < 8) {
          setFieldError('检查钥匙是否完整，然后再保存。');
          return;
        }
        setIsSaving(true);
        setFieldError('');
        setNotice(null);
        var body = { provider: provider };
        if (isExaSelected && trimmedKey.length > 0) body.apiKey = trimmedKey;
        rpc('setSearchConfig', body).then(function (result) {
          if (!result.ok) {
            setNotice({ kind: 'error', text: '保存失败：' + (result.error || '请稍后重试。') });
            return;
          }
          setIsKeyVisible(false);
          setNotice({ kind: 'saved', text: provider === 'exa' ? '已保存。Exa 搜索现在可用。' : '已保存。已切换到 DeepSeek 搜索。' });
          return load();
        }).catch(function (error) {
          setNotice({ kind: 'error', text: '保存失败：' + error.message });
        }).finally(function () { setIsSaving(false); });
      }

      if (!status) {
        return h('section', { className: 'dshExaSettings', 'aria-busy': 'true' },
          h('h2', { className: 'dshExaTitle' }, '搜索服务'),
          h('p', { className: 'dshExaIntro' }, '正在载入搜索设置…')
        );
      }

      return h('section', { className: 'dshExaSettings' },
        h('h2', { className: 'dshExaTitle' }, '搜索服务'),
        h('p', { className: 'dshExaIntro' }, '选择 DSH 联网搜索使用的服务。更改会在保存后立即生效。'),
        h('div', { className: 'dshExaStatus', role: 'status', 'aria-live': 'polite' },
          h('span', { className: 'dshExaStatusDot' + (isExaReady ? ' dshExaStatusDotReady' : ''), 'aria-hidden': 'true' }),
          h('div', null,
            h('div', { className: 'dshExaStatusText' }, statusTitle),
            h('div', { className: 'dshExaStatusDetail' }, statusDetail + (isExaReady && status.exaKeyMasked ? ' 钥匙：' + status.exaKeyMasked + '。' : ''))
          )
        ),
        h('form', { className: 'dshExaEditor', onSubmit: handleSubmit },
          h('div', { className: 'dshExaField' },
            h('label', { className: 'dshExaFieldLabel', htmlFor: 'dsh-exa-provider' }, '搜索服务'),
            h('select', { id: 'dsh-exa-provider', className: 'dshExaInput dshExaSelect', value: provider, onChange: handleProviderChange, disabled: isSaving },
              h('option', { value: 'exa' }, 'Exa — 网页搜索'),
              h('option', { value: 'deepseek-official' }, 'DeepSeek — 官方搜索')
            ),
            h('p', { className: 'dshExaHint' }, 'Exa 适合新闻、技术资料和中文网页；DeepSeek 使用 DSH 已有的官方搜索设置。')
          ),
          isExaSelected ? h('div', { className: 'dshExaField' },
            h('label', { className: 'dshExaFieldLabel', htmlFor: 'dsh-exa-api-key' }, 'Exa API 钥匙'),
            h('div', { className: 'dshExaKeyRow' },
              h('input', {
                id: 'dsh-exa-api-key',
                className: 'dshExaInput',
                type: isKeyVisible ? 'text' : 'password',
                value: apiKey,
                placeholder: status.exaKeySet ? '已配置；留空则不修改' : '粘贴 Exa API 钥匙',
                onChange: handleKeyChange,
                disabled: isSaving,
                autoComplete: 'off',
                spellCheck: false,
                'aria-describedby': fieldError ? 'dsh-exa-key-error' : 'dsh-exa-key-hint',
              }),
              h('button', { type: 'button', className: 'dshExaRevealButton', onClick: function () { setIsKeyVisible(!isKeyVisible); }, disabled: isSaving, 'aria-pressed': isKeyVisible }, isKeyVisible ? '隐藏' : '显示')
            ),
            fieldError ? h('p', { id: 'dsh-exa-key-error', className: 'dshExaError', role: 'alert' }, fieldError) : null,
            h('p', { id: 'dsh-exa-key-hint', className: 'dshExaHint' },
              '在 ', h('a', { href: 'https://dashboard.exa.ai/api-keys', target: '_blank', rel: 'noreferrer' }, 'Exa Dashboard 创建 API 钥匙'), '。钥匙只保存在本机，并只发送到 Exa 官方接口。'
            )
          ) : h('p', { className: 'dshExaHint' }, 'DeepSeek 的钥匙不在这里管理；切换后会使用 DSH 已配置的 DeepSeek 搜索。'),
          hasChanges ? h('p', { className: 'dshExaChanged', role: 'status' }, '有未保存的更改。') : null,
          notice ? h('p', { className: notice.kind === 'saved' ? 'dshExaSaved' : 'dshExaError', role: notice.kind === 'error' ? 'alert' : 'status' }, notice.text) : null,
          h('div', { className: 'dshExaActions' },
            hasChanges ? h('button', { type: 'button', className: 'dshExaSecondaryButton', onClick: handleCancel, disabled: isSaving }, '取消更改') : null,
            h('button', { type: 'submit', className: 'dshExaPrimaryButton', disabled: !hasChanges || isSaving }, isSaving ? '保存中…' : '保存')
          )
        )
      );
    }

    var removeStyles = installStyles();
    var dispose = ctx.slots.inject('settings.section', function () {
      return ctx.slots.register(
        { name: 'settings.section', id: 'search-service', order: 13, label: function () { return '搜索服务'; }, children: {} },
        SearchServicePage
      );
    });
    return function () {
      if (dispose) dispose();
      if (removeStyles) removeStyles();
    };
  }
};

return module.exports;
} });
