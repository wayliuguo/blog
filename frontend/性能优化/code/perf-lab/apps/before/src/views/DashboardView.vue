<script setup>
/**
 * 仪表盘路由（优化前实现）：4 张 KPI 卡 + 18 张分区走势卡 + 销售榜。
 * 业务与 after 版完全一样，这一版的写法是「未优化」的：
 *   进页面就同步算完所有聚合、一次性渲染全部 22 张卡 ——
 *   作为路由级代码分割的「被拆对象」，它的体积在 before 版全部落在主 bundle 里。
 */
import { ref, onMounted } from 'vue'
import { makeItems, heavyAggregate } from '../lib/store.js'
import { sparkline } from '../lib/chart.js'

const stats = ref(null)
const zones = ref([])
const rank = ref([])

/** 用确定性的伪随机造 30 天走势：同一条种子两版长得一样，对照才公平 */
function trend(seedBase) {
    let s = seedBase
    return Array.from({ length: 30 }, (_, i) => {
        s = (s * 9301 + 49297) % 233280
        return 60 + (s / 233280) * 40 + i * 0.4
    })
}

onMounted(() => {
    const t0 = performance.now()
    const items = makeItems(800)
    const agg = heavyAggregate(items)
    const urgentPct = Math.round((agg.buckets['加急'] / agg.sum) * 1000) / 10
    stats.value = [
        { name: '今日营收', value: '¥' + agg.sum.toLocaleString(), delta: '+12.4%' },
        { name: '订单数', value: String(items.length), delta: '+3.1%' },
        { name: '客单价', value: '¥' + Math.round(agg.sum / items.length), delta: '+8.7%' },
        { name: '加急占比', value: urgentPct + '%', delta: '-2.0%' }
    ]
    zones.value = Array.from({ length: 18 }, (_, i) => ({
        name: `销售分区 ${String.fromCharCode(65 + (i % 6))}${Math.floor(i / 6) + 1}`,
        data: trend(1000 + i * 77)
    }))
    rank.value = agg.top
    const ms = Math.round(performance.now() - t0)
    console.info('[perf-lab] 仪表盘对照', {
        impl: 'sync',
        cards: 4 + zones.value.length,
        syncMs: ms
    })
})
</script>

<template>
    <section class="view" data-route="dashboard">
        <div class="bar">
            <span class="meta">仪表盘 · 4 张 KPI 卡 + 18 张分区走势 + 销售榜 · 本版一次性同步渲染</span>
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
            <div v-for="line in rank" :key="line" class="row">
                <b>{{ line }}</b>
            </div>
        </div>
    </section>
</template>
