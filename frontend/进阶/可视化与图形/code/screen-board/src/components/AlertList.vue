<script setup>
// 告警滚动列表：大屏里「需要 DOM 交互」的那部分 UI 用普通 DOM/SVG——
// 不和 Canvas 抢渲染预算，浏览器事件模型白拿 hover/点击。
import { ref } from 'vue'

const props = defineProps({
  alerts: { type: Array, required: true },
})

const sevColor = { info: '#4ea1ff', warn: '#f5a623', error: '#ff5b5b' }
const listEl = ref(null)

// 新告警插到头部；列表超长裁剪，防止长跑内存无限涨
function prepend(alert) {
  props.alerts.unshift(alert)
  if (props.alerts.length > 30) props.alerts.pop()
  // DOM 滚动回顶部：数据最新在最上，不需要 scrollToBottom 的时序坑
}

defineExpose({ prepend })
</script>

<template>
  <section class="alert-panel">
    <h3 class="panel-title">实时告警</h3>
    <ul ref="listEl" class="alert-list">
      <li v-for="(a, i) in alerts" :key="a.time + i" class="alert-item">
        <span class="alert-time">{{ a.time }}</span>
        <span class="alert-dot" :style="{ background: sevColor[a.severity] }"></span>
        <span class="alert-msg">{{ a.msg }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.alert-panel {
  border: 1px solid rgba(64, 156, 255, 0.35);
  background: rgba(10, 30, 60, 0.55);
  display: flex;
  flex-direction: column;
  padding: 10px 12px;
  min-height: 0;
}
.panel-title {
  margin: 0 0 6px;
  font-size: 15px;
  color: #7fd0ff;
  letter-spacing: 2px;
  border-left: 3px solid #409cff;
  padding-left: 8px;
}
.alert-list {
  flex: 1;
  overflow: hidden;
  margin: 0;
  padding: 0;
  list-style: none;
}
.alert-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 4px;
  border-bottom: 1px dashed rgba(64, 156, 255, 0.2);
  font-size: 13px;
  color: #c9e4ff;
}
.alert-time {
  color: #6f93b8;
  font-variant-numeric: tabular-nums;
}
.alert-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
}
.alert-msg {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
