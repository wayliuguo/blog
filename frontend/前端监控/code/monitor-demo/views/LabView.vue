<script setup>
import { ref } from 'vue'
import { getCurrentInstance, report } from '../../monitor-sdk/src/index.js'
import { trackClick, errorReport } from '../useReport.js'

// 实验室 = 特性总控台：每个按钮前的标签就是它演示的监控特性。
// 触发后三处证据：Console（debug 日志）/ Network（report 请求）/ 看板 GET /api/stats

// —— 采样控制：上报模块在 send 入口读 cfg.sampleRate / cfg.tracesSampleRate，
// 运行时改 cfg 即生效，无需重新 init
const sampleRate = ref(0.3)
const traceRate = ref(1)
const result = ref('')

function applyRates() {
  const sdk = getCurrentInstance()
  sdk.cfg.sampleRate = sampleRate.value
  sdk.cfg.tracesSampleRate = traceRate.value
  result.value = `已应用：错误/业务采样率 ${Math.round(sampleRate.value * 100)}%，性能采样率 ${Math.round(traceRate.value * 100)}%`
}

// 采样演示：10 次不同 message（避开相同错误节流），数 beforeSend 放行几条
function sampleDemo() {
  const sdk = getCurrentInstance()
  sdk.cfg.sampleRate = sampleRate.value
  const before = window.__monitorPassed || 0
  for (let i = 0; i < 10; i++) {
    report({ type: 'runtime', handled: true, error: new Error('采样演示错误 #' + i) })
  }
  const passed = (window.__monitorPassed || 0) - before
  result.value = `采样演示：触发 10 次 × 采样率 ${Math.round(sampleRate.value * 100)}% → 入队 ${passed} 条（理论期望 ≈ ${Math.round(sampleRate.value * 10)} 条，看 Network report 实际批次）`
}

// 节流演示：相同错误 1 秒内只报一条 —— 渲染死循环这类错误风暴的止损阀。
// 读数走 sdk.stats.throttled（节流发生在 beforeSend 之前，beforeSend 计数口径看不到它）
function throttleDemo() {
  const sdk = getCurrentInstance()
  sdk.cfg.sampleRate = 1
  const before = sdk.stats.throttled
  for (let i = 0; i < 10; i++) {
    report({ type: 'runtime', handled: true, error: new Error('同一个错误的连续风暴') })
  }
  const throttled = sdk.stats.throttled - before
  result.value = `节流演示：1 秒内触发 10 次同错 → 入队 ${10 - throttled} 条，节流丢弃 ${throttled} 条（sdk.stats.throttled）`
}

// —— 异常触发源 ——
function runtimeError() {
  const obj = null
  return obj.property // 读 undefined 的属性 → window error
}

function promiseError() {
  Promise.reject(new Error('promise 未捕获的拒绝')) // 不 catch → unhandledrejection
}

function resourceError() {
  // 游离元素（不插入 DOM）的 error 事件不经过 window，必须真插进文档才能被捕获阶段截获
  const img = document.createElement('img')
  img.src = '/definitely-missing.png'
  document.body.appendChild(img)
}

async function httpError() {
  await fetch('/mock/404') // status>=400 → 接口错误
}

async function networkError() {
  try {
    await fetch('http://127.0.0.1:1/api') // 拒绝连接 → 网络错误
  } catch (e) {
    console.log('业务已 catch（SDK 的 fetch 拦截 rethrow，不重复上报）', e.message)
  }
}

// —— 性能触发源 ——
// 长任务：150ms 主线程阻塞 → TBT 口径（超出 50ms 门槛的部分被累计）
function longTask() {
  const start = performance.now()
  while (performance.now() - start < 150);
  console.log('[demo] 主线程被阻塞了 150ms（long task）')
}

async function slowRequest() {
  await fetch('/mock/slow') // 800ms 慢请求 → 慢请求 Top5
}

// —— 手动上报与业务触发源 ——
function manualMessage() {
  report({ type: 'message', message: '支付超时预警', level: 'warning' })
}

const showBad = ref(false)
</script>

<template>
  <div class="lab">
    <h2>实验室 · 特性总控台</h2>
    <p class="hint">按钮前的标签 = 演示的监控特性。触发后三处证据：Console / Network（report）/ 看板 GET /api/stats</p>

    <section class="panel">
      <h3>[上报 · 采样] 运行时采样控制</h3>
      <div class="slider">
        <label>错误/业务采样率 {{ Math.round(sampleRate * 100) }}%</label>
        <input v-model.number="sampleRate" type="range" min="0" max="1" step="0.1" />
      </div>
      <div class="slider">
        <label>性能采样率 {{ Math.round(traceRate * 100) }}%</label>
        <input v-model.number="traceRate" type="range" min="0" max="1" step="0.1" />
      </div>
      <button class="plain" @click="applyRates">应用采样率</button>
      <button class="ghost" @click="sampleDemo">采样演示：触发 10 次不同错误</button>
      <button class="ghost" @click="throttleDemo">节流演示：1 秒连发 10 次同错</button>
      <p v-if="result" class="result">{{ result }}</p>
    </section>

    <section>
      <h3>异常（自动采集）</h3>
      <button @click="runtimeError">异常 · JS 错误｜运行时错误</button>
      <button @click="showBad = true">异常 · JS 错误｜Vue 渲染错误</button>
      <button @click="promiseError">异常 · Promise｜未捕获拒绝</button>
      <button @click="resourceError">异常 · 资源｜图片 404</button>
      <button @click="httpError">异常 · 接口｜HTTP 404</button>
      <button @click="networkError">异常 · 网络｜请求失败（已 catch）</button>
      <BadInner v-if="showBad" />
    </section>

    <section>
      <h3>性能（自动采集 + 可触发项）</h3>
      <p class="sub">FP / FCP / LCP / CLS / INP 无需触发，页面加载自动采集，页面隐藏时定稿上报</p>
      <button @click="longTask">性能 · TBT｜制造 150ms 长任务</button>
      <button @click="slowRequest">性能 · 慢请求｜800ms 接口</button>
    </section>

    <section>
      <h3>手动上报（report 单入口 + 业务二次封装）</h3>
      <button class="plain" @click="manualMessage">手动上报 · 消息｜report()</button>
      <button class="plain" @click="errorReport(new Error('业务手动上报的异常'))">手动上报 · 异常｜errorReport（catch 封装）</button>
      <button class="plain" @click="trackClick('manual_event', { from: 'lab' })">手动上报 · 行为｜trackClick（封装）</button>
      <button data-track="lab.declarative_click">声明上报 · 点击｜data-track 属性</button>
      <div data-expose="lab.expose_panel" class="expose-box">声明上报 · 曝光｜本区块带 data-expose，滚入视口自动上报</div>
    </section>
  </div>
</template>

<script>
// 渲染期抛错的子组件：由 main.js 里 attachVue 安装的 errorHandler 捕获
// 注意不在根组件 created 里抛 —— 根树渲染失败会让整个页面挂掉
import { defineComponent } from 'vue'
const BadInner = defineComponent({
  name: 'BadInner',
  setup() {
    throw new Error('Vue 渲染错误（errorHandler 捕获）')
  },
  render() {
    return null
  }
})
export default { components: { BadInner } }
</script>

<style scoped>
.lab { background: #fff; border-radius: 10px; padding: 22px; }
h2 { margin-bottom: 6px; }
.hint { color: #888; font-size: 13px; margin-bottom: 16px; }
section { margin: 18px 0; padding-top: 14px; border-top: 1px dashed #eee; }
h3 { font-size: 14px; color: #555; margin-bottom: 10px; }
.sub { color: #999; font-size: 12px; margin: -4px 0 10px; }
button { margin: 0 8px 8px 0; font-size: 13px; }
.slider { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.slider label { font-size: 13px; color: #333; width: 170px; }
.slider input { width: 180px; }
.result { background: #f0f9ff; border: 1px solid #bae6fd; color: #0369a1; border-radius: 6px; padding: 8px 12px; font-size: 13px; }
.expose-box { margin-top: 10px; padding: 14px; border: 1px dashed #bbb; border-radius: 8px; color: #888; font-size: 13px; }
</style>
