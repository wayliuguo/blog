<script setup>
/**
 * 仪表盘路由（优化后实现）：4 张 KPI 卡 + 18 张分区走势卡 + 销售榜。
 * 业务与 before 版完全一样，这一版多了一个真实优化写法：
 *   首屏只渲染 4 张 KPI + 6 张走势卡（用户视线最先落到的那部分），
 *   剩下的分区卡在 requestIdleCallback 里分批补齐 —— 整页一次性铺 22 张卡
 *   会把「可交互时间」往后推，而折叠区下面的卡晚 100ms 上屏用户根本感觉不到。
 * 它同时是路由级代码分割的「被拆对象」：整个视图（含 chart.js）在 after 版是独立 chunk。
 */
import { ref, onMounted } from 'vue'
import { makeItems, heavyAggregate } from '../lib/store.js'
import { sparkline } from '../lib/chart.js'

const stats = ref(null)
const zones = ref([])
const rank = ref([])
const BATCH = 6

/** 用确定性的伪随机造 30 天走势：同一条种子两版长得一样，对照才公平 */
function trend(seedBase) {
    let s = seedBase
    return Array.from({ length: 30 }, (_, i) => {
        s = (s * 9301 + 49297) % 233280
        return 60 + (s / 233280) * 40 + i * 0.4
    })
}

onMounted(async () => {
    const t0 = performance.now()
    const items = makeItems(800)
    const agg = heavyAggregate(items)
    const urgentPct = Math.round((agg.buckets['加急'] / agg.sum) * 1000) / 10
    const allZones = Array.from({ length: 18 }, (_, i) => ({
        name: `销售分区 ${String.fromCharCode(65 + (i % 6))}${Math.floor(i / 6) + 1}`,
        data: trend(1000 + i * 77)
    }))
    // 首屏：KPI + 第一批走势卡先上
    stats.value = [
        { name: '今日营收', value: '¥' + agg.sum.toLocaleString(), delta: '+12.4%' },
        { name: '订单数', value: String(items.length), delta: '+3.1%' },
        { name: '客单价', value: '¥' + Math.round(agg.sum / items.length), delta: '+8.7%' },
        { name: '加急占比', value: urgentPct + '%', delta: '-2.0%' }
    ]
    zones.value = allZones.slice(0, BATCH)
    rank.value = agg.top
    const firstPaintMs = Math.round(performance.now() - t0)

    // 剩余的卡分批补齐：idle 时才让出主线程干这个
    const idle = window.requestIdleCallback || (fn => setTimeout(fn, 50))
    for (let i = BATCH; i < allZones.length; i += BATCH) {
        await new Promise(r => idle(r))
        zones.value = zones.value.concat(allZones.slice(i, i + BATCH))
    }
    console.info('[perf-lab] 仪表盘对照', {
        impl: 'idle-batch',
        cards: 4 + allZones.length,
        firstBatchMs: firstPaintMs,
        allMs: Math.round(performance.now() - t0)
    })
})
</script>

<template>
    <section class="view" data-route="dashboard">
        <div class="bar">
            <span class="meta">仪表盘 · 4 张 KPI 卡 + 18 张分区走势 + 销售榜 · 首屏 {{ BATCH }} 张、其余空闲分批上屏</span>
        </div>
        <div class="kpis">
            <div v-for="k in stats" :key="k.name" class="kpi">
                <h3>{{ k.name }}</h3>
                <p>{{ k.value }}</p>
                <small>{{ k.delta }}</small>
            </div>
        </div>
        <div class="zones">
            <div v-for="z in zones" :key="z.name" class="zone">
                <h4>{{ z.name }}</h4>
                <span v-html="sparkline(z.data)" />
            </div>
        </div>
        <div class="rank">
            <h4>畅销榜</h4>
            <div v-for="line in rank" :key="line" class="row"><b>{{ line }}</b></div>
        </div>
    </section>
</template>
