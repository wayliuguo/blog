<template>
    <div>
        <section class="card">
            <h2>体验 · 三类性能降级（体系篇 · 五）</h2>
            <div class="row" v-for="row in rows" :key="row.key">
                <span>{{ row.label }}</span>
                <button v-if="row.fn" @click="fire(row.fn)">触发</button>
                <span v-else class="note">{{ row.note }}</span>
            </div>
        </section>

        <section class="card">
            <h2>手动收口并查看当前指标</h2>
            <div class="row">
                <span>立即上报并打印 LCP / CLS / TBT 现测值</span>
                <button class="primary" @click="report">收口上报</button>
            </div>
            <pre class="dump">{{ dump || '（点「收口上报」后，这里显示按官方阈值打的评级）' }}</pre>
        </section>

        <p class="tip">
            LCP / CLS <b>越晚越准</b>：这里能立刻 <code>flushAll</code> 看一次快照，真实终值在页面
            <code>visibilitychange → hidden</code> 时自动上报。 TBT 只算长任务超出 50ms 的部分：140ms 长任务 ≈ 90ms。
        </p>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { sm, triggerJam, triggerShift, triggerLate } from '../monitor.js'

const rows = [
    { key: 'jam', label: '长任务 140ms <code>longtask→TBT</code>', fn: triggerJam },
    { key: 'shift', label: '无预留横幅 <code>layout-shift→CLS</code>', fn: triggerShift },
    { key: 'late', label: '晚到大元素 <code>→LCP</code>', fn: triggerLate }
]

const dump = ref('')
const fire = fn => fn()

function report() {
    // 只读 perf 当前累积值，不真的以页面离开收口——让 LCP/CLS 终值仍留给 hidden 时上报
    const metrics = sm.perf.finalize()
    dump.value = JSON.stringify(
        {
            lcp: metrics.lcp,
            cls: metrics.cls,
            tbt: metrics.tbt,
            ttfb: metrics.ttfb,
            longtasks: metrics.longtasks,
            rating: {
                lcp: rate(metrics.lcp, 2500, 4000),
                cls: rate(metrics.cls, 0.1, 0.25),
                tbt: rate(metrics.tbt, 200, 600)
            }
        },
        null,
        2
    )
}
function rate(v, good, poor) {
    return v <= good ? '良好' : v <= poor ? '需改进' : '差'
}
</script>

<style scoped>
.dump {
    margin: 0;
    padding: 12px 16px;
    background: #0b1220;
    color: #cbd5e1;
    border-top: 1px solid var(--line);
    font:
        12px/1.7 ui-monospace,
        'Cascadia Code',
        Consolas,
        monospace;
    white-space: pre;
    overflow: auto;
    max-height: 300px;
}
</style>
