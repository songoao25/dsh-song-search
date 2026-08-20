// dsh-song-search — host half（静态 bundle 形态）
// 业务：
//   1. 在 DSH 的 ctx.web 搜索接缝注册 Exa 搜索提供商（provider id = 'exa'）
//   2. 提供 RPC（/_dsh/dsh-song-search/{getSearchConfig,setSearchConfig}），
//      供设置「搜索服务」页读取/修改 profile 的 cordis.patch.yml（搜索商 + 钥匙）
// 原则：
//   1. 零 DSH 内部依赖——不 import 任何 @deepseek-ai 包，只用 Node 内置能力与通用 yaml 库，
//      与 DSH 版本升级天然隔离，不依赖任何官方未发布组件。
//   2. 钥匙只从 config.apiKey 或环境变量 EXA_API_KEY 读取，绝不打印、不进日志、不进错误信息；
//      RPC 返回钥匙只脱敏回显（前 4 后 4）。
//   3. 直接调用 Exa 官方 REST API（POST https://api.exa.ai/search）。
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { parse, stringify } from 'yaml'

const EXA_DEFAULT_BASE_URL = 'https://api.exa.ai'
const EXA_PROVIDER_ID = 'exa'
const EXA_DEFAULT_NUM_RESULTS = 5
const EXA_SNIPPET_MAX_CHARS = 500
const ROUTE_PREFIX = '/_dsh/dsh-song-search'
const PATCH_ROW_ID = 'dsh-song-search'
const PROVIDER_LABELS = { exa: 'Exa', 'deepseek-official': 'DeepSeek' }

// 纯函数：从 config 或环境变量解析钥匙（不打印、不记录、不落盘）
export function resolveApiKey(config) {
  if (config && typeof config.apiKey === 'string' && config.apiKey.length > 0) return config.apiKey
  if (typeof process !== 'undefined' && process.env && typeof process.env.EXA_API_KEY === 'string' && process.env.EXA_API_KEY.length > 0) return process.env.EXA_API_KEY
  return null
}

// 纯函数：把 Exa /search 响应映射为 DSH 的 WebSearchResult 形状
export function mapExaResults(data) {
  const results = data && Array.isArray(data.results) ? data.results : []
  const sources = results
    .filter((r) => r && typeof r.url === 'string' && r.url.length > 0)
    .map((r) => ({
      url: r.url,
      ...(typeof r.title === 'string' && r.title.length > 0 ? { title: r.title } : {}),
      ...(typeof r.text === 'string' && r.text.length > 0 ? { snippet: r.text.slice(0, EXA_SNIPPET_MAX_CHARS) } : {}),
    }))
  return { sources, truncated: false }
}

// 组装 Exa 搜索提供商（provider 契约与 DSH ctx.web 接缝一致：id / available / search）
export function buildExaSearchProvider(resolveOptions) {
  return {
    id: EXA_PROVIDER_ID,
    available() {
      const options = resolveOptions()
      return Boolean(options.apiKey) && URL.canParse(options.baseURL)
    },
    async search(request, signal) {
      const options = resolveOptions()
      const endpoint = options.baseURL + '/search'
      const body = {
        query: String((request && request.query) || ''),
        numResults: Number.isInteger(request && request.maxResults) && request.maxResults > 0 ? request.maxResults : EXA_DEFAULT_NUM_RESULTS,
        type: options.searchType || 'auto',
        ...(options.highlights ? { contents: { highlights: true } } : {}),
      }
      let response
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          redirect: 'error',
          headers: {
            'content-type': 'application/json',
            'accept': 'application/json',
            'authorization': 'Bearer ' + options.apiKey,
            'x-api-key': options.apiKey,
            'user-agent': 'dsh-song-search/0.2.0',
          },
          body: JSON.stringify(body),
          ...(signal !== undefined ? { signal } : {}),
        })
      } catch (err) {
        throw new Error('Exa search request failed: ' + String((err && err.message) || err))
      }
      if (!response.ok) {
        let detail = 'Exa API error (HTTP ' + response.status + ')'
        try {
          const parsed = await response.json()
          if (parsed && typeof parsed.message === 'string' && parsed.message.length > 0) detail = parsed.message
          else if (parsed && typeof parsed.error === 'string' && parsed.error.length > 0) detail = parsed.error
        } catch (err) { /* 保留默认信息，不把响应原文放进错误 */ }
        throw new Error(detail)
      }
      let data
      try {
        data = await response.json()
      } catch (err) {
        throw new Error('Exa returned an unprocessable response body')
      }
      return mapExaResults(data)
    },
  }
}

// 定位 profile patch 文件：config.patchFilePath 优先，否则自动探测
// （遍历 $DSH_HOME/profiles/*/cordis.patch.yml，找包含本插件行 id 的文件）
export function locatePatchFile(config) {
  if (config && typeof config.patchFilePath === 'string' && config.patchFilePath.length > 0) return config.patchFilePath
  const home = typeof process.env.DSH_HOME === 'string' && process.env.DSH_HOME.length > 0 ? process.env.DSH_HOME : join(homedir(), '.dsh')
  const profilesDir = join(home, 'profiles')
  if (!existsSync(profilesDir)) return null
  try {
    for (const entry of readdirSync(profilesDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const patch = join(profilesDir, entry.name, 'cordis.patch.yml')
      if (existsSync(patch) && readFileSync(patch, 'utf8').includes(PATCH_ROW_ID)) return patch
    }
  } catch (err) { /* 探测失败则返回 null，由调用方报错 */ }
  return null
}

// 读取当前搜索配置（钥匙只脱敏回显，绝不返回完整钥匙）
export function readSearchConfig(patchPath) {
  if (!patchPath || !existsSync(patchPath)) return { ok: false, error: '找不到 profile 配置文件（cordis.patch.yml）' }
  let doc
  try {
    doc = parse(readFileSync(patchPath, 'utf8'))
  } catch (err) {
    return { ok: false, error: '配置文件解析失败，请检查格式或联系维护者' }
  }
  const rows = Array.isArray(doc) ? doc : []
  const webRow = rows.find((r) => r && r.id === 'web')
  const exaRow = rows.find((r) => r && r.id === PATCH_ROW_ID)
  const provider = webRow && webRow.config && typeof webRow.config.searchProvider === 'string' ? webRow.config.searchProvider : null
  const apiKey = exaRow && exaRow.config && typeof exaRow.config.apiKey === 'string' ? exaRow.config.apiKey : ''
  const masked = apiKey.length > 4 ? apiKey.slice(0, 4) + '****' + apiKey.slice(-4) : apiKey.length > 0 ? '****' : ''
  return {
    ok: true,
    provider: provider || 'deepseek-official',
    providerLabel: PROVIDER_LABELS[provider] || provider || 'DeepSeek',
    exaKeySet: apiKey.length > 0,
    exaKeyMasked: masked,
    patchFile: patchPath,
  }
}

// 修改搜索配置：provider（exa / deepseek-official）+ 可选 apiKey（仅 exa 时写入）
export function writeSearchConfig(patchPath, next) {
  if (!patchPath) return { ok: false, error: '找不到 profile 配置文件（cordis.patch.yml）' }
  const provider = next && next.provider === 'exa' ? 'exa' : 'deepseek-official'
  let doc
  try {
    doc = parse(readFileSync(patchPath, 'utf8'))
  } catch (err) {
    return { ok: false, error: '配置文件解析失败，无法保存' }
  }
  if (!Array.isArray(doc)) return { ok: false, error: '配置文件结构异常，无法保存' }
  let webRow = doc.find((r) => r && r.id === 'web')
  if (!webRow) { webRow = { id: 'web' }; doc.push(webRow); }
  if (!webRow.config || typeof webRow.config !== 'object') webRow.config = {}
  webRow.config.searchProvider = provider
  if (provider === 'exa') {
    let exaRow = doc.find((r) => r && r.id === PATCH_ROW_ID)
    if (!exaRow) { exaRow = { id: PATCH_ROW_ID }; doc.push(exaRow); }
    if (!exaRow.config || typeof exaRow.config !== 'object') exaRow.config = {}
    if (next && typeof next.apiKey === 'string' && next.apiKey.length > 0) exaRow.config.apiKey = next.apiKey
  }
  try {
    writeFileSync(patchPath, stringify(doc) + '\n')
  } catch (err) {
    return { ok: false, error: '配置文件写入失败，请检查文件权限' }
  }
  return { ok: true, provider: provider }
}

// 同源防护：有副作用的 RPC 只允许 POST + 严格同源
function sameOrigin(req) {
  const fetchSite = (req.headers && (req.headers['sec-fetch-site'] || '')) || ''
  const origin = (req.headers && req.headers.origin) || ''
  const host = (req.headers && req.headers.host) || ''
  if (origin) return host.length > 0 && (origin === 'http://' + host || origin === 'https://' + host)
  return fetchSite === 'same-origin' || fetchSite === 'none'
}

function readBody(req, maxBytes) {
  return new Promise(function (resolve, reject) {
    let size = 0
    const chunks = []
    req.on('data', function (c) { size += c.length; if (size > maxBytes) { reject(Object.assign(new Error('payload too large'), { status: 413 })); req.destroy(); return; } chunks.push(c); })
    req.on('end', function () { resolve(Buffer.concat(chunks).toString('utf8')); })
    req.on('error', reject)
  })
}

function respond(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(payload))
}

// 注册进 ctx.web + 挂载 RPC 路由
function apply(ctx, config) {
  ctx.web.registerSearchProvider(buildExaSearchProvider(() => ({
    apiKey: resolveApiKey(config),
    baseURL: config && typeof config.baseURL === 'string' && config.baseURL.length > 0 ? config.baseURL : EXA_DEFAULT_BASE_URL,
    searchType: config && config.searchType,
    highlights: Boolean(config && config.highlights),
  })))

  ctx.inject(['webServer'], function (webCtx) {
    try {
      const dispose = webCtx.webServer.register({
        kind: 'prefix',
        path: ROUTE_PREFIX,
        handler: async function (req, res) {
          try {
            const url = new URL(req.url || '/', 'http://localhost')
            const method = decodeURIComponent(url.pathname.slice(ROUTE_PREFIX.length + 1))
            if (method === 'getSearchConfig' && (req.method === 'GET' || req.method === 'POST')) {
              respond(res, 200, readSearchConfig(locatePatchFile(config)))
              return
            }
            if (method === 'setSearchConfig') {
              if (req.method !== 'POST') { respond(res, 405, { error: 'setSearchConfig requires POST' }); return; }
              if (!sameOrigin(req)) { respond(res, 403, { error: 'cross-origin request rejected' }); return; }
              const raw = await readBody(req, 64 * 1024)
              let args = {}
              if (raw.length > 0) { try { args = JSON.parse(raw); } catch (e) { respond(res, 400, { error: 'invalid JSON body' }); return; } }
              respond(res, 200, writeSearchConfig(locatePatchFile(config), args))
              return
            }
            respond(res, 404, { error: 'unknown method: ' + method })
          } catch (err) {
            respond(res, 500, { error: 'internal error' })
          }
        },
      })
      return function () { dispose(); }
    } catch (err) {
      console.warn('[dsh-song-search] webServer 路由注册失败', String((err && err.message) || err))
    }
  }, 'dsh-song-search: RPC routes')
}

export default { name: 'dsh-song-search', inject: ['web'], apply }
