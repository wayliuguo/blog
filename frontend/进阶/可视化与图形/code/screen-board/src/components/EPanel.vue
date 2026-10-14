<script setup>
// 通用图表面板：echarts 实例生命周期三纪律——
// init 在 mounted（DOM 已就绪）、resize 跟窗口变化、dispose 随组件卸载。
// 大屏 7×24 长跑，漏掉 dispose 就是定时炸弹级别的内存泄漏。
import { onMounted, onUnmounted, ref, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  title: { type: String, required: true },
  option: { type: Object, required: true },
})

const el = ref(null)
let chart = null
let onResize = null

onMounted(() => {
  chart = echarts.init(el.value)
  applyOption(props.option)
  onResize = () => chart && chart.resize()
  window.addEventListener('resize', onResize)
})

// 空系列（series 为空数组）的初始 option 不能直接 setOption：
// 实测 echarts 5.5.x/5.6.x 对「空 series + category 轴」会抛
// getAxesOnZeroOf is not a function（tooltip trigger:'axis' 时）/ 坐标系未定义。
// 大屏首帧数据未到时先不画，等第一笔数据到达再渲染。
function applyOption(opt) {
  if (!opt.series || opt.series.length === 0) return
  chart.setOption(opt)
}

// option 整体替换（引用变化才触发）：数据更新走 setOption 的增量 diff
watch(
  () => props.option,
  opt => chart && applyOption(opt)
)

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  if (chart) {
    chart.dispose()
    chart = null
  }
})
</script>

<template>
  <section class="panel">
    <h3 class="panel-title">{{ title }}</h3>
    <div ref="el" class="panel-chart"></div>
  </section>
</template>

<style scoped>
.panel {
  border: 1px solid rgba(64, 156, 255, 0.35);
  background: rgba(10, 30, 60, 0.55);
  display: flex;
  flex-direction: column;
  padding: 10px 12px;
}
.panel-title {
  margin: 0 0 6px;
  font-size: 15px;
  color: #7fd0ff;
  letter-spacing: 2px;
  border-left: 3px solid #409cff;
  padding-left: 8px;
}
.panel-chart {
  flex: 1;
  min-height: 0;
}
</style>
