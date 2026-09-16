# dsh-song-search

[**English**](README.md) | [**中文**](README.zh-CN.md)

[![许可证](https://img.shields.io/github/license/SONGOAO25/dsh-song-search)](https://github.com/SONGOAO25/dsh-song-search/blob/main/LICENSE)
[![Release](https://img.shields.io/github/v/release/SONGOAO25/dsh-song-search)](https://github.com/SONGOAO25/dsh-song-search/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/SONGOAO25/dsh-song-search/ci.yml)](https://github.com/SONGOAO25/dsh-song-search/actions)

`dsh-song-search` 是 DeepSeek Harness（DSH）的联网搜索插件：接入多个常用第三方网页/AI 搜索服务，并提供原生风格的「搜索服务」设置页。

## 功能

- 在 DSH 联网搜索中使用 Perplexity Search、You.com Search、Tavily、Exa、Brave Search 或 Serper。
- 在设置页手动选择第三方服务或 DeepSeek。
- 各服务商独立保存 API 钥匙；输入框支持显示/隐藏、取消更改、保存、校验和键盘操作。
- 每个服务可自定义 API 基址、结果数量、国家/地区、语言、新鲜度、域名筛选及服务商特有搜索模式；支持 HTTPS 代理和本机 HTTP 代理。
- 使用 DSH 自带的语义主题颜色，自动适配浅色、深色和高对比度模式。
- 钥匙在主进程处理，不完整返回、不写入日志。

## 安装

```bash
git clone https://github.com/SONGOAO25/dsh-song-search.git
cd dsh-song-search
npm run build
dsh plugin --profile web add .
```

安装后重启 `dsh web`；如果浏览器页面没有立即变化，再刷新一次页面。

## 使用

1. 打开 DSH 的「设置」。
2. 打开「搜索服务」。
3. 选择「Perplexity Search」「You.com Search」「Tavily」「Exa」「Brave Search」或「Serper」。
4. 粘贴对应 API 钥匙，点击「保存」。
5. 按需调整 API 基址、结果数、地区/语言、新鲜度、域名和服务商特有选项。
6. 在对话中提出需要联网的问题。

需要切回 DeepSeek 时，选择「DeepSeek — 官方搜索」并保存，马上生效。

API 钥匙可以在对应服务商的官方控制台创建：

- [Perplexity API](https://www.perplexity.ai/settings/api)
- [You.com Platform](https://you.com/platform)
- [Tavily](https://app.tavily.com/home)
- [Exa](https://dashboard.exa.ai/api-keys)
- [Brave Search](https://api-dashboard.search.brave.com/app/keys)
- [Serper](https://serper.dev/api-key)

Perplexity 和 You.com 这里接入的是结构化搜索 API，会返回来源 URL 和摘要供 DSH 使用，不是各自的回答/聊天接口。

高级设置也可以写在插件 profile 的 `cordis.patch.yml`：

```yaml
- id: dsh-song-search
  config:
    apiKeys:
      perplexity: "YOUR_KEY"
      you: "YOUR_KEY"
    providerSettings:
      perplexity:
        baseURL: "https://api.perplexity.ai"
        maxResults: 5
        country: "US"
        language: "en"
        freshness: "week"
        includeDomains: ["example.com"]
        searchType: "web"
        searchContextSize: "high"
      you:
        baseURL: "https://ydc-index.io"
        maxResults: 5
        country: "US"
        language: "en-US"
        freshness: "month"
        extractionMode: "highlights"
        safeSearch: "moderate"
```

也可以使用环境变量：`PERPLEXITY_API_KEY`、`YDC_API_KEY`、`TAVILY_API_KEY`、`EXA_API_KEY`、`BRAVE_SEARCH_API_KEY` 或 `SERPER_API_KEY`。

## 安全说明

API 钥匙只保存在本机 DSH 配置中，并且只会在搜索时发送给当前选择的服务商。它不会进入仓库、日志，也不会通过设置页完整返回。请不要把包含真实钥匙的本机 `cordis.patch.yml` 提交到 GitHub。

## 开发与测试

```bash
npm install
npm run build
npm test
```

测试使用临时文件并模拟服务商响应，不会调用任何服务商，也不需要真实 API 钥匙。

## 许可证

[MIT](LICENSE) © 2026 SONGOAO25
