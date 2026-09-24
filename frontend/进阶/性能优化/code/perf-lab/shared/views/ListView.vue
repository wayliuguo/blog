<script setup>
/**
 * 列表路由：2000 条订单
 * 几个开关决定它是「全量渲染 + 同步计算 + 每次滚动都读写布局」
 * 还是「虚拟滚动 + 分片计算 / Worker + rAF 节流」
 *
 * ?act=rerender 与 ?act=banner 时这个页面换成另外两块实验面板：
 *   rerender  3.3 框架层：一次「与列表无关的状态更新」之后，有多少行被无谓地重新渲染了
 *   banner    4.3 动态内容：一条晚到的公告插到内容上方，会不会把下面整片顶下去
 * 两块面板都把读数挂到 window.__spa.exp，由页面侧统一回报/打到控制台
 */
import { ref, computed, onMounted, onUnmounted, h, defineComponent } from 'vue'
import { makeItems, heavyAggregate, sliceAggregate } from '../lib/store.js'
import { flag, q, N, ROW_H } from '../lib/options.js'

const act = q.get('act')
const mode = act === 'rerender' || act === 'banner' ? act : 'normal'

const virtual = flag('virtual', true)
const slice = flag('slice', true)
const throttle = flag('throttle', true)
const useWorker = flag('worker', true)

/** banner 面板的列表长度固定 200：这块实验的变量是「有没有预留位置」，不是列表多长 */
const BANNER_ROWS = 200
const items = ref(makeItems(mode === 'banner' ? BANNER_ROWS : N))
const rowsShown = ref(0)
const aggMs = ref(0)
const offset = ref(0)
const start = ref(0)
const vp = ref(null)
const visibleCount = 14

const visible = computed(() => items.value.slice(start.value, start.value + visibleCount))
const aggLabel = computed(() => (useWorker ? 'Worker 计算' : slice ? '分片计算' : '同步计算'))

/** 未节流：每个 scroll 事件都读一次布局（读写交错），滚动时主线程被占死
 *  节流：一帧只算一次，且只在 rAF 里读 */
let scheduled = false
function onScroll() {
    if (!throttle) {
        const top = vp.value.scrollTop
        const h = vp.value.offsetHeight // 故意的：写完就读，强制同步布局
        start.value = Math.floor(top / ROW_H)
        offset.value = start.value * ROW_H
        void h
        return
    }
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
        scheduled = false
        start.value = Math.floor(vp.value.scrollTop / ROW_H)
        offset.value = start.value * ROW_H
    })
}

/** 全量渲染时滚动的是整个文档：这里的两种写法差别最明显
 *  未节流：每一行都「写完就读」一次 → 2000 行就是 2000 次强制同步布局
 *  节流：一帧只读一次滚动位置，然后只写一次，不逐行读 */
function onWindowScroll() {
    if (throttle) {
        if (scheduled) return
        scheduled = true
        requestAnimationFrame(() => {
            scheduled = false
            document.documentElement.style.setProperty('--scroll-y', String(window.scrollY))
        })
        return
    }
    for (const el of document.querySelectorAll('.row')) {
        el.style.transform = `translateX(${el.offsetTop % 3}px)`
    }
}

/** Worker 懒创建：只有真的用 worker 这一档才把 worker chunk 拉下来 */
let worker = null
function aggregateInWorker(list) {
    worker =
        worker ||
        new Worker(new URL('../lib/agg-worker.js', import.meta.url), {
            type: 'module'
        })
    return new Promise(resolve => {
        worker.onmessage = e => resolve(e.data)
        worker.postMessage({ items: list })
    })
}

/**
 * 三档对照必须「只有计算发生在哪」这一个变量：
 * 同步 / 分片都在主线程上跑完，Worker 档整段（含内部那次排序）都在 worker 里跑完，
 * 主线程只出一次结构化克隆。所以这里不预排、不回写 items —— 回写就等于给 Worker 档
 * 也塞一段主线程排序，测出来的是「两个变量混在一起」。
 */
async function onAgg() {
    const t0 = performance.now()
    if (useWorker) {
        const out = await aggregateInWorker(items.value)
        window.__spa.agg = out.result
        window.__spa.aggWorkerMs = out.ms
    } else if (slice) {
        window.__spa.agg = await sliceAggregate(items.value)
    } else {
        window.__spa.agg = heavyAggregate(items.value)
    }
    aggMs.value = Math.round(performance.now() - t0)
}

/* ------------------------------------------------------------------ *
 * 3.3 框架层：一次交互之后，有多少行被「无谓地」重新渲染了
 *     两个开关各自只改一件事，可以分开对照：
 *       key=idx | id    行组件的 key 稳不稳定
 *       sink=0 | 1      那个「与列表无关」的状态有没有下沉
 * ------------------------------------------------------------------ */
const keyStable = q.get('key') !== 'idx'
const sink = q.get('sink') === '1'
const rrRows = ref(makeItems(200).map(it => ({ ...it })))
const rrSeed = ref(1000)
const tick = ref(0)
/** 非响应式的渲染计数器：它是在渲染函数里自增的，挂在 ref 上会变成「渲染中改响应式数据」→ 递归更新 */
const rrStats = { renders: 0 }
const rrShown = ref(0)

/**
 * 行组件手写 render：只有手写才能在「每次渲染」这个点上打计数
 * props 里的 tick 就是那个「与列表无关」的状态 —— 传下来，这一行的重渲染就由它决定
 */
const RowItem = defineComponent({
    props: {
        it: { type: Object, required: true },
        tick: { type: Number, default: 0 }
    },
    setup(props) {
        return () => {
            rrStats.renders += 1
            const tail = sink ? `${props.it.score}` : `${props.it.score} · t${props.tick}`
            return h('div', { class: 'row' }, [
                h('b', props.it.name),
                h('span', '¥' + props.it.price),
                h('i', props.it.tag),
                h('em', tail)
            ])
        }
    }
})

/** sink=1 时那个无关状态交给一个独立小组件：它变一次，只有它自己重渲染 */
const TickBadge = defineComponent({
    props: { tick: { type: Number, default: 0 } },
    setup(props) {
        return () => h('div', { class: 'fx-tick' }, `与列表无关的状态 tick = ${props.tick}`)
    }
})

const raf = () => new Promise(r => requestAnimationFrame(r))
/** 到「下一帧画完」：INP 的口径就是事件到下一帧，这里用双 rAF 近似 */
const nextFrame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(performance.now()))))
const settle = (ms = 200) => new Promise(r => setTimeout(r, ms))

/** 插入与「无关状态」的更新都做成独立函数：手动浏览时点按钮，自动跑时由 exp 调 */
function insertOne() {
    rrSeed.value += 1
    rrRows.value.unshift({
        id: rrSeed.value,
        name: `订单 ${rrSeed.value}`,
        price: '9.9',
        tag: '加急',
        score: 1
    })
}
function bumpTick() {
    tick.value += 1
}

/** 4.3 动态内容：reserve=1 时先给公告留好位置（min-height），内容晚到也只是填空 */
const reserve = q.get('reserve') === '1'
const bannerOn = ref(false)

window.__spa.exp = {
    /** 头部插入一条 + 改一次无关状态，分别看有多少行跟着渲染 */
    async rerender() {
        const out = { key: keyStable ? 'id' : 'index', sink, rows: rrRows.value.length }
        const before = rrStats.renders

        let t0 = performance.now()
        insertOne()
        await nextFrame()
        out.insertMs = Math.round(performance.now() - t0)
        out.rendersOnInsert = rrStats.renders - before

        const mid = rrStats.renders
        t0 = performance.now()
        bumpTick()
        await nextFrame()
        out.tickMs = Math.round(performance.now() - t0)
        out.rendersOnTick = rrStats.renders - mid
        out.rendersTotal = rrStats.renders
        rrShown.value = rrStats.renders
        return out
    },

    /** 等 300ms（等价于接口慢）再把公告插进预留位/非预留位 */
    async banner() {
        const out = { reserve, rows: items.value.length }
        const head = () => document.querySelector('.fx-anchor')
        out.topBefore = head() ? Math.round(head().getBoundingClientRect().top) : 0
        await settle(300)
        bannerOn.value = true
        await nextFrame()
        await nextFrame()
        out.topAfter = head() ? Math.round(head().getBoundingClientRect().top) : 0
        out.pushed = out.topAfter - out.topBefore
        out.bannerH = document.querySelector('.fx-banner') ? document.querySelector('.fx-banner').offsetHeight : 0
        return out
    }
}

onMounted(() => {
    rowsShown.value = document.querySelectorAll('.row').length
    window.__spa.rows = rowsShown.value
    if (!virtual) window.addEventListener('scroll', onWindowScroll, { passive: true })
})

onUnmounted(() => {
    if (!virtual) window.removeEventListener('scroll', onWindowScroll)
})
</script>

<template>
    <!-- 3.3 框架层：重渲染计数面板 -->
    <section v-if="mode === 'rerender'" class="view" data-route="list">
        <div class="bar">
            <button data-act="insert" @click="insertOne">在头部插入一条</button>
            <button data-act="tick" @click="bumpTick">改一次「与列表无关」的状态</button>
            <span class="meta">
                key = {{ keyStable ? 'id（稳定）' : 'index（不稳定）' }} · 无关状态{{ sink ? '已下沉' : '未下沉' }} · 行组件渲染
                {{ rrShown }} 次
            </span>
        </div>
        <TickBadge v-if="sink" :tick="tick" />
        <div class="rows">
            <RowItem v-for="(it, i) in rrRows" :key="keyStable ? it.id : i" :it="it" :tick="sink ? 0 : tick" />
        </div>
    </section>

    <!-- 4.3 动态内容：晚到的公告条 -->
    <section v-else-if="mode === 'banner'" class="view" data-route="list">
        <div class="bar">
            <span class="meta">
                公告位 {{ reserve ? '已预留 min-height' : '没有预留位置' }} · 内容晚到 300ms 后插入
            </span>
        </div>
        <div class="fx-slot" :class="{ 'fx-reserved': reserve }">
            <div v-if="bannerOn" class="fx-banner">公告 · 这条内容是「晚到」的</div>
        </div>
        <div class="fx-anchor">↓ 公告位以下的内容（下面这一整片会被顶下去）</div>
        <div class="rows">
            <div v-for="it in items" :key="it.id" class="row">
                <b>{{ it.name }}</b><span>¥{{ it.price }}</span><i>{{ it.tag }}</i><em>{{ it.score }}</em>
            </div>
        </div>
    </section>

    <section v-else class="view" data-route="list">
        <div class="bar">
            <button data-act="agg" @click="onAgg">跑一次全量聚合（{{ aggLabel }}）</button>
            <span class="meta">{{ items.length }} 条 · 实际渲染 {{ rowsShown }} 行 · 聚合 {{ aggMs }} ms</span>
        </div>
        <div v-if="!virtual" class="rows">
            <div v-for="it in items" :key="it.id" class="row">
                <b>{{ it.name }}</b><span>¥{{ it.price }}</span><i>{{ it.tag }}</i><em>{{ it.score }}</em>
            </div>
        </div>
        <div v-else class="viewport" ref="vp" @scroll.passive="onScroll">
            <div class="total" :style="{ height: items.length * ROW_H + 'px' }">
                <div class="rows" :style="{ transform: 'translateY(' + offset + 'px)' }">
                    <div v-for="it in visible" :key="it.id" class="row">
                        <b>{{ it.name }}</b><span>¥{{ it.price }}</span><i>{{ it.tag }}</i><em>{{ it.score }}</em>
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>
