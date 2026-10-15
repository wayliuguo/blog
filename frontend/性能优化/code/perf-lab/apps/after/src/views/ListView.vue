<script setup>
/**
 * 列表路由（优化后实现）：2000 条订单
 * 与 before 项目逐层对照，运行层三件事在这一版都换成了优化写法：
 *   聚合   —— 搬进 Worker（src/lib/agg-worker.js 单独成 chunk），主线程只发消息收结果；
 *             数据量再小一档时，可用 store.js 里的 MessageChannel 分片版 sliceAggregate
 *   滚动   —— 虚拟滚动（只渲染窗口内 14 行）+ rAF 合帧（一帧只读一次滚动位置）
 *   重渲染 —— 行 key 用稳定 id、「与列表无关的状态」下沉到独立小组件
 * 公告位先预留 min-height：晚到的公告只是填空，不产生位移
 */
import { ref, computed, onMounted, h, defineComponent } from 'vue'
import { makeItems } from '../lib/store.js'

/** 行高，虚拟滚动按它算偏移 */
const ROW_H = 36

const items = ref(makeItems(2000))
const rowsShown = ref(0)
const aggMs = ref(0)
const offset = ref(0)
const start = ref(0)
const vp = ref(null)
const visibleCount = 14

const visible = computed(() => items.value.slice(start.value, start.value + visibleCount))

/* ------------------------------------------------------------------ *
 * 聚合搬进 Worker：主线程只负责发一条消息、收一条结果
 * Worker 懒创建：第一次点击才把 agg-worker chunk 拉下来
 * ------------------------------------------------------------------ */
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

async function onAgg() {
    // 聚合对 10000 条数据跑（列表本身 2000 条，数据量故意更大，2000 条量不出长任务）
    const list = makeItems(10000)
    const t0 = performance.now()
    const out = await aggregateInWorker(list)
    aggMs.value = Math.round(performance.now() - t0)
    console.info('[perf-lab] 聚合对照', {
        impl: 'worker',
        mainThreadMs: aggMs.value,
        workerMs: out.ms
    })
}

/* ------------------------------------------------------------------ *
 * 重渲染：与 before 版对照的两个优化写法
 *   key 用稳定 id —— 头部插入只影响新行，已有行的 key 不错位，不重建
 *   状态下沉 —— tick 交给独立小组件 TickBadge，它一变只有它自己重渲染
 * ------------------------------------------------------------------ */
const tick = ref(0)
const stats = { renders: 0 }
const rendersShown = ref(0)
let seed = 2000

/** 行组件手写 render：只有手写才能在「每次渲染」这个点上打计数 */
const RowItem = defineComponent({
    props: {
        it: { type: Object, required: true }
    },
    setup(props) {
        return () => {
            stats.renders += 1
            return h('div', { class: 'row' }, [
                h('b', props.it.name),
                h('span', '¥' + props.it.price),
                h('i', props.it.tag),
                h('em', String(props.it.score))
            ])
        }
    }
})

/** 与列表无关的状态下沉到这个独立小组件：它变一次，只有它自己重渲染 */
const TickBadge = defineComponent({
    props: { tick: { type: Number, default: 0 } },
    setup(props) {
        return () => h('div', { class: 'fx-tick' }, `与列表无关的状态 tick = ${props.tick}`)
    }
})

const nextFrame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(performance.now()))))
const settle = (ms = 200) => new Promise(r => setTimeout(r, ms))

async function onInsert() {
    seed += 1
    const before = stats.renders
    const t0 = performance.now()
    items.value.unshift({
        id: seed,
        name: `订单 ${seed}`,
        price: '9.9',
        tag: '加急',
        score: 1
    })
    await nextFrame()
    console.info('[perf-lab] 重渲染对照 · 头部插一条', {
        key: 'id',
        renders: stats.renders - before,
        ms: Math.round(performance.now() - t0)
    })
    rendersShown.value = stats.renders
}

async function onTick() {
    const before = stats.renders
    const t0 = performance.now()
    tick.value += 1
    await nextFrame()
    console.info('[perf-lab] 重渲染对照 · 无关状态变一次', {
        sink: true,
        renders: stats.renders - before,
        ms: Math.round(performance.now() - t0)
    })
    rendersShown.value = stats.renders
}

/** 公告位先预留 min-height：公告晚到 300ms（等价接口慢）再插进来，只是填空，不产生位移 */
const bannerOn = ref(false)

/** rAF 合帧：一帧只读一次滚动位置，然后只写一次 —— 不逐行读写交错 */
let scheduled = false
function onScroll() {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
        scheduled = false
        start.value = Math.floor(vp.value.scrollTop / ROW_H)
        offset.value = start.value * ROW_H
    })
}

onMounted(async () => {
    rowsShown.value = document.querySelectorAll('.row').length
    const head = () => document.querySelector('.fx-anchor')
    const topBefore = head() ? Math.round(head().getBoundingClientRect().top) : 0
    await settle(300)
    bannerOn.value = true
    await nextFrame()
    const topAfter = head() ? Math.round(head().getBoundingClientRect().top) : 0
    console.info('[perf-lab] 公告位对照 · 晚到的公告', {
        reserved: true,
        pushed: topAfter - topBefore
    })
})
</script>

<template>
    <section class="view" data-route="list">
        <div class="bar">
            <button data-act="agg" @click="onAgg">跑一次全量聚合（Worker 计算）</button>
            <button @click="onInsert">在头部插入一条</button>
            <button @click="onTick">改一次「与列表无关」的状态</button>
            <span class="meta">
                {{ items.length }} 条 · 实际渲染 {{ rowsShown }} 行 · 聚合 {{ aggMs }} ms · 行组件已渲染
                {{ rendersShown }} 次
            </span>
        </div>
        <!-- 无关状态在这里渲染，不进每一行 -->
        <TickBadge :tick="tick" />
        <!-- 公告位先预留 240px：晚到的公告插进来只是填空 -->
        <div class="fx-slot fx-reserved">
            <div v-if="bannerOn" class="fx-banner">公告 · 这条内容是「晚到」的</div>
        </div>
        <div class="fx-anchor">↓ 公告位以下的内容</div>
        <!-- 虚拟滚动：只渲染窗口内 14 行，key 用稳定 id -->
        <div class="viewport" ref="vp" @scroll.passive="onScroll">
            <div class="total" :style="{ height: items.length * ROW_H + 'px' }">
                <div class="rows" :style="{ transform: 'translateY(' + offset + 'px)' }">
                    <RowItem v-for="it in visible" :key="it.id" :it="it" />
                </div>
            </div>
        </div>
    </section>
</template>
