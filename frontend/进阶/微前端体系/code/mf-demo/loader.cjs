// 远程模块加载流程模拟：清单(manifest) → 解析依赖 → 逐个拉取 JS → 缓存
// 用一个对象假装 CDN，数"发了几次网络请求"，看缓存与去重的效果
const network = {
  'manifest/appA.json': { entry: 'appA.js', exposes: { './Button': 'appA-button.js' } },
  'manifest/appB.json': { entry: 'appB.js', exposes: { './Card': 'appB-card.js' } },
  'appA.js': 'register("appA")',
  'appB.js': 'register("appB")',
  'appA-button.js': 'define("appA/Button")',
  'appB-card.js': 'define("appB/Card")',
  'shared-react.js': 'define("react")',
}

function createLoader() {
  const cache = new Map()
  let fetchCount = 0

  function fetch(url) {
    fetchCount++
    return network[url]
  }

  function loadManifest(app) {
    const manifest = fetch(`manifest/${app}.json`)
    if (!manifest) throw new Error(`manifest not found: ${app}`)
    return manifest
  }

  function loadModule(url) {
    // 先查缓存：同一个 url 全生命周期只拉一次
    if (cache.has(url)) return { url, fromCache: true, code: cache.get(url) }
    const code = fetch(url)
    if (!code) throw new Error(`module not found: ${url}`)
    cache.set(url, code)
    return { url, fromCache: false, code }
  }

  function stats() {
    return { fetchCount, cached: cache.size }
  }

  return { loadManifest, loadModule, stats }
}

module.exports = { createLoader }
