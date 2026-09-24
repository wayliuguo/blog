<script setup>
/**
 * 列表路由（优化前实现）：2000 条订单
 * 运行层的三件事在这一版都是「未优化」写法，与 after 项目逐项对照：
 *   聚合   —— 同步一次干完（heavyAggregate），点击后主线程被整块占住
 *   滚动   —— 全量渲染 2000 行 + 每个 scroll 事件都逐行改样式（无节流）
 *   重渲染 —— 行 key 用下标、「与列表无关的状态」从父组件穿透进每一行
 * 公告位没有预留高度：300ms 后插进来的公告会把下面整片顶下去（视觉层，见 after 版对照）
 */
import { ref, onMounted, onUnmounted, h, defineComponent } from 'vue'
import { makeItems, heavyAggregate } from '../lib/store.js'

const items = ref(makeItems(2000))
const rowsShown = ref(0)
const aggMs = ref(0)

/** 同步聚合：对 10000 条数据三趟遍历 + 一次排序，一段长任务把主线程占满，
 *  「点了之后卡多久」就是它的时长。列表本身 2000 条，聚合的数据量故意更大——
 *  2000 条同步算只有几毫秒，量不出长任务 */
function onAgg() {
    const t0 = performance.now()
    heavyAggregate(makeItems(10000))
    aggMs.value = Math.round(performance.now() - t0)
    console.info('[perf-lab] 聚合对照', { impl: 'sync', mainThreadMs: aggMs.value })
}

/* ------------------------------------------------------------------ *
 * 重渲染：一次交互之后，有多少行被「无谓地」重新渲染了
 * before 的两个写法问题：
 *   key 用下标（i）—— 头部插入后，后面所有行的 key 全部错位，行内容全部重建
 *   无关状态穿透 —— tick 是「与列表无关」的状态，却作为 prop 传进每一行，
 *                   它一变，2000 行就全部跟着重渲染
 * ------------------------------------------------------------------ */
const tick = ref(0)
const stats = { renders: 0 }
const rendersShown = ref(0)
let seed = 2000

/** 行组件手写 render：只有手写才能在「每次渲染」这个点上打计数 */
const RowItem = defineComponent({
    props: {
        it: { type: Object, required: true },
        tick: { type: Number, default: 0 }
    },
    setup(props) {
        return () => {
            stats.renders += 1
            return h('div', { class: 'row' }, [
                h('b', props.it.name),
                h('span', '¥' + props.it.price),
                h('i', props.it.tag),
                h('em', `${props.it.score} · t${props.tick}`)
            ])
        }
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
        key: 'index',
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
        sink: false,
        renders: stats.renders - before,
        ms: Math.round(performance.now() - t0)
    })
    rendersShown.value = stats.renders
}

/** 公告位没有预留：公告晚到 300ms（等价接口慢）再插进来，下面整片被顶下去 */
const bannerOn = ref(false)

/** 未节流：每个 scroll 事件都对全部行逐行「读 offsetTop 再写 transform」，
 *  读写交错强制同步布局，滚动期间主线程被占死 */
function onWindowScroll() {
    for (const el of document.querySelectorAll('.row')) {
        el.style.transform = `translateX(${el.offsetTop % 3}px)`
    }
}

onMounted(async () => {
    rowsShown.value = document.querySelectorAll('.row').length
    window.addEventListener('scroll', onWindowScroll, { passive: true })
    const head = () => document.querySelector('.fx-anchor')
    const topBefore = head() ? Math.round(head().getBoundingClientRect().top) : 0
    await settle(300)
    bannerOn.value = true
    await nextFrame()
    const topAfter = head() ? Math.round(head().getBoundingClientRect().top) : 0
    console.info('[perf-lab] 公告位对照 · 晚到的公告', {
        reserved: false,
        pushed: topAfter - topBefore
    })
})

onUnmounted(() => {
    window.removeEventListener('scroll', onWindowScroll)
})
</script>

<template>
    <section class="view" data-route="list">
        <div class="bar">
            <button data-act="agg" @click="onAgg">跑一次全量聚合（同步计算）</button>
            <button @click="onInsert">在头部插入一条</button>
            <button @click="onTick">改一次「与列表无关」的状态</button>
            <span class="meta">
                {{ items.length }} 条 · 全量渲染 {{ rowsShown }} 行 · 聚合 {{ aggMs }} ms · 行组件已渲染
                {{ rendersShown }} 次
            </span>
        </div>
        <!-- 公告位没有预留高度：晚到的公告插进来，下面整片内容被顶下去 -->
        <div class="fx-slot">
            <div v-if="bannerOn" class="fx-banner">公告 · 这条内容是「晚到」的</div>
        </div>
        <div class="fx-anchor">↓ 公告位以下的内容</div>
        <!-- key 用下标：头部插入后所有行的 key 错位，配合穿透进来的 tick，一次交互 2000 行全部重渲染 -->
        <div class="rows">
            <RowItem v-for="(it, i) in items" :key="i" :it="it" :tick="tick" />
        </div>
    </section>
</template>
