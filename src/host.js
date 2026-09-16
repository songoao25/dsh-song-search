// dsh-song-search — host half（静态 bundle 形态）
// 业务：
//   1. 在 DSH 的 ctx.web 搜索接缝注册常用网页与 AI 搜索提供商
//   2. 提供 RPC（/_dsh/dsh-song-search/{getSearchConfig,setSearchConfig}），
//      供设置「搜索服务」页读取/修改 profile 的 cordis.patch.yml（搜索商 + 钥匙）
// 原则：
//   1. 零 DSH 内部依赖——不 import 任何 @deepseek-ai 包，只用 Node 内置能力与通用 yaml 库，
//      与 DSH 版本升级天然隔离，不依赖任何官方未发布组件。
//   2. 各服务商钥匙分开保存，只从本机配置或对应环境变量读取，绝不打印、不进日志、不进错误信息；
//      RPC 返回钥匙只脱敏回显（前 4 后 4）。
//   3. 只调用各服务商官方 REST API，不引入 SDK 或 DSH 内部运行时依赖。
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { parse, stringify } from 'yaml'

const EXA_DEFAULT_NUM_RESULTS = 5
const MAX_NUM_RESULTS = 20
const EXA_SNIPPET_MAX_CHARS = 500
const ROUTE_PREFIX = '/_dsh/dsh-song-search'
const PATCH_ROW_ID = 'dsh-song-search'
const PROVIDER_DEFINITIONS = {
  exa: { label: 'Exa', envKey: 'EXA_API_KEY', baseURL: 'https://api.exa.ai', path: '/search', method: 'POST' },
  perplexity: { label: 'Perplexity Search', envKey: 'PERPLEXITY_API_KEY', baseURL: 'https://api.perplexity.ai', path: '/search', method: 'POST' },
  you: { label: 'You.com Search', envKey: 'YDC_API_KEY', baseURL: 'https://ydc-index.io', path: '/v1/search', method: 'POST' },
  brave: { label: 'Brave Search', envKey: 'BRAVE_SEARCH_API_KEY', baseURL: 'https://api.search.brave.com/res/v1', path: '/web/search', method: 'GET' },
  tavily: { label: 'Tavily', envKey: 'TAVILY_API_KEY', baseURL: 'https://api.tavily.com', path: '/search', method: 'POST' },
  serper: { label: 'Serper（Google）', envKey: 'SERPER_API_KEY', baseURL: 'https://google.serper.dev', path: '/search', method: 'POST' },
}
const THIRD_PARTY_PROVIDER_IDS = Object.keys(PROVIDER_DEFINITIONS)
const PROVIDER_LABELS = { ...Object.fromEntries(THIRD_PARTY_PROVIDER_IDS.map((id) => [id, PROVIDER_DEFINITIONS[id].label])), 'deepseek-official': 'DeepSeek' }
const FRESHNESS_VALUES = new Set(['hour', 'day', 'week', 'month', 'year'])
const YOU_FRESHNESS_VALUES = new Set(['day', 'week', 'month', 'year'])
const TAVILY_SEARCH_DEPTH_VALUES = new Set(['basic', 'fast', 'advanced', 'ultra-fast'])
const YOU_EXTRACTION_VALUES = new Set(['highlights', 'full_page'])
const YOU_SAFE_SEARCH_VALUES = new Set(['off', 'moderate', 'strict'])
const EXA_SEARCH_TYPE_VALUES = new Set(['auto', 'neural', 'keyword', 'fast'])
const PERPLEXITY_SEARCH_TYPE_VALUES = new Set(['web', 'people'])
const PERPLEXITY_CONTEXT_VALUES = new Set(['low', 'medium', 'high'])
const SETTING_KEYS = [
  'baseURL',
  'maxResults',
  'country',
  'language',
  'freshness',
  'includeDomains',
  'excludeDomains',
  'searchDepth',
  'extractionMode',
  'safeSearch',
  'searchType',
  'searchContextSize',
]

function isThirdPartyProvider(provider) {
  return THIRD_PARTY_PROVIDER_IDS.includes(provider)
}

function maxResultsFor(request, settings) {
  const value = request && request.maxResults
  const configured = settings && settings.maxResults
  const selected = Number.isInteger(value) && value > 0 ? value : configured
  if (!Number.isInteger(selected) || selected <= 0) return EXA_DEFAULT_NUM_RESULTS
  return Math.min(selected, MAX_NUM_RESULTS)
}

function storedApiKey(config, provider = 'exa') {
  if (!config || typeof config !== 'object') return null
  if (provider === 'exa' && typeof config.apiKey === 'string' && config.apiKey.length > 0) return config.apiKey
  const apiKeys = config.apiKeys
  if (apiKeys && typeof apiKeys === 'object' && typeof apiKeys[provider] === 'string' && apiKeys[provider].length > 0) return apiKeys[provider]
  return null
}

// 纯函数：从 config 或对应环境变量解析钥匙（不打印、不记录、不落盘）
export function resolveApiKey(config, provider = 'exa') {
  const configured = storedApiKey(config, provider)
  if (configured) return configured
  const envKey = PROVIDER_DEFINITIONS[provider] && PROVIDER_DEFINITIONS[provider].envKey
  if (envKey && typeof process !== 'undefined' && process.env && typeof process.env[envKey] === 'string' && process.env[envKey].length > 0) return process.env[envKey]
  return null
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function storedProviderSettings(config, provider) {
  const all = asObject(config && config.providerSettings)
  const configured = asObject(all[provider])
  const legacy = provider === 'exa'
    ? {
        ...(config && typeof config.baseURL === 'string' ? { baseURL: config.baseURL } : {}),
        ...(config && typeof config.searchType === 'string' ? { searchType: config.searchType } : {}),
        ...(config && typeof config.highlights === 'boolean' ? { highlights: config.highlights } : {}),
      }
    : {}
  return { ...legacy, ...configured }
}

function domainList(value) {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[\n,]/) : []
  return [...new Set(values
    .map((item) => String(item || '').trim().toLowerCase())
    .filter((item) => item.length > 0)
    .slice(0, 50))]
}

function isAllowedBaseURL(value) {
  if (typeof value !== 'string' || value.length === 0) return false
  try {
    const url = new URL(value)
    if (url.protocol === 'https:') return true
    return url.protocol === 'http:' && ['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname)
  } catch (err) {
    return false
  }
}

function normalizedBaseURL(value, fallback) {
  const candidate = typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
  if (!isAllowedBaseURL(candidate)) return ''
  return candidate.replace(/\/+$/, '')
}

function normalizeResolveOptions(value) {
  const options = asObject(value)
  return {
    ...options,
    baseURL: typeof options.baseURL === 'string' ? options.baseURL.replace(/\/+$/, '') : '',
    includeDomains: domainList(options.includeDomains),
    excludeDomains: domainList(options.excludeDomains),
  }
}

function resolveProviderOptions(config, provider) {
  const definition = PROVIDER_DEFINITIONS[provider]
  const settings = storedProviderSettings(config, provider)
  return normalizeResolveOptions({
    apiKey: resolveApiKey(config, provider),
    baseURL: normalizedBaseURL(settings.baseURL, definition.baseURL),
    maxResults: settings.maxResults,
    country: typeof settings.country === 'string' ? settings.country.trim().toUpperCase() : '',
    language: typeof settings.language === 'string' ? settings.language.trim() : '',
    freshness: typeof settings.freshness === 'string' ? settings.freshness.trim() : '',
    includeDomains: settings.includeDomains,
    excludeDomains: settings.excludeDomains,
    searchDepth: settings.searchDepth,
    extractionMode: settings.extractionMode,
    safeSearch: settings.safeSearch,
    searchType: settings.searchType || (provider === 'exa' ? 'auto' : ''),
    searchContextSize: settings.searchContextSize,
    highlights: Boolean(settings.highlights),
  })
}

function mapResultList(results, getUrl, getTitle, getSnippet) {
  const list = Array.isArray(results) ? results : []
  const sources = list
    .map((r) => ({ row: r, url: getUrl(r), title: getTitle(r), snippet: getSnippet(r) }))
    .filter((item) => item.row && typeof item.url === 'string' && item.url.length > 0)
    .map((r) => ({
      url: r.url,
      ...(typeof r.title === 'string' && r.title.length > 0 ? { title: r.title } : {}),
      ...(typeof r.snippet === 'string' && r.snippet.length > 0 ? { snippet: r.snippet.slice(0, EXA_SNIPPET_MAX_CHARS) } : {}),
    }))
  return { sources, truncated: false }
}

// 纯函数：把各服务商响应映射为 DSH 的 WebSearchResult 形状
export function mapExaResults(data) {
  return mapResultList(data && data.results, (r) => r && r.url, (r) => r && r.title, (r) => r && r.text)
}

export function mapPerplexityResults(data) {
  return mapResultList(data && data.results, (r) => r && r.url, (r) => r && r.title, (r) => r && r.snippet)
}

export function mapYouResults(data, maxResults = MAX_NUM_RESULTS) {
  const resultGroups = data && data.results && typeof data.results === 'object' ? data.results : {}
  const results = [
    ...(Array.isArray(resultGroups.web) ? resultGroups.web : []),
    ...(Array.isArray(resultGroups.news) ? resultGroups.news : []),
  ]
  const mapped = mapResultList(results, (r) => r && r.url, (r) => r && r.title, (r) => {
    if (!r) return ''
    const snippets = Array.isArray(r.snippets) ? r.snippets : []
    const highlights = r.contents && Array.isArray(r.contents.highlights) ? r.contents.highlights : []
    return [r.description, ...snippets, ...highlights, r.contents && r.contents.markdown].filter((x) => typeof x === 'string' && x.length > 0).join(' ')
  })
  return { ...mapped, sources: mapped.sources.slice(0, maxResults) }
}

export function mapBraveResults(data) {
  return mapResultList(data && data.web && data.web.results, (r) => r && r.url, (r) => r && r.title, (r) => {
    if (!r) return ''
    return [r.description, ...(Array.isArray(r.extra_snippets) ? r.extra_snippets : [])].filter((x) => typeof x === 'string' && x.length > 0).join(' ')
  })
}

export function mapTavilyResults(data) {
  return mapResultList(data && data.results, (r) => r && r.url, (r) => r && r.title, (r) => r && r.content)
}

export function mapSerperResults(data) {
  return mapResultList(data && data.organic, (r) => r && r.link, (r) => r && r.title, (r) => r && r.snippet)
}

function mapProviderResults(provider, data, maxResults) {
  if (provider === 'perplexity') return mapPerplexityResults(data)
  if (provider === 'you') return mapYouResults(data, maxResults)
  if (provider === 'brave') return mapBraveResults(data)
  if (provider === 'tavily') return mapTavilyResults(data)
  if (provider === 'serper') return mapSerperResults(data)
  return mapExaResults(data)
}

function requestHeaders(provider, apiKey) {
  if (provider === 'you') return { 'x-api-key': apiKey }
  if (provider === 'brave') return { 'x-subscription-token': apiKey }
  if (provider === 'tavily') return { authorization: 'Bearer ' + apiKey }
  if (provider === 'serper') return { 'x-api-key': apiKey }
  return { authorization: 'Bearer ' + apiKey, 'x-api-key': apiKey }
}

function requestBody(provider, query, numResults, options) {
  if (provider === 'perplexity') {
    return {
      query,
      max_results: numResults,
      ...(options.country ? { country: options.country } : {}),
      ...(options.language ? { search_language_filter: [options.language.slice(0, 2).toLowerCase()] } : {}),
      ...(options.freshness ? { search_recency_filter: options.freshness } : {}),
      ...(options.includeDomains.length > 0 ? { search_domain_filter: options.includeDomains } : {}),
      ...(options.searchType ? { search_type: options.searchType } : {}),
      ...(options.searchContextSize ? { search_context_size: options.searchContextSize } : {}),
    }
  }
  if (provider === 'you') {
    return {
      query,
      count: numResults,
      ...(options.country ? { country: options.country } : {}),
      ...(options.language ? { language: options.language } : {}),
      ...(options.freshness ? { freshness: options.freshness } : {}),
      ...(options.includeDomains.length > 0 ? { include_domains: options.includeDomains } : {}),
      ...(options.excludeDomains.length > 0 ? { exclude_domains: options.excludeDomains } : {}),
      ...(options.extractionMode ? { extraction: { extraction_mode: options.extractionMode } } : {}),
      ...(options.safeSearch ? { safesearch: options.safeSearch } : {}),
    }
  }
  if (provider === 'tavily') return {
    query,
    max_results: numResults,
    search_depth: options.searchDepth || 'basic',
    include_answer: false,
    ...(options.includeDomains.length > 0 ? { include_domains: options.includeDomains } : {}),
    ...(options.excludeDomains.length > 0 ? { exclude_domains: options.excludeDomains } : {}),
  }
  if (provider === 'serper') return {
    q: query,
    num: numResults,
    ...(options.country ? { gl: options.country.toLowerCase() } : {}),
    ...(options.language ? { hl: options.language.toLowerCase() } : {}),
  }
  return {
    query,
    numResults,
    type: options.searchType || 'auto',
    ...(options.includeDomains.length > 0 ? { includeDomains: options.includeDomains } : {}),
    ...(options.excludeDomains.length > 0 ? { excludeDomains: options.excludeDomains } : {}),
    ...(options.highlights ? { contents: { highlights: true } } : {}),
  }
}

function buildProviderUrl(provider, options, query, numResults) {
  const endpoint = options.baseURL + PROVIDER_DEFINITIONS[provider].path
  if (provider !== 'brave') return endpoint
  const params = new URLSearchParams({ q: query, count: String(numResults), extra_snippets: 'true' })
  if (options.country) params.set('country', options.country)
  if (options.language) params.set('search_lang', options.language)
  if (options.freshness) params.set('freshness', options.freshness)
  return endpoint + '?' + params.toString()
}

// 组装搜索提供商（provider 契约与 DSH ctx.web 接缝一致：id / available / search）
export function buildSearchProvider(provider, resolveOptions) {
  const definition = PROVIDER_DEFINITIONS[provider]
  if (!definition) throw new Error('Unknown search provider: ' + provider)
  return {
    id: provider,
    available() {
      const options = normalizeResolveOptions(resolveOptions())
      return Boolean(options.apiKey) && isAllowedBaseURL(options.baseURL)
    },
    async search(request, signal) {
      const options = normalizeResolveOptions(resolveOptions())
      if (!options.apiKey || !isAllowedBaseURL(options.baseURL)) throw new Error(definition.label + ' provider is not configured')
      const query = String((request && request.query) || '')
      const numResults = maxResultsFor(request, options)
      const endpoint = buildProviderUrl(provider, options, query, numResults)
      const headers = { 'content-type': 'application/json', 'accept': 'application/json', ...requestHeaders(provider, options.apiKey), 'user-agent': 'dsh-song-search/0.4.0' }
      let response
      try {
        response = await fetch(endpoint, {
          method: definition.method,
          redirect: 'error',
          headers,
          ...(definition.method === 'GET' ? {} : { body: JSON.stringify(requestBody(provider, query, numResults, options)) }),
          ...(signal !== undefined ? { signal } : {}),
        })
      } catch (err) {
        throw new Error(definition.label + ' search request failed: ' + String((err && err.message) || err))
      }
      if (!response.ok) {
        throw new Error(definition.label + ' API error (HTTP ' + response.status + ')')
      }
      let data
      try {
        data = await response.json()
      } catch (err) {
        throw new Error(definition.label + ' returned an unprocessable response body')
      }
      return mapProviderResults(provider, data, numResults)
    },
  }
}

export function buildExaSearchProvider(resolveOptions) { return buildSearchProvider('exa', resolveOptions) }
export function buildPerplexitySearchProvider(resolveOptions) { return buildSearchProvider('perplexity', resolveOptions) }
export function buildYouSearchProvider(resolveOptions) { return buildSearchProvider('you', resolveOptions) }
export function buildBraveSearchProvider(resolveOptions) { return buildSearchProvider('brave', resolveOptions) }
export function buildTavilySearchProvider(resolveOptions) { return buildSearchProvider('tavily', resolveOptions) }
export function buildSerperSearchProvider(resolveOptions) { return buildSearchProvider('serper', resolveOptions) }

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

function parsePatchDocument(patchPath) {
  if (!patchPath || !existsSync(patchPath)) return null
  try {
    const doc = parse(readFileSync(patchPath, 'utf8'))
    return Array.isArray(doc) ? doc : null
  } catch (err) {
    return null
  }
}

function pluginConfigFromPatch(patchPath) {
  const rows = parsePatchDocument(patchPath)
  const row = rows && rows.find((item) => item && item.id === PATCH_ROW_ID)
  return row && row.config && typeof row.config === 'object' ? row.config : null
}

function livePluginConfig(config) {
  const persisted = pluginConfigFromPatch(locatePatchFile(config))
  if (!persisted) return asObject(config)
  return {
    ...asObject(config),
    ...persisted,
    apiKeys: { ...asObject(config && config.apiKeys), ...asObject(persisted.apiKeys) },
    providerSettings: { ...asObject(config && config.providerSettings), ...asObject(persisted.providerSettings) },
  }
}

function maskedApiKey(value) {
  return value.length > 4 ? value.slice(0, 4) + '****' + value.slice(-4) : value.length > 0 ? '****' : ''
}

function publicProviderSettings(config, provider) {
  const definition = PROVIDER_DEFINITIONS[provider]
  const raw = storedProviderSettings(config, provider)
  const maxResults = Number.isInteger(raw.maxResults) && raw.maxResults >= 1 && raw.maxResults <= MAX_NUM_RESULTS ? raw.maxResults : EXA_DEFAULT_NUM_RESULTS
  const freshness = typeof raw.freshness === 'string' && (provider !== 'you' ? FRESHNESS_VALUES.has(raw.freshness) : YOU_FRESHNESS_VALUES.has(raw.freshness)) ? raw.freshness : ''
  const settings = {
    baseURL: normalizedBaseURL(raw.baseURL, definition.baseURL) || definition.baseURL,
    maxResults,
    country: typeof raw.country === 'string' ? raw.country.trim().toUpperCase() : '',
    language: typeof raw.language === 'string' ? raw.language.trim() : '',
    freshness,
    includeDomains: domainList(raw.includeDomains),
    excludeDomains: domainList(raw.excludeDomains),
  }
  if (provider === 'tavily') settings.searchDepth = TAVILY_SEARCH_DEPTH_VALUES.has(raw.searchDepth) ? raw.searchDepth : 'basic'
  if (provider === 'you') {
    settings.extractionMode = YOU_EXTRACTION_VALUES.has(raw.extractionMode) ? raw.extractionMode : ''
    settings.safeSearch = YOU_SAFE_SEARCH_VALUES.has(raw.safeSearch) ? raw.safeSearch : 'moderate'
  }
  if (provider === 'exa') settings.searchType = EXA_SEARCH_TYPE_VALUES.has(raw.searchType) ? raw.searchType : 'auto'
  if (provider === 'perplexity') {
    settings.searchType = PERPLEXITY_SEARCH_TYPE_VALUES.has(raw.searchType) ? raw.searchType : 'web'
    settings.searchContextSize = PERPLEXITY_CONTEXT_VALUES.has(raw.searchContextSize) ? raw.searchContextSize : 'high'
  }
  return settings
}

function rawSettingValues(value) {
  const raw = asObject(value)
  return SETTING_KEYS.reduce((result, key) => {
    if (Object.prototype.hasOwnProperty.call(raw, key)) result[key] = raw[key]
    return result
  }, {})
}

function mergeProviderSettings(existing, next) {
  const merged = { ...asObject(existing) }
  const incoming = rawSettingValues(next)
  for (const [key, value] of Object.entries(incoming)) {
    const empty = value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)
    if (empty) delete merged[key]
    else merged[key] = value
  }
  return merged
}

function domainSetting(value, label) {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[\n,]/) : []
  if (values.length > 50) return { error: label + ' 最多保存 50 个域名' }
  const list = [...new Set(values.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean))]
  if (list.some((item) => item.length > 253 || /[\s/:]/.test(item))) return { error: label + ' 只能填写域名，多个域名用逗号分隔' }
  return { value: list }
}

function normalizeProviderSettings(provider, value) {
  const raw = asObject(value)
  const settings = {}
  if (raw.baseURL !== undefined) {
    const baseURL = typeof raw.baseURL === 'string' ? raw.baseURL.trim() : ''
    if (baseURL.length > 0 && !isAllowedBaseURL(baseURL)) return { ok: false, error: 'API 基址必须是 HTTPS；本机代理可使用 localhost/127.0.0.1 的 HTTP' }
    if (baseURL.length > 0) settings.baseURL = baseURL.replace(/\/+$/, '')
  }
  if (raw.maxResults !== undefined) {
    const maxResults = Number(raw.maxResults)
    if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > MAX_NUM_RESULTS) return { ok: false, error: '结果数量必须是 1 到 ' + MAX_NUM_RESULTS + ' 的整数' }
    settings.maxResults = maxResults
  }
  if (raw.country !== undefined) {
    const country = String(raw.country || '').trim().toUpperCase()
    if (country.length > 0 && !/^[A-Z]{2}$/.test(country)) return { ok: false, error: '国家/地区必须是两位 ISO 代码，例如 US 或 CN' }
    if (country.length > 0) settings.country = country
  }
  if (raw.language !== undefined) {
    const language = String(raw.language || '').trim()
    if (language.length > 0 && !/^[A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8})*$/.test(language)) return { ok: false, error: '语言必须使用语言代码，例如 zh-CN 或 en' }
    if (language.length > 0) settings.language = language
  }
  if (raw.freshness !== undefined) {
    const freshness = String(raw.freshness || '').trim()
    const allowed = provider === 'you' ? YOU_FRESHNESS_VALUES : FRESHNESS_VALUES
    if (freshness.length > 0 && !allowed.has(freshness)) return { ok: false, error: '当前服务不支持该新鲜度选项' }
    if (freshness.length > 0) settings.freshness = freshness
  }
  if (raw.includeDomains !== undefined) {
    const result = domainSetting(raw.includeDomains, '包含域名')
    if (result.error) return { ok: false, error: result.error }
    if (result.value.length > 0) settings.includeDomains = result.value
  }
  if (raw.excludeDomains !== undefined) {
    const result = domainSetting(raw.excludeDomains, '排除域名')
    if (result.error) return { ok: false, error: result.error }
    if (result.value.length > 0) settings.excludeDomains = result.value
  }
  if (provider === 'you' && settings.includeDomains && settings.excludeDomains) return { ok: false, error: 'You.com 不能同时使用包含域名和排除域名' }
  if (provider === 'tavily' && raw.searchDepth !== undefined) {
    const searchDepth = String(raw.searchDepth || '').trim()
    if (searchDepth.length > 0 && !TAVILY_SEARCH_DEPTH_VALUES.has(searchDepth)) return { ok: false, error: 'Tavily 搜索深度选项无效' }
    if (searchDepth.length > 0) settings.searchDepth = searchDepth
  }
  if (provider === 'you') {
    if (raw.extractionMode !== undefined) {
      const extractionMode = String(raw.extractionMode || '').trim()
      if (extractionMode.length > 0 && !YOU_EXTRACTION_VALUES.has(extractionMode)) return { ok: false, error: 'You.com 内容提取选项无效' }
      if (extractionMode.length > 0) settings.extractionMode = extractionMode
    }
    if (raw.safeSearch !== undefined) {
      const safeSearch = String(raw.safeSearch || '').trim()
      if (safeSearch.length > 0 && !YOU_SAFE_SEARCH_VALUES.has(safeSearch)) return { ok: false, error: 'You.com 安全搜索选项无效' }
      if (safeSearch.length > 0) settings.safeSearch = safeSearch
    }
  }
  if (provider === 'exa' && raw.searchType !== undefined) {
    const searchType = String(raw.searchType || '').trim()
    if (searchType.length > 0 && !EXA_SEARCH_TYPE_VALUES.has(searchType)) return { ok: false, error: 'Exa 搜索类型无效' }
    if (searchType.length > 0) settings.searchType = searchType
  }
  if (provider === 'perplexity') {
    if (raw.searchType !== undefined) {
      const searchType = String(raw.searchType || '').trim()
      if (searchType.length > 0 && !PERPLEXITY_SEARCH_TYPE_VALUES.has(searchType)) return { ok: false, error: 'Perplexity 搜索类型无效' }
      if (searchType.length > 0) settings.searchType = searchType
    }
    if (raw.searchContextSize !== undefined) {
      const searchContextSize = String(raw.searchContextSize || '').trim()
      if (searchContextSize.length > 0 && !PERPLEXITY_CONTEXT_VALUES.has(searchContextSize)) return { ok: false, error: 'Perplexity 内容范围选项无效' }
      if (searchContextSize.length > 0) settings.searchContextSize = searchContextSize
    }
  }
  return { ok: true, settings }
}

// 读取当前搜索配置（钥匙只脱敏回显，绝不返回完整钥匙）
export function readSearchConfig(patchPath) {
  if (!patchPath || !existsSync(patchPath)) return { ok: false, error: '找不到 profile 配置文件（cordis.patch.yml）' }
  const rows = parsePatchDocument(patchPath)
  if (!rows) return { ok: false, error: '配置文件解析失败，请检查格式或联系维护者' }
  const webRow = rows.find((r) => r && r.id === 'web')
  const providerRow = rows.find((r) => r && r.id === PATCH_ROW_ID)
  const providerConfig = providerRow && providerRow.config && typeof providerRow.config === 'object' ? providerRow.config : {}
  const provider = webRow && webRow.config && typeof webRow.config.searchProvider === 'string' ? webRow.config.searchProvider : null
  const providerId = isThirdPartyProvider(provider) ? provider : null
  const apiKeysByProvider = Object.fromEntries(THIRD_PARTY_PROVIDER_IDS.map((id) => {
    const key = resolveApiKey(providerConfig, id) || ''
    return [id, { set: key.length > 0, masked: maskedApiKey(key) }]
  }))
  const apiKey = providerId ? (resolveApiKey(providerConfig, providerId) || '') : ''
  const exaKey = resolveApiKey(providerConfig, 'exa') || ''
  const settingsByProvider = Object.fromEntries(THIRD_PARTY_PROVIDER_IDS.map((id) => [id, publicProviderSettings(providerConfig, id)]))
  return {
    ok: true,
    provider: provider || 'deepseek-official',
    providerLabel: PROVIDER_LABELS[provider] || provider || 'DeepSeek',
    apiKeySet: apiKey.length > 0,
    apiKeyMasked: maskedApiKey(apiKey),
    apiKeysByProvider,
    settings: providerId ? settingsByProvider[providerId] : {},
    settingsByProvider,
    // 保留旧字段，便于已安装的旧 client bundle 平滑升级。
    exaKeySet: exaKey.length > 0,
    exaKeyMasked: maskedApiKey(exaKey),
    patchFile: patchPath,
  }
}

// 修改搜索配置：provider（第三方 provider / deepseek-official）+ 可选 apiKey + provider-specific settings
export function writeSearchConfig(patchPath, next) {
  if (!patchPath) return { ok: false, error: '找不到 profile 配置文件（cordis.patch.yml）' }
  const requestedProvider = next && typeof next.provider === 'string' ? next.provider : ''
  const provider = isThirdPartyProvider(requestedProvider) || requestedProvider === 'deepseek-official' ? requestedProvider : 'deepseek-official'
  let doc
  try {
    doc = parse(readFileSync(patchPath, 'utf8'))
  } catch (err) {
    return { ok: false, error: '配置文件解析失败，无法保存' }
  }
  if (!Array.isArray(doc)) return { ok: false, error: '配置文件结构异常，无法保存' }
  const settingsPayload = next && next.settings && typeof next.settings === 'object' && !Array.isArray(next.settings) ? next.settings : null
  let providerRow = doc.find((r) => r && r.id === PATCH_ROW_ID)
  const currentProviderConfig = providerRow && providerRow.config && typeof providerRow.config === 'object' ? providerRow.config : {}
  let normalizedSettings = null
  if (isThirdPartyProvider(provider) && settingsPayload) {
    const mergedSettings = mergeProviderSettings(storedProviderSettings(currentProviderConfig, provider), settingsPayload)
    const result = normalizeProviderSettings(provider, mergedSettings)
    if (!result.ok) return result
    normalizedSettings = result.settings
  }
  let webRow = doc.find((r) => r && r.id === 'web')
  if (!webRow) { webRow = { id: 'web' }; doc.push(webRow); }
  if (!webRow.config || typeof webRow.config !== 'object') webRow.config = {}
  webRow.config.searchProvider = provider
  if (isThirdPartyProvider(provider) && (next && typeof next.apiKey === 'string' && next.apiKey.length > 0 || normalizedSettings)) {
    if (!providerRow) { providerRow = { id: PATCH_ROW_ID }; doc.push(providerRow); }
    if (!providerRow.config || typeof providerRow.config !== 'object') providerRow.config = {}
    if (next && typeof next.apiKey === 'string' && next.apiKey.length > 0) {
      if (!providerRow.config.apiKeys || typeof providerRow.config.apiKeys !== 'object' || Array.isArray(providerRow.config.apiKeys)) providerRow.config.apiKeys = {}
      providerRow.config.apiKeys[provider] = next.apiKey
      // 保留旧版本 Exa 配置格式，支持从旧 bundle 升级后继续使用原钥匙。
      if (provider === 'exa') providerRow.config.apiKey = next.apiKey
    }
    if (normalizedSettings) {
      if (!providerRow.config.providerSettings || typeof providerRow.config.providerSettings !== 'object' || Array.isArray(providerRow.config.providerSettings)) providerRow.config.providerSettings = {}
      providerRow.config.providerSettings[provider] = normalizedSettings
    }
  }
  try {
    writeFileSync(patchPath, stringify(doc) + '\n')
  } catch (err) {
    return { ok: false, error: '配置文件写入失败，请检查文件权限' }
  }
  return { ok: true, provider: provider, settingsSaved: Boolean(normalizedSettings) }
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
  for (const provider of THIRD_PARTY_PROVIDER_IDS) {
    ctx.web.registerSearchProvider(buildSearchProvider(provider, () => resolveProviderOptions(livePluginConfig(config), provider)))
  }

  ctx.inject(['webServer'], function (webCtx) {
    webCtx.effect(function () {
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
  }, 'dsh-song-search: RPC routes')
}

export default { name: 'dsh-song-search', inject: ['web'], apply }
