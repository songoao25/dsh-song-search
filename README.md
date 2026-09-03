# dsh-song-search

[**English**](README.md) | [**中文**](README.zh-CN.md)

[![License](https://img.shields.io/github/license/SONGOAO25/dsh-song-search)](https://github.com/SONGOAO25/dsh-song-search/blob/main/LICENSE)
[![Release](https://img.shields.io/github/v/release/SONGOAO25/dsh-song-search)](https://github.com/SONGOAO25/dsh-song-search/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/SONGOAO25/dsh-song-search/ci.yml)](https://github.com/SONGOAO25/dsh-song-search/actions)
[![Last Commit](https://img.shields.io/github/last-commit/SONGOAO25/dsh-song-search)](https://github.com/SONGOAO25/dsh-song-search/commits/main)
[![Stars](https://img.shields.io/github/stars/SONGOAO25/dsh-song-search)](https://github.com/SONGOAO25/dsh-song-search)

A DeepSeek Harness (DSH) plugin that adds Exa web search and a native-style **搜索服务 / Search Service** settings page.

## Features

- Exa provider for DSH web search (`provider id: exa`).
- Settings page to choose Exa or DeepSeek search.
- Secure API-key field with masked status, cancel, save, validation, and keyboard-friendly form behavior.
- Uses DSH semantic theme tokens for light mode, dark mode, and contrast settings.
- Host-side API key handling; the key is never returned in full or logged.
- No DSH-internal runtime dependency; only the small general-purpose `yaml` package is used for profile configuration.

## Requirements

- DeepSeek Harness with the `dsh web` interface.
- An Exa API key for Exa search: [Exa Dashboard](https://dashboard.exa.ai/api-keys).

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
3. Choose **Exa — 网页搜索**.
4. Paste an Exa API key and choose **保存**.
5. Ask DSH to search the web.

To switch back, choose **DeepSeek — 官方搜索** and save. The setting takes effect immediately after saving.

## Security and privacy

The API key is stored in the local DSH profile configuration with restrictive local permissions and is sent only to Exa when an Exa search is performed. It is never included in repository files, logs, or the settings page response in full. Do not commit your local `cordis.patch.yml` or any file containing a real key.

## Development

```bash
npm install
npm run build
npm test
```

The test suite uses temporary fixtures and does not call Exa or require a real API key.

## License

[MIT](LICENSE) © 2026 SONGOAO25
