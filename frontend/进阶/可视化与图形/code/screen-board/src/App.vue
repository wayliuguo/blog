<script setup>
// 实时交易监控大屏 —— 可视化板块统一业务场景的实战工程。
// 布局按设计稿 1920×1080 写死，外层 useFitScreen 等比缩放；
// 数据经 mock feed（帧内合并）→ aggregate（时间桶降维）→ 各图表 setOption。
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import EPanel from './components/EPanel.vue'
import AlertList from './components/AlertList.vue'
import { useFitScreen } from './utils/useFitScreen.js'
import { aggregate, toLineSeries } from './utils/aggregate.js'
import { createFeed } from './utils/mock.js'

const screen = ref(null)
useFitScreen(screen)

const state = reactive({
  qpsOption: emptyLine(),
  channelOption: emptyBar(),
  terminalOption: emptyPie(),
  alerts: [],
})
const gmv = ref(0)

let feed = null
let unsubscribe = null

onMounted(() => {
  feed = createFeed(2000)
  unsubscribe = feed.subscribe(push)
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
  if (feed) feed.stop()
})

// 一帧最多被调一次（feed 内部按 rAF 合并），这里安心做全量 setOption
function push(data) {
  const buckets = aggregate(data.qps, 5000) // 60 个秒级点 → 12 个 5s 桶
  const line = toLineSeries(buckets)
  state.qpsOption = {
    ...lineOption(),
    xAxis: { type: 'category', data: line.times, axisLine: { lineStyle: { color: '#2c5a8f' } } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(44,90,143,0.4)' } } },
    series: [
      {
        name: 'QPS max',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: line.upper,
        lineStyle: { color: '#409cff', width: 2 },
        areaStyle: { color: 'rgba(64,156,255,0.18)' },
      },
      {
        name: 'QPS min',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: line.lower,
        lineStyle: { color: 'rgba(64,156,255,0.4)', width: 1 },
      },
    ],
  }
  state.channelOption = {
    ...axisStyle(),
    xAxis: { type: 'category', data: data.channels.map(c => c.name), axisLabel: { color: '#9cc3e8' } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(44,90,143,0.4)' } } },
    series: [
      {
        type: 'bar',
        data: data.channels.map(c => c.value),
        barWidth: 26,
        itemStyle: { color: '#3f9f7f' },
      },
    ],
  }
  state.terminalOption = {
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        data: data.terminals,
        label: { color: '#9cc3e8' },
        itemStyle: { borderColor: '#0a1e3c', borderWidth: 2 },
        color: ['#409cff', '#3f9f7f', '#f5a623'],
      },
    ],
  }
  gmv.value = data.gmv
  state.alerts.unshift(data.alert)
  if (state.alerts.length > 30) state.alerts.pop()
}

function emptyLine() {
  return { ...lineOption(), xAxis: { type: 'category', data: [] }, series: [] }
}
function emptyBar() {
  return { ...axisStyle(), xAxis: { type: 'category', data: [] }, yAxis: { type: 'value' }, series: [] }
}
function emptyPie() {
  return { series: [] }
}
function lineOption() {
  return {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    grid: { left: 44, right: 12, top: 20, bottom: 24 },
  }
}
function axisStyle() {
  return {
    backgroundColor: 'transparent',
    tooltip: {},
    grid: { left: 44, right: 12, top: 20, bottom: 24 },
  }
}

const fmtGmv = n => (n / 10000).toFixed(1)
</script>

<template>
  <div class="viewport">
    <div ref="screen" class="screen">
      <header class="header">
        <h1>实时交易监控</h1>
        <div class="gmv-card">
          <span class="gmv-label">今日 GMV（万元）</span>
          <strong class="gmv-value">{{ fmtGmv(gmv) }}</strong>
        </div>
      </header>
      <main class="grid">
        <EPanel title="QPS 实时趋势（5s 桶聚合）" :option="state.qpsOption" class="cell-qps" />
        <EPanel title="渠道订单分布" :option="state.channelOption" class="cell-channel" />
        <EPanel title="终端占比" :option="state.terminalOption" class="cell-terminal" />
        <AlertList :alerts="state.alerts" class="cell-alerts" />
      </main>
    </div>
  </div>
</template>

<style scoped>
.viewport {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #04101f;
  position: relative;
}
.screen {
  position: absolute;
  left: 0;
  top: 0;
  width: 1920px;
  height: 1080px;
  transform-origin: center center;
  background: linear-gradient(160deg, #06182f 0%, #04101f 60%);
  display: flex;
  flex-direction: column;
  padding: 24px 32px;
  box-sizing: border-box;
  gap: 16px;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.header h1 {
  color: #e8f4ff;
  font-size: 30px;
  letter-spacing: 8px;
  margin: 0;
}
.gmv-card {
  text-align: right;
}
.gmv-label {
  color: #6f93b8;
  font-size: 14px;
  display: block;
}
.gmv-value {
  color: #ffd166;
  font-size: 44px;
  font-variant-numeric: tabular-nums;
}
.grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  grid-template-rows: 1.4fr 1fr;
  gap: 16px;
}
.cell-qps {
  grid-column: 1 / 2;
  grid-row: 1 / 2;
}
.cell-channel {
  grid-column: 2 / 4;
  grid-row: 1 / 2;
}
.cell-terminal {
  grid-column: 1 / 2;
  grid-row: 2 / 3;
}
.cell-alerts {
  grid-column: 2 / 4;
  grid-row: 2 / 3;
}
</style>
