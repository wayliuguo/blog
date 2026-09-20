// mini-micro 调度器：注册 → 路由命中 → HTML entry → 沙箱执行 → 生命周期调度 → 预加载
const { createAppSandbox } = require('./sandbox.cjs')
const { parseHtmlEntry, scopeStyle } = require('./entry.cjs')

function matchRoute(activeRule, path) {
    return path === activeRule || path.startsWith(activeRule + '/')
}

class MiniMicro {
    constructor({ fetch, sharedGlobal }) {
        this.apps = new Map()
        this.cache = new Map() // url -> 内容；预加载与去重的落点
        this.fetchCount = 0
        this.active = null
        this.fetch = fetch
        this.sharedGlobal = sharedGlobal
    }

    register(def) {
        // def: { name, entry, activeRule, props }
        this.apps.set(def.name, def)
    }

    load(url) {
        // 同一个 url 全生命周期只走一次"网络"，命中缓存 0 开销
        if (this.cache.has(url)) return this.cache.get(url)
        this.fetchCount++
        const content = this.fetch(url)
        this.cache.set(url, content)
        return content
    }

    preload(appName) {
        // 预加载：只抓资源不执行，路由命中时全部命中缓存
        const def = this.apps.get(appName)
        const { scripts } = parseHtmlEntry(this.load(def.entry))
        for (const url of scripts) this.load(url)
    }

    start(appName, container) {
        const def = this.apps.get(appName)
        const html = this.load(def.entry)
        const { scripts, styles } = parseHtmlEntry(html)
        const sandbox = createAppSandbox(appName, this.sharedGlobal)
        for (const css of styles) container.styles.push(scopeStyle(css, `[data-app=${appName}]`))
        for (const url of scripts) {
            // 子应用代码在沙箱里执行；with(window) 让裸标识符也走 Proxy（micro-app 同款）
            new Function('window', 'with(window){' + this.load(url) + '}')(sandbox.proxy)
        }
        sandbox.proxy.bootstrap()
        sandbox.proxy.mount({ container, props: def.props || {} })
        this.active = { name: appName, sandbox, container }
        return this.active
    }

    stop() {
        const { name, sandbox } = this.active
        sandbox.proxy.unmount()
        sandbox.cleanup() // 副作用清账 + 撤销沙箱属性
        this.active = null
        return name
    }
}

module.exports = { MiniMicro, matchRoute }
