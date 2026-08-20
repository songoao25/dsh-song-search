# dsh-search

[**English**](README.md) | [**中文**](README.zh-CN.md)

[![许可证](https://img.shields.io/github/license/songoao25/dsh-search)](https://github.com/songoao25/dsh-search/blob/main/LICENSE)
[![Release](https://img.shields.io/github/v/release/songoao25/dsh-search)](https://github.com/songoao25/dsh-search/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/songoao25/dsh-search/ci.yml)](https://github.com/songoao25/dsh-search/actions)

`dsh-search` 是 DeepSeek Harness（DSH）的联网搜索插件：接入 Exa，并提供原生风格的「搜索服务」设置页。

## 功能

- 在 DSH 联网搜索中使用 Exa。
- 在设置页手动选择 Exa 或 DeepSeek。
- Exa API 钥匙使用安全输入框，支持显示/隐藏、取消更改、保存、校验和键盘操作。
- 使用 DSH 自带的语义主题颜色，自动适配浅色、深色和高对比度模式。
- 钥匙在主进程处理，不完整返回、不写入日志。

## 安装

```bash
git clone https://github.com/songoao25/dsh-search.git
cd dsh-search
npm run build
dsh plugin --profile web add .
```

安装后重启 `dsh web`；如果浏览器页面没有立即变化，再刷新一次页面。

## 使用

1. 打开 DSH 的「设置」。
2. 打开「搜索服务」。
3. 选择「Exa — 网页搜索」。
4. 粘贴 Exa API 钥匙，点击「保存」。
5. 在对话中提出需要联网的问题。

需要切回 DeepSeek 时，选择「DeepSeek — 官方搜索」并保存，马上生效。

Exa API 钥匙可以在 [Exa Dashboard](https://dashboard.exa.ai/api-keys) 创建。

## 安全说明

API 钥匙只保存在本机 DSH 配置中，并且只会在 Exa 搜索时发送给 Exa。它不会进入仓库、日志，也不会通过设置页完整返回。请不要把包含真实钥匙的本机 `cordis.patch.yml` 提交到 GitHub。

## 开发与测试

```bash
npm install
npm run build
npm test
```

测试使用临时文件，不会调用 Exa，也不需要真实 API 钥匙。

## 许可证

[MIT](LICENSE) © 2026 songoao25
