// dsh-song-search — client half：设置侧边栏「搜索服务」页
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
      console.warn('[dsh-song-search] slots 服务未就绪，设置页未注册');
      return;
    }

    const PREFIX = '/_dsh/dsh-song-search';
    const STYLE_ID = 'dsh-song-search-settings-style';
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
      '.dshExaGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
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
      '@media (max-width:560px){.dshExaGrid{grid-template-columns:1fr}.dshExaKeyRow{max-width:none}.dshExaActions{justify-content:flex-start;flex-wrap:wrap}.dshExaSelect{max-width:none}}',
    ].join('');

    function installStyles() {
      var tag = document.querySelector('style[data-dsh-song-search-style="' + STYLE_ID + '"]');
      if (!tag) {
        tag = document.createElement('style');
        tag.setAttribute('data-dsh-song-search-style', STYLE_ID);
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

    var PROVIDER_INFO = {
      perplexity: { label: 'Perplexity Search', keyLabel: 'Perplexity API 钥匙', dashboard: 'https://www.perplexity.ai/settings/api', defaultBaseURL: 'https://api.perplexity.ai', placeholder: '粘贴 Perplexity API 钥匙', kind: 'AI 搜索' },
      you: { label: 'You.com Search', keyLabel: 'You.com API 钥匙', dashboard: 'https://you.com/platform', defaultBaseURL: 'https://ydc-index.io', placeholder: '粘贴 YDC API 钥匙', kind: 'AI 搜索' },
      exa: { label: 'Exa', keyLabel: 'Exa API 钥匙', dashboard: 'https://dashboard.exa.ai/api-keys', defaultBaseURL: 'https://api.exa.ai', placeholder: '粘贴 Exa API 钥匙', kind: '网页搜索' },
      brave: { label: 'Brave Search', keyLabel: 'Brave Search API 钥匙', dashboard: 'https://api-dashboard.search.brave.com/app/keys', defaultBaseURL: 'https://api.search.brave.com/res/v1', placeholder: '粘贴 Brave Search API 钥匙', kind: '网页搜索' },
      tavily: { label: 'Tavily', keyLabel: 'Tavily API 钥匙', dashboard: 'https://app.tavily.com/home', defaultBaseURL: 'https://api.tavily.com', placeholder: '粘贴 Tavily API 钥匙', kind: 'AI 搜索' },
      serper: { label: 'Serper（Google）', keyLabel: 'Serper API 钥匙', dashboard: 'https://serper.dev/api-key', defaultBaseURL: 'https://google.serper.dev', placeholder: '粘贴 Serper API 钥匙', kind: '网页搜索' },
      'deepseek-official': { label: 'DeepSeek', keyLabel: '', dashboard: '', defaultBaseURL: '', placeholder: '', kind: '官方搜索' },
    };
    var PROVIDER_ORDER = ['perplexity', 'you', 'tavily', 'exa', 'brave', 'serper', 'deepseek-official'];
    var SETTING_KEYS = ['baseURL', 'maxResults', 'country', 'language', 'freshness', 'includeDomains', 'excludeDomains', 'searchDepth', 'extractionMode', 'safeSearch', 'searchType', 'searchContextSize'];
    function providerInfo(id) { return PROVIDER_INFO[id] || PROVIDER_INFO['deepseek-official']; }
    function settingMap(status) { return status && status.settingsByProvider && typeof status.settingsByProvider === 'object' ? status.settingsByProvider : {}; }
    function keyStatus(status, id) {
      if (status && status.apiKeysByProvider && status.apiKeysByProvider[id]) return status.apiKeysByProvider[id];
      return { set: Boolean(status && status.provider === id && status.apiKeySet), masked: status && status.provider === id ? status.apiKeyMasked : '' };
    }
    function settingValue(settings, key) { return settings && settings[key] !== undefined && settings[key] !== null ? settings[key] : ''; }
    function domainText(value) { return Array.isArray(value) ? value.join(', ') : String(value || ''); }
    function settingsEqual(a, b) {
      var left = a || {}, right = b || {};
      return SETTING_KEYS.every(function (key) {
        var l = left[key], r = right[key];
        if (Array.isArray(l) || Array.isArray(r)) return domainText(l).trim() === domainText(r).trim();
        return String(l === undefined || l === null ? '' : l) === String(r === undefined || r === null ? '' : r);
      });
    }

    function SearchServicePage() {
      var _status = React.useState(null), status = _status[0], setStatus = _status[1];
      var _provider = React.useState('deepseek-official'), provider = _provider[0], setProvider = _provider[1];
      var _apiKey = React.useState(''), apiKey = _apiKey[0], setApiKey = _apiKey[1];
      var _draftSettings = React.useState({}), draftSettingsByProvider = _draftSettings[0], setDraftSettingsByProvider = _draftSettings[1];
      var _isKeyVisible = React.useState(false), isKeyVisible = _isKeyVisible[0], setIsKeyVisible = _isKeyVisible[1];
      var _isSaving = React.useState(false), isSaving = _isSaving[0], setIsSaving = _isSaving[1];
      var _fieldError = React.useState(''), fieldError = _fieldError[0], setFieldError = _fieldError[1];
      var _notice = React.useState(null), notice = _notice[0], setNotice = _notice[1];

      var load = React.useCallback(function () {
        return rpc('getSearchConfig').then(function (next) {
          setStatus(next);
          if (next.ok && next.provider) setProvider(next.provider);
          setDraftSettingsByProvider(next.settingsByProvider || {});
          setApiKey('');
          setFieldError('');
        }).catch(function () {
          setStatus({ ok: false, provider: 'deepseek-official', providerLabel: 'DeepSeek', apiKeySet: false, settingsByProvider: {}, apiKeysByProvider: {} });
          setDraftSettingsByProvider({});
          setNotice({ kind: 'error', text: '无法读取搜索配置。请刷新页面后重试。' });
        });
      }, []);

      React.useEffect(function () { load(); }, [load]);

      var savedProvider = status && status.provider ? status.provider : 'deepseek-official';
      var savedSettingsByProvider = settingMap(status);
      var selectedSettings = draftSettingsByProvider[provider] || savedSettingsByProvider[provider] || {};
      var savedSettings = savedSettingsByProvider[provider] || {};
      var selectedKeyStatus = keyStatus(status, provider);
      var hasSettingsChanges = !settingsEqual(selectedSettings, savedSettings);
      var hasChanges = provider !== savedProvider || apiKey.trim().length > 0 || hasSettingsChanges;
      var isThirdPartySelected = provider !== 'deepseek-official';
      var selectedInfo = providerInfo(provider);
      var savedInfo = providerInfo(savedProvider);
      var savedKeyStatus = keyStatus(status, savedProvider);
      var isProviderReady = status && status.ok && (savedProvider === 'deepseek-official' || Boolean(savedKeyStatus.set));
      var statusTitle = isProviderReady ? savedInfo.label + ' 已准备好' : (savedProvider === 'deepseek-official' ? '已选择 DeepSeek' : '需要 ' + savedInfo.label + ' API 钥匙');
      var statusDetail = isProviderReady ? '搜索请求会使用 ' + savedInfo.label + '。' : (savedProvider === 'deepseek-official' ? 'DeepSeek 的连接由 DSH 原有设置管理。' : '填写钥匙后即可开始搜索。');

      function updateSetting(key, value) {
        var next = { ...(draftSettingsByProvider[provider] || savedSettings || {}) };
        next[key] = value;
        setDraftSettingsByProvider({ ...draftSettingsByProvider, [provider]: next });
        setFieldError('');
        setNotice(null);
      }

      function handleProviderChange(event) {
        setProvider(event.target.value);
        setApiKey('');
        setIsKeyVisible(false);
        setFieldError('');
        setNotice(null);
      }

      function handleCancel() {
        setProvider(savedProvider);
        setApiKey('');
        setDraftSettingsByProvider(savedSettingsByProvider);
        setIsKeyVisible(false);
        setFieldError('');
        setNotice(null);
      }

      function validateSettings() {
        var settings = selectedSettings;
        if (settings.maxResults !== '' && settings.maxResults !== undefined && (!/^\d+$/.test(String(settings.maxResults)) || Number(settings.maxResults) < 1 || Number(settings.maxResults) > 20)) return '结果数量必须是 1 到 20 的整数。';
        if (settings.country && !/^[A-Za-z]{2}$/.test(String(settings.country).trim())) return '国家/地区必须是两位 ISO 代码，例如 US 或 CN。';
        if (settings.language && !/^[A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8})*$/.test(String(settings.language).trim())) return '语言必须使用语言代码，例如 zh-CN 或 en。';
        if (provider === 'you' && domainText(settings.includeDomains).trim() && domainText(settings.excludeDomains).trim()) return 'You.com 不能同时使用包含域名和排除域名。';
        return '';
      }

      function handleSubmit(event) {
        event.preventDefault();
        if (!hasChanges || isSaving) return;
        var trimmedKey = apiKey.trim();
        if (isThirdPartySelected && trimmedKey.length === 0 && !selectedKeyStatus.set) {
          setFieldError('填写 ' + selectedInfo.label + ' API 钥匙后才能使用该搜索服务。');
          return;
        }
        if (isThirdPartySelected && apiKey.length > 0 && trimmedKey.length < 8) {
          setFieldError('检查钥匙是否完整，然后再保存。');
          return;
        }
        var settingsError = isThirdPartySelected ? validateSettings() : '';
        if (settingsError) {
          setFieldError(settingsError);
          return;
        }
        setIsSaving(true);
        setFieldError('');
        setNotice(null);
        var body = { provider: provider };
        if (isThirdPartySelected) {
          body.settings = selectedSettings;
          if (trimmedKey.length > 0) body.apiKey = trimmedKey;
        }
        rpc('setSearchConfig', body).then(function (result) {
          if (!result.ok) {
            setNotice({ kind: 'error', text: '保存失败：' + (result.error || '请稍后重试。') });
            return;
          }
          setIsKeyVisible(false);
          setNotice({ kind: 'saved', text: provider === 'deepseek-official' ? '已保存。已切换到 DeepSeek 搜索。' : '已保存。' + selectedInfo.label + ' 搜索现在可用。' });
          return load();
        }).catch(function (error) {
          setNotice({ kind: 'error', text: '保存失败：' + error.message });
        }).finally(function () { setIsSaving(false); });
      }

      function renderFreshness() {
        var options = [['', '不限'], ['day', '过去 24 小时'], ['week', '过去 7 天'], ['month', '过去 30 天'], ['year', '过去 365 天']];
        if (provider === 'perplexity') options.splice(1, 0, ['hour', '过去 1 小时']);
        return h('div', { className: 'dshExaField' },
          h('label', { className: 'dshExaFieldLabel', htmlFor: 'dsh-search-freshness' }, '结果新鲜度'),
          h('select', { id: 'dsh-search-freshness', className: 'dshExaInput dshExaSelect', value: settingValue(selectedSettings, 'freshness'), onChange: function (event) { updateSetting('freshness', event.target.value); }, disabled: isSaving }, options.map(function (item) { return h('option', { key: item[0], value: item[0] }, item[1]); }))
        );
      }

      function renderSettingsFields() {
        if (!isThirdPartySelected) return null;
        var includeDomains = domainText(settingValue(selectedSettings, 'includeDomains'));
        var excludeDomains = domainText(settingValue(selectedSettings, 'excludeDomains'));
        return h('div', { className: 'dshExaEditor' },
          h('div', { className: 'dshExaField' },
            h('label', { className: 'dshExaFieldLabel', htmlFor: 'dsh-search-base-url' }, 'API 基址（可自定义）'),
            h('input', { id: 'dsh-search-base-url', className: 'dshExaInput', type: 'url', value: settingValue(selectedSettings, 'baseURL'), placeholder: selectedInfo.defaultBaseURL, onChange: function (event) { updateSetting('baseURL', event.target.value); }, disabled: isSaving, autoComplete: 'off', spellCheck: false }),
            h('p', { className: 'dshExaHint' }, '默认使用官方地址；支持 HTTPS 代理或本机 localhost/127.0.0.1 HTTP 代理，不支持任意远程 HTTP。')
          ),
          h('div', { className: 'dshExaGrid' },
            h('div', { className: 'dshExaField' },
              h('label', { className: 'dshExaFieldLabel', htmlFor: 'dsh-search-max-results' }, '默认结果数量'),
              h('input', { id: 'dsh-search-max-results', className: 'dshExaInput', type: 'number', min: '1', max: '20', value: settingValue(selectedSettings, 'maxResults'), onChange: function (event) { updateSetting('maxResults', event.target.value); }, disabled: isSaving, inputMode: 'numeric' })
            ),
            h('div', { className: 'dshExaField' },
              h('label', { className: 'dshExaFieldLabel', htmlFor: 'dsh-search-country' }, '国家/地区'),
              h('input', { id: 'dsh-search-country', className: 'dshExaInput', type: 'text', value: settingValue(selectedSettings, 'country'), placeholder: '例如 US、CN', onChange: function (event) { updateSetting('country', event.target.value); }, disabled: isSaving, autoComplete: 'off', spellCheck: false })
            ),
            h('div', { className: 'dshExaField' },
              h('label', { className: 'dshExaFieldLabel', htmlFor: 'dsh-search-language' }, '语言'),
              h('input', { id: 'dsh-search-language', className: 'dshExaInput', type: 'text', value: settingValue(selectedSettings, 'language'), placeholder: '例如 zh-CN、en', onChange: function (event) { updateSetting('language', event.target.value); }, disabled: isSaving, autoComplete: 'off', spellCheck: false })
            ),
            renderFreshness()
          ),
          (provider === 'exa' || provider === 'perplexity' || provider === 'you' || provider === 'tavily') ? h('div', { className: 'dshExaGrid' },
            h('div', { className: 'dshExaField' },
              h('label', { className: 'dshExaFieldLabel', htmlFor: 'dsh-search-include-domains' }, '只搜索这些域名（可选）'),
              h('input', { id: 'dsh-search-include-domains', className: 'dshExaInput', type: 'text', value: includeDomains, placeholder: '例如 wikipedia.org, arxiv.org', onChange: function (event) { updateSetting('includeDomains', event.target.value); }, disabled: isSaving, autoComplete: 'off', spellCheck: false })
            ),
            h('div', { className: 'dshExaField' },
              h('label', { className: 'dshExaFieldLabel', htmlFor: 'dsh-search-exclude-domains' }, '排除这些域名（可选）'),
              h('input', { id: 'dsh-search-exclude-domains', className: 'dshExaInput', type: 'text', value: excludeDomains, placeholder: '例如 example.com', onChange: function (event) { updateSetting('excludeDomains', event.target.value); }, disabled: isSaving, autoComplete: 'off', spellCheck: false })
            )
          ) : null,
          provider === 'tavily' ? h('div', { className: 'dshExaField' },
            h('label', { className: 'dshExaFieldLabel', htmlFor: 'dsh-search-depth' }, 'Tavily 搜索深度'),
            h('select', { id: 'dsh-search-depth', className: 'dshExaInput dshExaSelect', value: settingValue(selectedSettings, 'searchDepth') || 'basic', onChange: function (event) { updateSetting('searchDepth', event.target.value); }, disabled: isSaving },
              h('option', { value: 'basic' }, 'Basic — 速度优先'), h('option', { value: 'fast' }, 'Fast — 更快'), h('option', { value: 'advanced' }, 'Advanced — 深度优先'), h('option', { value: 'ultra-fast' }, 'Ultra-fast — 最快')
            )
          ) : null,
          provider === 'you' ? h('div', { className: 'dshExaGrid' },
            h('div', { className: 'dshExaField' },
              h('label', { className: 'dshExaFieldLabel', htmlFor: 'dsh-search-extraction' }, 'You.com 内容提取'),
              h('select', { id: 'dsh-search-extraction', className: 'dshExaInput dshExaSelect', value: settingValue(selectedSettings, 'extractionMode'), onChange: function (event) { updateSetting('extractionMode', event.target.value); }, disabled: isSaving },
                h('option', { value: '' }, '只返回搜索摘要'), h('option', { value: 'highlights' }, 'Highlights — 查询相关段落'), h('option', { value: 'full_page' }, 'Full page — 完整页面（可能产生额外费用）')
              )
            ),
            h('div', { className: 'dshExaField' },
              h('label', { className: 'dshExaFieldLabel', htmlFor: 'dsh-search-safesearch' }, '安全搜索'),
              h('select', { id: 'dsh-search-safesearch', className: 'dshExaInput dshExaSelect', value: settingValue(selectedSettings, 'safeSearch') || 'moderate', onChange: function (event) { updateSetting('safeSearch', event.target.value); }, disabled: isSaving },
                h('option', { value: 'moderate' }, 'Moderate — 默认'), h('option', { value: 'strict' }, 'Strict — 严格'), h('option', { value: 'off' }, 'Off — 关闭')
              )
            )
          ) : null,
          provider === 'exa' ? h('div', { className: 'dshExaField' },
            h('label', { className: 'dshExaFieldLabel', htmlFor: 'dsh-search-type' }, 'Exa 搜索类型'),
            h('select', { id: 'dsh-search-type', className: 'dshExaInput dshExaSelect', value: settingValue(selectedSettings, 'searchType') || 'auto', onChange: function (event) { updateSetting('searchType', event.target.value); }, disabled: isSaving },
              h('option', { value: 'auto' }, 'Auto — 自动'), h('option', { value: 'neural' }, 'Neural — 语义'), h('option', { value: 'keyword' }, 'Keyword — 关键词'), h('option', { value: 'fast' }, 'Fast — 快速')
            )
          ) : null,
          provider === 'perplexity' ? h('div', { className: 'dshExaGrid' },
            h('div', { className: 'dshExaField' },
              h('label', { className: 'dshExaFieldLabel', htmlFor: 'dsh-search-perplexity-type' }, 'Perplexity 搜索类型'),
              h('select', { id: 'dsh-search-perplexity-type', className: 'dshExaInput dshExaSelect', value: settingValue(selectedSettings, 'searchType') || 'web', onChange: function (event) { updateSetting('searchType', event.target.value); }, disabled: isSaving },
                h('option', { value: 'web' }, 'Web — 普通网页'), h('option', { value: 'people' }, 'People — 人物搜索')
              )
            ),
            h('div', { className: 'dshExaField' },
              h('label', { className: 'dshExaFieldLabel', htmlFor: 'dsh-search-context-size' }, 'Perplexity 内容范围'),
              h('select', { id: 'dsh-search-context-size', className: 'dshExaInput dshExaSelect', value: settingValue(selectedSettings, 'searchContextSize') || 'high', onChange: function (event) { updateSetting('searchContextSize', event.target.value); }, disabled: isSaving },
                h('option', { value: 'low' }, 'Low — 低延迟'), h('option', { value: 'medium' }, 'Medium — 平衡'), h('option', { value: 'high' }, 'High — 信息更多')
              )
            )
          ) : null,
          h('p', { className: 'dshExaHint' }, '自定义设置只保存到本机 profile；API 钥匙不会返回完整值，也不会出现在日志中。')
        );
      }

      if (!status) {
        return h('section', { className: 'dshExaSettings', 'aria-busy': 'true' },
          h('h2', { className: 'dshExaTitle' }, '搜索服务'),
          h('p', { className: 'dshExaIntro' }, '正在载入搜索设置…')
        );
      }

      return h('section', { className: 'dshExaSettings' },
        h('h2', { className: 'dshExaTitle' }, '搜索服务'),
        h('p', { className: 'dshExaIntro' }, '选择 DSH 联网搜索使用的服务，并按需调整端点、地区、语言与结果策略。保存后立即生效。'),
        h('div', { className: 'dshExaStatus', role: 'status', 'aria-live': 'polite' },
          h('span', { className: 'dshExaStatusDot' + (isProviderReady ? ' dshExaStatusDotReady' : ''), 'aria-hidden': 'true' }),
          h('div', null,
            h('div', { className: 'dshExaStatusText' }, statusTitle),
            h('div', { className: 'dshExaStatusDetail' }, statusDetail + (isProviderReady && savedKeyStatus.masked ? ' 钥匙：' + savedKeyStatus.masked + '。' : ''))
          )
        ),
        h('form', { className: 'dshExaEditor', onSubmit: handleSubmit },
          h('div', { className: 'dshExaField' },
            h('label', { className: 'dshExaFieldLabel', htmlFor: 'dsh-search-provider' }, '搜索服务'),
            h('select', { id: 'dsh-search-provider', className: 'dshExaInput dshExaSelect', value: provider, onChange: handleProviderChange, disabled: isSaving },
              PROVIDER_ORDER.map(function (id) { return h('option', { key: id, value: id }, providerInfo(id).label + ' — ' + providerInfo(id).kind); })
            ),
            h('p', { className: 'dshExaHint' }, 'Perplexity Search、You.com Search 和 Tavily 面向 AI/RAG；Exa、Brave Search、Serper 直接提供网页结果；DeepSeek 使用 DSH 原有官方搜索。')
          ),
          isThirdPartySelected ? h('div', { className: 'dshExaField' },
            h('label', { className: 'dshExaFieldLabel', htmlFor: 'dsh-search-api-key' }, selectedInfo.keyLabel),
            h('div', { className: 'dshExaKeyRow' },
              h('input', {
                id: 'dsh-search-api-key',
                className: 'dshExaInput',
                type: isKeyVisible ? 'text' : 'password',
                value: apiKey,
                placeholder: selectedKeyStatus.set ? '已配置；留空则不修改' : selectedInfo.placeholder,
                onChange: function (event) { setApiKey(event.target.value); setFieldError(''); setNotice(null); },
                disabled: isSaving,
                autoComplete: 'off',
                spellCheck: false,
                'aria-describedby': fieldError ? 'dsh-exa-key-error' : 'dsh-exa-key-hint',
              }),
              h('button', { type: 'button', className: 'dshExaRevealButton', onClick: function () { setIsKeyVisible(!isKeyVisible); }, disabled: isSaving, 'aria-pressed': isKeyVisible }, isKeyVisible ? '隐藏' : '显示')
            ),
            h('p', { id: 'dsh-search-key-hint', className: 'dshExaHint' },
              '在 ', h('a', { href: selectedInfo.dashboard, target: '_blank', rel: 'noreferrer' }, selectedInfo.label + ' 控制台创建 API 钥匙'), '。钥匙只保存在本机，并只发送到所选服务商接口。'
            )
          ) : h('p', { className: 'dshExaHint' }, 'DeepSeek 的钥匙不在这里管理；切换后会使用 DSH 已配置的 DeepSeek 搜索。'),
          renderSettingsFields(),
          fieldError ? h('p', { id: 'dsh-exa-key-error', className: 'dshExaError', role: 'alert' }, fieldError) : null,
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
