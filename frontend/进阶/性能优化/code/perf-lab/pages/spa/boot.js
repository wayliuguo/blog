/**
 * SPA 骨架：hash 路由 + 组件懒加载 + 实验驱动
 * 两个入口（app.js / app-opt.js）共用这里，差别只在传进来的 loaders 是静态还是动态
 */
import { createApp, ref } from '/vendor/vue.js'
import { q, flag } from './options.js'

window.__spa = window.__spa || {}

const ROUTES = ['list', 'detail', 'about']

function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '')
    const [name, param] = raw.split('/')
    return { name: ROUTES.includes(name) ? name : 'list', param }
}

const settle = ms => new Promise(r => setTimeout(r, ms))
/** 等到「下一帧画完」：INP 的口径就是事件到下一帧，这里用它做近似 */
const nextFrame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(performance.now()))))

async function waitFor(fn, timeout = 8000) {
    const t0 = performance.now()
    while (performance.now() - t0 < timeout) {
        if (fn()) return true
        await settle(50)
    }
    return false
}

const jsResources = () =>
    performance.getEntriesByType('resource').filter(e => e.name.includes('/spa/') || e.name.includes('/vendor/'))

export async function mount({ loaders, split }) {
    const cache = {}
    const timings = {}

    async function load(name) {
        if (!cache[name]) {
            const t0 = performance.now()
            const mod = await loaders[name]()
            timings[name] = Math.round(performance.now() - t0)
            cache[name] = mod && mod.default ? mod.default : mod
        }
        return cache[name]
    }

    const App = {
        template: `
        <div class="app">
            <header class="top">
                <nav>
                    <a href="#/list">列表</a>
                    <a href="#/detail/1">详情</a>
                    <a href="#/about">关于</a>
                </nav>
                <span class="badge">{{ split ? '路由级分割' : '全量打包' }}</span>
            </header>
            <main>
                <div v-if="!view" class="pending">路由模块加载中…</div>
                <component v-else :is="view" />
            </main>
        </div>`,
        setup() {
            const view = ref(null)
            const route = ref(parseHash())
            async function apply(r) {
                view.value = null
                view.value = await load(r.name)
                route.value = r
            }
            window.addEventListener('hashchange', () => apply(parseHash()))
            apply(route.value)
            return { view, route, split }
        }
    }

    // Service Worker 单独开关，不跟着 opt 走：它要单独做「二次访问」对照
    if (flag('sw', false)) {
        navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    const t0 = performance.now()
    createApp(App).mount('#app')
    await waitFor(() => document.querySelector('.view'), 8000)
    const firstViewMs = Math.round(performance.now() - t0)
    // 首屏这一刻的绝对时间点：用它切分「首屏关键路径上下了哪些 JS」，之后的预取不算进去
    const firstViewAt = performance.now()
    const critical = jsResources().filter(r => r.startTime <= firstViewAt)

    // 空闲时把没去过的路由预取下来：切过去时不用再等 chunk
    const prefetchOn = split && flag('prefetch', true)
    window.__spa.prefetchOn = prefetchOn
    if (prefetchOn) {
        const idle = window.requestIdleCallback || (fn => setTimeout(fn, 200))
        idle(async () => {
            for (const name of ROUTES) if (!cache[name]) await load(name)
            window.__spa.prefetched = ROUTES.filter(n => timings[n] !== undefined)
        })
    }

    const extra = await drive()
    const js = jsResources()
    await Lab.finish({
        ...extra,
        firstViewMs,
        criticalJs: critical.length,
        criticalBytes: critical.reduce((sum, r) => sum + r.transferSize, 0),
        jsCount: js.length,
        domNodes: document.querySelectorAll('*').length,
        jsBytes: js.reduce((sum, r) => sum + r.transferSize, 0),
        timings
    })
}

/** 场景脚本通过 ?act= 让页面自己演一遍，再回报 */
async function drive() {
    const act = q.get('act')
    const out = {}
    if (!act) return out
    await settle(600)
    // 切路由前先等空闲预取跑完，否则测到的是「预取还没结束就切了」的半成品
    if (act === 'nav') await waitFor(() => !window.__spa.prefetchOn || window.__spa.prefetched, 3000)

    // 只统计「这段交互」新增的长任务：Lab.longtasks 是页面从头到尾累积的
    const mark = Lab.longtasks.length
    if (act === 'nav') {
        const t0 = performance.now()
        location.hash = '#/detail/1'
        await waitFor(() => document.querySelector('[data-route="detail"]'))
        out.navMs = Math.round((await nextFrame()) - t0)
        out.navChunks = jsResources().filter(r => r.startTime >= t0 && r.name.includes('/routes/')).length
    } else if (act === 'sort') {
        const btn = document.querySelector('[data-act="sort"]')
        if (btn) {
            const t0 = performance.now()
            btn.click()
            // 派发事件 → 下一帧画完，这就是 INP 的口径（无头环境没有真实输入，用这个近似）
            out.sortMs = Math.round((await nextFrame()) - t0)
            out.sortRows = document.querySelectorAll('.row').length
        }
    } else if (act === 'scroll') {
        const vp = document.querySelector('.viewport') || document.scrollingElement
        const t0 = performance.now()
        for (let i = 0; i < 30; i++) {
            vp.scrollTop = i * 120
            await nextFrame()
        }
        out.scrollMs = Math.round(performance.now() - t0)
    }

    const added = Lab.longtasks.slice(mark)
    out.newTasks = added.length
    out.longestTask = Math.round(Math.max(0, ...added.map(t => t.duration)))
    return out
}
