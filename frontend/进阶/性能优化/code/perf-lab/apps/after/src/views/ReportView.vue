<script setup>
/**
 * 报表路由：低频但重
 * 它 import 的 report-engine 里有几十个指标的字典 + 透视 / 异常 / 导出算法 ——
 * 这才是「路由级代码分割」在真实项目里要拆掉的东西：一个季度可能没人点，
 * 但它的代码如果不拆，每次首屏都得陪着一起下载。
 */
import { ref, onMounted } from 'vue'
import { buildReport, generateRows, formatMoney, toCSV, METRICS } from '../lib/report-engine.js'

const rows = ref([])
const report = ref([])
const csvBytes = ref(0)
const cols = ['gmv', 'orders', 'aov', 'marginRate', 'refundRate']
const labels = cols.map(k => METRICS.find(m => m.key === k))

onMounted(() => {
    // app 与直播间的权重调高，让透视结果不是均匀分布
    const data = generateRows(7, { app: 1.5, live: 1.3, store: 0.6 })
    rows.value = data
    report.value = buildReport(data, 'channel', cols)
    csvBytes.value = toCSV(
        data.slice(0, 200),
        Object.keys(data[0]).map(k => ({ key: k }))
    ).length
})
</script>

<template>
    <section class="view" data-route="report">
        <div class="bar">
            <span class="meta">
                经营报表 · {{ rows.length }} 行明细 · 导出 CSV {{ csvBytes }} 字节 · 透视维度：销售渠道
            </span>
        </div>
        <table class="report">
            <thead>
                <tr>
                    <th>渠道</th>
                    <th v-for="m in labels" :key="m.key">{{ m.label }}</th>
                    <th>T-1 环比</th>
                    <th>近 7 期</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="item in report" :key="item.key">
                    <td>{{ item.label }}</td>
                    <td v-for="m in labels" :key="m.key">
                        {{ m.unit === '元' ? formatMoney(item[m.key], m.digits) : item[m.key].toFixed(m.digits) }}
                    </td>
                    <td :class="item.judge">
                        {{ item.change == null ? '—' : (item.change > 0 ? '+' : '') + item.change.toFixed(1) + '%' }}
                    </td>
                    <td class="trend">{{ item.trend }}</td>
                </tr>
            </tbody>
        </table>
        <p class="hint">
            这个页面在真实产品里属于「季度报表」，低频到可以不进首屏 bundle。把它拆出去，
            省下的不是几十行组件，而是整块透视 / 异常检测 / 导出的代码。
        </p>
    </section>
</template>
