// dsh-song-search — 测试入口：静态安全断言 + 纯函数断言（零真实网络、零真实钥匙）
// 覆盖：搜索结果映射、钥匙解析、搜索配置读写（临时文件）、安全静态检查
import { readFileSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)))
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const retiredRuntime = ['@deepseek-ai', 'dsh-client-' + 'runtime'].join('/')
const src = readFileSync(join(root, 'src', 'host.js'), 'utf8')
const clientSrc = readFileSync(join(root, 'src', 'client-bundle.js'), 'utf8')

let pass = 0
let fail = 0
const failures = []
function check(name, actual, expected) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) { pass++ } else {
    fail++
    failures.push(`${name}: 期望 ${JSON.stringify(expected)} 实际 ${JSON.stringify(actual)}`)
  }
}

check('alpha.4 client inject removes retired runtime', pkg.dsh.client.inject.includes(retiredRuntime), false)
check('alpha.4 client injects settings module', pkg.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-settings'), true)
check('alpha.4 client injects general settings module', pkg.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-settings-general'), true)
await import(join(root, 'tests', 'test-alpha4-client-contract.mjs'))

// ---- 纯函数断言 ----
const {
  mapExaResults,
  mapBraveResults,
  mapTavilyResults,
  mapSerperResults,
  buildSearchProvider,
  resolveApiKey,
  readSearchConfig,
  writeSearchConfig,
} = await import(join(root, 'lib', 'index.js'))

// mapExaResults：正常映射
const mapped = mapExaResults({ results: [
  { url: 'https://a.example', title: '标题A', text: '摘要A' },
  { url: 'https://b.example', title: '' },
  { url: '' },
  { title: '无URL' },
] })
check('mapExaResults 映射 url/title/snippet', mapped.sources.length, 2)
check('mapExaResults 首条完整', mapped.sources[0].url === 'https://a.example' && mapped.sources[0].title === '标题A' && mapped.sources[0].snippet === '摘要A', true)
check('mapExaResults 空 title 不输出 title 字段', 'title' in mapped.sources[1], false)
check('mapExaResults 空结果', mapExaResults({}).sources.length, 0)
check('mapExaResults 非法输入', mapExaResults(null).sources.length, 0)
check('mapExaResults truncated 恒 false', mapped.truncated, false)

const braveMapped = mapBraveResults({ web: { results: [{ url: 'https://brave.example', title: 'Brave', description: '描述', extra_snippets: ['补充'] }] } })
check('mapBraveResults 映射 web.results', braveMapped.sources[0].url === 'https://brave.example' && braveMapped.sources[0].snippet === '描述 补充', true)
const tavilyMapped = mapTavilyResults({ results: [{ url: 'https://tavily.example', title: 'Tavily', content: '内容' }] })
check('mapTavilyResults 映射 results', tavilyMapped.sources[0].title === 'Tavily' && tavilyMapped.sources[0].snippet === '内容', true)
const serperMapped = mapSerperResults({ organic: [{ link: 'https://serper.example', title: 'Serper', snippet: '摘要' }] })
check('mapSerperResults 映射 organic', serperMapped.sources[0].url === 'https://serper.example' && serperMapped.sources[0].snippet === '摘要', true)

// resolveApiKey：只认 config.apiKey 或 EXA_API_KEY，绝不打印
check('resolveApiKey config 优先', resolveApiKey({ apiKey: 'sk-config' }), 'sk-config')
check('resolveApiKey 支持 provider 独立钥匙', resolveApiKey({ apiKeys: { brave: 'brave-config' } }, 'brave'), 'brave-config')
check('resolveApiKey 无 key → null', resolveApiKey({}), null)

// provider 请求契约：只 mock fetch，不访问真实服务商
const originalFetch = globalThis.fetch
const calls = []
globalThis.fetch = async function (url, options) {
  calls.push({ url: String(url), options })
  const body = String(url).includes('brave')
    ? { web: { results: [{ url: 'https://brave.example', title: 'Brave', description: '结果' }] } }
    : String(url).includes('tavily')
      ? { results: [{ url: 'https://tavily.example', title: 'Tavily', content: '结果' }] }
      : { organic: [{ link: 'https://serper.example', title: 'Serper', snippet: '结果' }] }
  return { ok: true, status: 200, async json() { return body } }
}
try {
  const braveProvider = buildSearchProvider('brave', () => ({ apiKey: 'brave-test-key', baseURL: 'https://api.search.brave.com/res/v1' }))
  const tavilyProvider = buildSearchProvider('tavily', () => ({ apiKey: 'tavily-test-key', baseURL: 'https://api.tavily.com' }))
  const serperProvider = buildSearchProvider('serper', () => ({ apiKey: 'serper-test-key', baseURL: 'https://google.serper.dev' }))
  check('Brave provider 可用性', braveProvider.available(), true)
  check('Brave provider 请求契约', (await braveProvider.search({ query: 'hello', maxResults: 3 })).sources[0].url === 'https://brave.example', true)
  check('Tavily provider 请求契约', (await tavilyProvider.search({ query: 'hello', maxResults: 3 })).sources[0].url === 'https://tavily.example', true)
  check('Serper provider 请求契约', (await serperProvider.search({ query: 'hello', maxResults: 3 })).sources[0].url === 'https://serper.example', true)
  check('Brave 使用 GET 与专用 header', calls[0].options.method === 'GET' && calls[0].options.headers['x-subscription-token'] === 'brave-test-key' && !calls[0].url.includes('brave-test-key'), true)
  check('Tavily 使用 Bearer header', calls[1].options.method === 'POST' && calls[1].options.headers.authorization === 'Bearer tavily-test-key', true)
  check('Serper 使用 X-API-KEY header', calls[2].options.method === 'POST' && calls[2].options.headers['x-api-key'] === 'serper-test-key', true)
} finally {
  globalThis.fetch = originalFetch
}

// ---- 搜索配置读写（临时文件，不碰真实配置）----
const tmpDir = mkdtempSync(join(tmpdir(), 'dsh-song-search-test-'))
const patchFile = join(tmpDir, 'cordis.patch.yml')
writeFileSync(patchFile, [
  '# test patch',
  '- id: web',
  '  config:',
  '    searchProvider: exa',
  '- id: dsh-song-search',
  '  config:',
  "    apiKey: 'test-key-1234567890'",
  '',
].join('\n'))

const read1 = readSearchConfig(patchFile)
check('readSearchConfig 读取 provider=exa', read1.provider, 'exa')
check('readSearchConfig 钥匙已设置', read1.exaKeySet, true)
check('readSearchConfig 钥匙脱敏（不含完整钥匙）', read1.exaKeyMasked.includes('test-key-1234567890'), false)
check('readSearchConfig 钥匙脱敏格式', read1.exaKeyMasked, 'test****7890')

const w1 = writeSearchConfig(patchFile, { provider: 'deepseek-official' })
check('writeSearchConfig 切回 DeepSeek ok', w1.ok, true)
check('writeSearchConfig 切回 DeepSeek 生效', readSearchConfig(patchFile).provider, 'deepseek-official')

const w2 = writeSearchConfig(patchFile, { provider: 'exa', apiKey: 'test-new-key-abcdefghij' })
check('writeSearchConfig 切回 Exa 并更新钥匙 ok', w2.ok, true)
const read2 = readSearchConfig(patchFile)
check('writeSearchConfig Exa 生效', read2.provider, 'exa')
check('writeSearchConfig 新钥匙生效', read2.exaKeySet, true)
check('writeSearchConfig 新钥匙脱敏', read2.exaKeyMasked, 'test****ghij')

const w3 = writeSearchConfig(patchFile, { provider: 'brave', apiKey: 'brave-key-abcdefghij' })
check('writeSearchConfig Brave ok', w3.ok, true)
const read3 = readSearchConfig(patchFile)
check('writeSearchConfig Brave 生效', read3.provider, 'brave')
check('writeSearchConfig Brave 钥匙已设置', read3.apiKeySet, true)
check('writeSearchConfig Brave 钥匙脱敏', read3.apiKeyMasked, 'brav****ghij')
const savedDoc = parse(readFileSync(patchFile, 'utf8'))
const savedProviderRow = savedDoc.find((r) => r && r.id === 'dsh-song-search')
check('writeSearchConfig 按服务商分开保存钥匙', savedProviderRow.config.apiKeys.brave, 'brave-key-abcdefghij')

rmSync(tmpDir, { recursive: true, force: true })

// ---- 静态安全断言 ----
check('源码无 token 打印', /console\.(log|warn|error)[^;]*(apiKey|token|Bearer)/.test(src), false)
check('源码无密钥字面量', /sk-[A-Za-z0-9]{16,}/.test(src), false)
check('源码零 @deepseek-ai 依赖', src.includes('@deepseek-ai/'), false)
check('注册 Exa/Brave/Tavily/Serper', ['exa', 'brave', 'tavily', 'serper'].every((id) => src.includes(id)), true)
check('调用 Exa 官方端点', src.includes("https://api.exa.ai"), true)
check('调用 Brave 官方端点', src.includes("https://api.search.brave.com/res/v1"), true)
check('调用 Tavily 官方端点', src.includes("https://api.tavily.com"), true)
check('调用 Serper 官方端点', src.includes("https://google.serper.dev"), true)
check('钥匙来自配置或各服务商环境变量', src.includes('config.apiKey') && src.includes('EXA_API_KEY') && src.includes('BRAVE_SEARCH_API_KEY') && src.includes('TAVILY_API_KEY') && src.includes('SERPER_API_KEY'), true)
check('可用性检查钥匙存在', src.includes('available()') && src.includes('options.apiKey'), true)
check('RPC 前缀正确', src.includes("ROUTE_PREFIX = '/_dsh/dsh-song-search'"), true)
check('修改类 RPC 同源防护', src.includes('sameOrigin(req)') && src.includes('requires POST'), true)
check('RPC 不返回完整钥匙', src.includes('exaKeyMasked') && src.includes('slice(0, 4)'), true)
check('配置写入用 yaml 库', src.includes("from 'yaml'") && src.includes('stringify(doc)'), true)
check('客户端设置页名为搜索服务', clientSrc.includes("'搜索服务'"), true)
check('客户端有五个搜索商选项', ['deepseek-official', 'exa', 'brave', 'tavily', 'serper'].every((id) => clientSrc.includes("'" + id + "'")), true)
check('客户端钥匙支持安全输入框', clientSrc.includes("isKeyVisible ? 'text' : 'password'"), true)
check('客户端返回设置页 disposer，避免登记失效', /return function \(\) \{[\s\S]*if \(dispose\) dispose\(\);[\s\S]*if \(removeStyles\) removeStyles\(\);/.test(clientSrc), true)

console.log(`dsh-song-search tests: ${pass} PASS / ${fail} FAIL`)
if (failures.length > 0) console.log(failures.join('\n'))
process.exit(fail > 0 ? 1 : 0)
