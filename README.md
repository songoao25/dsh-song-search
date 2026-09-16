# dsh-song-search

[**English**](README.md) | [**中文**](README.zh-CN.md)

[![License](https://img.shields.io/github/license/SONGOAO25/dsh-song-search)](https://github.com/SONGOAO25/dsh-song-search/blob/main/LICENSE)
[![Release](https://img.shields.io/github/v/release/SONGOAO25/dsh-song-search)](https://github.com/SONGOAO25/dsh-song-search/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/SONGOAO25/dsh-song-search/ci.yml)](https://github.com/SONGOAO25/dsh-song-search/actions)
[![Last Commit](https://img.shields.io/github/last-commit/SONGOAO25/dsh-song-search)](https://github.com/SONGOAO25/dsh-song-search/commits/main)
[![Stars](https://img.shields.io/github/stars/SONGOAO25/dsh-song-search)](https://github.com/SONGOAO25/dsh-song-search)

A DeepSeek Harness (DSH) plugin that adds third-party web and AI search providers and a native-style **搜索服务 / Search Service** settings page.

## Features

- Perplexity Search, You.com Search, Tavily, Exa, Brave Search, and Serper providers for DSH web search.
- Settings page to choose a third-party provider or the existing DeepSeek search.
- Separate secure API-key storage for each provider, with masked status, cancel, save, validation, and keyboard-friendly form behavior.
- Per-provider custom settings: HTTPS/API base URL (or a localhost HTTP proxy), result count, country, language, freshness, domain filters, and provider-specific search modes.
- Uses DSH semantic theme tokens for light mode, dark mode, and contrast settings.
- Host-side API key handling; the key is never returned in full or logged.
- No DSH-internal runtime dependency; only the small general-purpose `yaml` package is used for profile configuration.

## Requirements

- DeepSeek Harness with the `dsh web` interface.
- An API key for any third-party provider you want to use:
  - [Perplexity API](https://www.perplexity.ai/settings/api)
  - [You.com Platform](https://you.com/platform)
  - [Tavily](https://app.tavily.com/home)
  - [Exa](https://dashboard.exa.ai/api-keys)
  - [Brave Search](https://api-dashboard.search.brave.com/app/keys)
  - [Serper](https://serper.dev/api-key)

## Install

```bash
git clone https://github.com/SONGOAO25/dsh-song-search.git
cd dsh-song-search
npm run build
dsh plugin --profile web add .
```

Restart `dsh web` after installing. Then refresh the browser page if needed.

## Use

1. Open DSH **Settings**.
2. Open **搜索服务 / Search Service**.
3. Choose **Perplexity Search**, **You.com Search**, **Tavily**, **Exa**, **Brave Search**, or **Serper**.
4. Paste the selected provider's API key and choose **保存**.
5. Adjust the endpoint, result count, region/language, freshness, domain filters, or provider-specific options if needed.
6. Ask DSH to search the web.

To switch back, choose **DeepSeek — 官方搜索** and save. The setting takes effect immediately after saving. Each provider uses its own official REST endpoint and result format is normalized by the plugin. Perplexity Search and You.com Search are structured search APIs; they are not the providers' answer/chat endpoints, so DSH still receives source URLs and snippets.

The settings page stores provider settings under the plugin row in `cordis.patch.yml`. The supported shape is:

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

The selected provider's `apiKey` can also come from its environment variable (`PERPLEXITY_API_KEY`, `YDC_API_KEY`, `TAVILY_API_KEY`, `EXA_API_KEY`, `BRAVE_SEARCH_API_KEY`, or `SERPER_API_KEY`).

## Security and privacy

API keys are stored in the local DSH profile configuration with restrictive local permissions and are sent only to the selected provider when a search is performed. They are never included in repository files, logs, or the settings page response in full. Do not commit your local `cordis.patch.yml` or any file containing a real key.

## Development

```bash
npm install
npm run build
npm test
```

The test suite uses temporary fixtures and mocks provider responses; it does not call any provider or require a real API key.

## License

[MIT](LICENSE) © 2026 SONGOAO25
