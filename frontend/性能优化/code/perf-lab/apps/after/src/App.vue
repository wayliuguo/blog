<script setup>
/**
 * SPA 骨架：vue-router（hash 模式）+ 读数上报（优化后）
 * 路由表在 main.js 里是 () => import(...) 的懒加载路由 —— 切到哪个路由才下哪个 chunk；
 * 首屏稳定后在空闲时段把没去过的路由预取下来 —— 分割与预取必须成对做，只做分割是亏的。
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const pending = ref(true)
/** 每条路由首次进入的耗时：after 有 chunk 下载窗口，这是与 before 对照的核心读数之一 */
const timings = {}

router.beforeEach(to => {
    to.meta._t0 = performance.now()
    pending.value = true
})
router.afterEach(to => {
    pending.value = false
    if (!(to.path in timings)) {
        timings[to.path] = Math.round(performance.now() - (to.meta._t0 || performance.now()))
    }
})

const settle = ms => new Promise(r => setTimeout(r, ms))

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

/** 等详情页主图落地再回报：主图是 LCP 元素与 CLS 来源，Slow 3G 下它可能晚到好几秒，
 *  不等的话 payload 打出来时 CLS / LCP 还没结算完，读数是半成品 */
async function waitForHero() {
    const hero = document.querySelector('.hero')
    if (!hero || (hero.complete && hero.naturalWidth)) return
    await Promise.race([
        new Promise(resolve => {
            hero.addEventListener('load', resolve, { once: true })
            hero.addEventListener('error', resolve, { once: true })
        }),
        settle(6000)
    ])
    // 位移要等下一帧布局算完才进 layout-shift 条目
    const nextFrame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r())))
    await nextFrame()
    await nextFrame()
}

onMounted(async () => {
    const t0 = performance.now()
    await router.isReady()
    await waitFor(() => document.querySelector('.view'), 8000)
    const firstViewMs = Math.round(performance.now() - t0)
    // 首屏这一刻的绝对时间点：用它切分「首屏关键路径上下了哪些 JS」，之后的预取不算进去
    const firstViewAt = performance.now()
    const critical = jsResources().filter(r => r.startTime <= firstViewAt)

    // 空闲时把没去过的路由预取下来：切过去时不用再等 chunk
    // 预取抢的是空闲带宽，所以必须等首屏稳定后再开始，不能跟首屏关键路径抢；
    // 懒加载路由的 components.default 就是那个 () => import 函数，调用它即触发下载进缓存
    const idle = window.requestIdleCallback || (fn => setTimeout(fn, 200))
    idle(async () => {
        for (const record of router.getRoutes()) {
            const comp = record.components && record.components.default
            if (typeof comp === 'function') await comp()
        }
    })

    await waitForHero()

    const js = jsResources()
    await Lab.finish({
        firstViewMs,
        criticalJs: critical.length,
        criticalBytes: critical.reduce((sum, r) => sum + r.transferSize, 0),
        jsCount: js.length,
        domNodes: document.querySelectorAll('*').length,
        jsBytes: js.reduce((sum, r) => sum + r.transferSize, 0),
        timings
    })
})
</script>

<template>
    <div class="app">
        <header class="top">
            <nav>
                <router-link to="/dashboard" active-class="active">仪表盘</router-link>
                <router-link to="/list" active-class="active">列表</router-link>
                <router-link to="/detail/1" active-class="active">详情</router-link>
                <router-link to="/report" active-class="active">报表</router-link>
                <router-link to="/about" active-class="active">关于</router-link>
            </nav>
            <span class="badge">路由级分割 + 空闲预取</span>
        </header>
        <main>
            <router-view v-slot="{ Component }">
                <keep-alive>
                    <component :is="Component" />
                </keep-alive>
            </router-view>
            <div v-if="pending" class="pending">路由模块加载中…</div>
        </main>
    </div>
</template>
