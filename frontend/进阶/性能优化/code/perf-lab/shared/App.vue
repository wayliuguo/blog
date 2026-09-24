<script setup>
/**
 * SPA 骨架：hash 路由 + 组件懒加载 + 实验驱动
 * 两个入口共用这个组件，差别只在 main-*.js 传进来的 loaders 是静态还是动态
 */
import { shallowRef, onMounted } from 'vue'
import { flag, q } from './lib/options.js'

const props = defineProps({
    /** 是否走路由级代码分割：main-opt 传 true，main-raw 传 false */
    split: { type: Boolean, default: false },
    /** 路由名 → () => Promise<组件> */
    loaders: { type: Object, required: true }
})

const ROUTES = ['list', 'detail', 'report', 'about']
const view = shallowRef(null)
const route = shallowRef({ name: 'list', param: undefined })
const cache = {}
const timings = {}

window.__spa = window.__spa || {}

function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '')
    const [name, param] = raw.split('/')
    return { name: ROUTES.includes(name) ? name : 'list', param }
}

async function load(name) {
    if (!cache[name]) {
        const t0 = performance.now()
        const mod = await props.loaders[name]()
        timings[name] = Math.round(performance.now() - t0)
        cache[name] = mod && mod.default ? mod.default : mod
    }
    return cache[name]
}

async function apply(r) {
    view.value = null
    view.value = await load(r.name)
    route.value = r
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

/** 只统计脚本资源：dev（/src/**）与 build（/assets/**）两种形态都成立 */
const jsResources = () => performance.getEntriesByType('resource').filter(e => e.initiatorType === 'script')

onMounted(async () => {
    window.addEventListener('hashchange', () => apply(parseHash()))

    const t0 = performance.now()
    apply(parseHash())
    await waitFor(() => document.querySelector('.view'), 8000)
    const firstViewMs = Math.round(performance.now() - t0)
    // 首屏这一刻的绝对时间点：用它切分「首屏关键路径上下了哪些 JS」，之后的预取不算进去
    const firstViewAt = performance.now()
    const critical = jsResources().filter(r => r.startTime <= firstViewAt)

    // 空闲时把没去过的路由预取下来：切过去时不用再等 chunk
    const prefetchOn = props.split && flag('prefetch', true)
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
        firstViewAt,
        criticalJs: critical.length,
        criticalBytes: critical.reduce((sum, r) => sum + r.transferSize, 0),
        jsCount: js.length,
        domNodes: document.querySelectorAll('*').length,
        jsBytes: js.reduce((sum, r) => sum + r.transferSize, 0),
        timings
    })
})

/** 场景脚本通过 ?act= 让页面自己演一遍，再回报；没有 act 时只记空闲期的长任务 */
async function drive() {
    const act = q.get('act')
    const out = {}
    await settle(600)
    // 只统计「这段交互」新增的长任务：Lab.longtasks 是页面从头到尾累积的
    const mark = Lab.longtasks.length
    // 切路由前先等空闲预取跑完，否则测到的是「预取还没结束就切了」的半成品
    if (act === 'nav') await waitFor(() => !window.__spa.prefetchOn || window.__spa.prefetched, 3000)
    if (act === 'nav') {
        const t0 = performance.now()
        location.hash = '#/detail/1'
        await waitFor(() => document.querySelector('[data-route="detail"]'))
        out.navMs = Math.round((await nextFrame()) - t0)
        out.navChunks = jsResources().filter(r => r.startTime >= t0 && r.name.includes('DetailView')).length
    } else if (act === 'cls') {
        // 等主图真的落地：CLS 是「图片到位把内容顶下去」造成的，
        // 图还没到就回报，两个口径都是 0，什么也测不出来
        const img = document.querySelector('.hero')
        if (img) {
            await Promise.race([
                new Promise(resolve => {
                    if (img.complete && img.naturalWidth) return resolve()
                    img.addEventListener('load', resolve, { once: true })
                    img.addEventListener('error', resolve, { once: true })
                }),
                settle(6000)
            ])
            // 位移要等下一帧布局算完才进 layout-shift 条目
            await nextFrame()
            await nextFrame()
        }
        out.imgLoaded = !!(img && img.naturalWidth)
    } else if (act === 'agg') {
        const btn = document.querySelector('[data-act="agg"]')
        if (btn) {
            const t0 = performance.now()
            btn.click()
            // 派发事件 → 下一帧画完，这就是 INP 的口径（无头环境没有真实输入，用这个近似）
            out.aggMs = Math.round((await nextFrame()) - t0)
        }
    } else if (act === 'images') {
        // 等这批图落地（能落的都落了）再回报：`loading="lazy"` 的那些可能永远不落，
        // 所以给一个上限，超时就按「此刻已加载多少」计数 —— 这本身就是这个 case 的读数
        const imgs = [...document.querySelectorAll('.shots img')]
        const loaded = i => i.complete && i.naturalWidth > 0
        const landed = img =>
            Promise.race([
                new Promise(resolve => {
                    if (loaded(img)) return resolve()
                    img.addEventListener('load', resolve, { once: true })
                    img.addEventListener('error', resolve, { once: true })
                }),
                settle(3000)
            ])
        await Promise.all(imgs.map(landed))
        // 主图（首屏那张，本地静态 SVG，开发机瞬间下完）也必须等：不等的话，
        // 「全部立即加载」那一版图集几十毫秒就下完、立刻上报，而主图还没画出来 ——
        // LCP 就记成了图集里那张，两版的观测窗口不一样，LCP 的差就成了测量假象
        const hero = document.querySelector('.hero')
        if (hero) await landed(hero)
        await nextFrame()
        await nextFrame()
        out.imgTotal = imgs.length
        out.imgDecoded = imgs.filter(loaded).length
    } else if (act === 'scroll') {
        const vp = document.querySelector('.viewport') || document.scrollingElement
        const t0 = performance.now()
        for (let i = 0; i < 30; i++) {
            vp.scrollTop = i * 120
            await nextFrame()
        }
        out.scrollMs = Math.round(performance.now() - t0)
    } else if (window.__spa.exp && typeof window.__spa.exp[act] === 'function') {
        // 手动对照实验（rerender / banner / font / anim）：面板与读数都在各自的视图里，
        // 这里只负责触发它、把读数收进这次回报
        Object.assign(out, await window.__spa.exp[act]())
    }

    const added = Lab.longtasks.slice(mark)
    out.newTasks = added.length
    out.longestTask = Math.round(Math.max(0, ...added.map(t => t.duration)))
    out.rowsAfter = document.querySelectorAll('.row').length
    return out
}
</script>

<template>
    <div class="app">
        <header class="top">
            <nav>
                <a href="#/list">列表</a>
                <a href="#/detail/1">详情</a>
                <a href="#/report">报表</a>
                <a href="#/about">关于</a>
            </nav>
            <span class="badge">{{ split ? '路由级分割' : '全量打包' }}</span>
        </header>
        <main>
            <div v-if="!view" class="pending">路由模块加载中…</div>
            <component v-else :is="view" />
        </main>
    </div>
</template>
