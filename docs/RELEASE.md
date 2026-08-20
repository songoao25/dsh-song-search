# Release record: dsh-search 0.2.0

## Scope

Publish the renamed `dsh-search` DSH plugin with the Exa provider and Search Service settings page.

## Verification

- `npm test` — 33 PASS / 0 FAIL
- `npm run build` — passed
- `node --check lib/client.js` — passed
- Profile composition — passed with `dsh-search` and `searchProvider: exa`
- Live settings registration — verified in DSH settings slot
- Exa news, technical documentation, and Chinese web searches — passed

## Rollback

In DSH settings, select DeepSeek and save. To roll back the published code, install the previous tagged release or remove the `dsh-search` bundle from the profile and restart `dsh web`.
