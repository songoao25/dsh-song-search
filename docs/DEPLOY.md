# Deployment record

## Deployment

The plugin is installed into a DSH profile with:

```bash
npm run build
dsh plugin --profile web add .
```

Restart `dsh web` after installing, then refresh the browser page.

## Smoke test

1. Open Settings → 搜索服务.
2. Select Exa and save a local API key.
3. Run a news search, a technical documentation search, and a Chinese web search.
4. Confirm results contain source URLs.

## Rollback

Select DeepSeek in Settings → 搜索服务 and save. For a complete rollback, remove the plugin from the profile and restart `dsh web`, or install an earlier release tag.
