<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { sdk } from '../sdk.js'
import { trackClick, errorReport } from '../useReport.js'

// 实验室 = 能力总控台：每个按钮前的标签就是它演示的采集能力。
// 触发后四处证据：Console（debug 日志）/ Network（report 请求）/ 看板 GET /api/stats / 下方实时快照

const router = useRouter()
const sampleRate = ref(0.3)
const result = ref('')
const contextJson = ref('')
const statsJson = ref('')

function refresh() {
    const ctx = sdk.getContext()
    contextJson.value = JSON.stringify({ session: ctx.session, page: ctx.page, device: ctx.device }, null, 2)
    statsJson.value = JSON.stringify(sdk.stats, null, 2)
}

// —— 采样 / 节流：运行时改 cfg，立即生效 ——
function applyRates() {
    sdk.cfg.sampleRates.error = sampleRate.value
    result.value = `错误采样率已改为 ${Math.round(sampleRate.value * 100)}%——改 cfg 就生效，不用重新 init`
}

function sampleDemo() {
    sdk.cfg.sampleRates.error = sampleRate.value
    const before = sdk.stats.sampled
    for (let i = 0; i < 10; i++) sdk.captureError(new Error('采样演示错误 #' + i))
    const dropped = sdk.stats.sampled - before
    result.value = `触发 10 次 × ${Math.round(sampleRate.value * 100)}% → 采样丢弃 ${dropped} 条，入队 ${
        10 - dropped
    } 条（stats.sampled）`
    refresh()
}

function throttleDemo() {
    sdk.cfg.sampleRates.error = 1
    const before = sdk.stats.throttled
    for (let i = 0; i < 10; i++) sdk.captureError(new Error('同一个错误的连续风暴'))
    const dropped = sdk.stats.throttled - before
    result.value = `1 秒内触发 10 次同错 → 指纹去重丢弃 ${dropped} 条，入队 ${10 - dropped} 条（stats.throttled）`
    refresh()
}

async function flushNow() {
    const before = sdk.stats.sent
    await sdk.flush('manual')
    result.value = `手动 flush 完成，新增送达 ${sdk.stats.sent - before} 条；最近触发原因 = ${
        sdk.stats.lastFlushReason
    }`
    refresh()
}

// —— 异常触发源 ——
function runtimeError() {
    const obj = null
    return obj.property
}

function promiseError() {
    Promise.reject(new Error('promise 未捕获的拒绝'))
}

function resourceError() {
    // 游离元素（不插入 DOM）的 error 事件不经过 window，必须真插进文档
    const img = document.createElement('img')
    img.src = '/definitely-missing.png'
    document.body.appendChild(img)
}

async function httpError() {
    await fetch('/mock/404')
}

async function networkError() {
    try {
        await fetch('http://127.0.0.1:1/api')
    } catch (e) {
        result.value = '业务已 catch：SDK 拦截后 rethrow，不会再产生一条 unhandledrejection'
    }
}

// —— 性能触发源 ——
function longTask() {
    const start = performance.now()
    while (performance.now() - start < 150);
    result.value = '主线程被阻塞 150ms，TBT 记录超出 50ms 的 100ms'
}

async function slowRequest() {
    await fetch('/mock/slow')
    result.value = '慢请求 800ms：request 事件的 subtype=slow'
}

// —— 路由 ——
function gotoProduct() {
    router.push('/product/2')
}

function rawPushState() {
    // 只监听 popstate 抓不到这条：必须改写 pushState 才能截获
    history.pushState({}, '', '/lab?raw=' + Date.now())
    result.value = '原生 history.pushState 已执行：router 事件的 action=push'
}

// —— 白屏 ——
async function checkWhiteScreen() {
    const report = await sdk.checkWhiteScreen()
    result.value = report
        ? `容器 ${report.container}：空白点 ${report.blankPoints}/${report.totalPoints}（${Math.round(
              report.ratio * 100
          )}%）→ ${report.blank ? '判定白屏，已上报' : '非白屏'}`
        : '白屏插件未启用'
    refresh()
}

function openBlankPage() {
    window.open('/blank.html', '_blank')
}

// —— 自定义上报 ——
function manualEvent() {
    sdk.report({ name: 'monishop.LAB.manual_event', params: { from: 'lab', ts: Date.now() } })
    result.value = 'report() 已入队：custom 事件的 subtype 就是事件名'
}

function setUser() {
    sdk.setUser('u_9527', { level: 'vip' })
    result.value = 'setUser 之后的事件都会带上 user.level=vip（写进公参）'
    refresh()
}

onMounted(refresh)
</script>

<template>
    <div class="lab">
        <h2>实验室 · 能力总控台</h2>
        <p class="hint">
            按钮前的标签 = 演示的采集能力。触发后看四处：Console / Network（report）/ 看板 GET /api/stats / 下方快照
        </p>

        <section class="panel">
            <h3>[上下文] 会话 / 用户 / 页面 / 设备</h3>
            <div class="col">
                <pre class="code">{{ contextJson }}</pre>
            </div>
            <button class="plain" @click="setUser">上下文 · setUser｜切换为真实用户</button>
            <button class="plain" @click="refresh">刷新快照</button>
        </section>

        <section>
            <h3>[队列调度] 采样 / 节流 / 上报统计</h3>
            <div class="slider">
                <label>错误采样率 {{ Math.round(sampleRate * 100) }}%</label>
                <input v-model.number="sampleRate" type="range" min="0" max="1" step="0.1" />
            </div>
            <button class="plain" @click="applyRates">应用采样率</button>
            <button class="ghost" @click="sampleDemo">采样演示：10 条不同错误</button>
            <button class="ghost" @click="throttleDemo">节流演示：10 条同指纹错误</button>
            <button class="ghost" @click="flushNow">空闲上报｜立即 flush</button>
            <p v-if="result" class="result">{{ result }}</p>
            <pre class="code small">{{ statsJson }}</pre>
        </section>

        <section>
            <h3>[采集] 异常</h3>
            <button @click="runtimeError">异常 · JS 错误｜运行时错误</button>
            <button @click="showBad = true">异常 · JS 错误｜Vue 渲染错误</button>
            <button @click="promiseError">异常 · Promise｜未捕获拒绝</button>
            <button @click="resourceError">异常 · 资源｜图片 404</button>
            <button @click="httpError">异常 · 接口｜HTTP 404</button>
            <button @click="networkError">异常 · 网络｜连接失败（已 catch）</button>
            <button @click="errorReport(new Error('业务手动上报的已知异常'), { flow: 'lab' })">
                异常 · 手动｜captureError
            </button>
            <BadInner v-if="showBad" />
        </section>

        <section>
            <h3>[采集] 性能</h3>
            <p class="sub">FP / FCP / LCP / CLS / INP / TBT 无需触发，页面隐藏时定稿上报；下面两项演示可触发的指标</p>
            <button @click="longTask">性能 · TBT｜制造 150ms 长任务</button>
            <button @click="slowRequest">性能 · 慢请求｜800ms 接口</button>
        </section>

        <section>
            <h3>[采集] 路由 / 白屏</h3>
            <button @click="gotoProduct">路由 · 框架跳转｜router.push</button>
            <button @click="rawPushState">路由 · 原生 API｜history.pushState</button>
            <button @click="checkWhiteScreen">白屏 · 当前页检测｜checkWhiteScreen()</button>
            <button class="ghost" @click="openBlankPage">白屏 · 打开真实空白页</button>
        </section>

        <section>
            <h3>[采集] 自定义上报 / 声明式埋点</h3>
            <button class="plain" @click="manualEvent">自定义 · report()</button>
            <button class="plain" @click="trackClick('manual_click', { from: 'lab' })">
                自定义 · 业务封装 trackClick
            </button>
            <button data-track="lab.declarative_click">行为 · 点击｜data-track 属性</button>
            <div data-expose="lab.expose_panel" class="expose-box">
                行为 · 曝光｜本区块带 data-expose，滚入视口自动上报
            </div>
        </section>
    </div>
</template>

<script>
// 渲染期抛错的子组件：由 main.js 里 attachVue 安装的 errorHandler 捕获
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
export default { components: { BadInner }, data: () => ({ showBad: false }) }
</script>

<style scoped>
.lab {
    background: var(--card);
    border-radius: var(--radius);
    padding: 18px 16px;
}
h2 {
    margin-bottom: 6px;
}
.hint {
    color: #888;
    font-size: 13px;
    margin-bottom: 16px;
}
section {
    margin: 18px 0;
    padding-top: 14px;
    border-top: 1px dashed #eee;
}
h3 {
    font-size: 14px;
    color: #555;
    margin-bottom: 10px;
}
.sub {
    color: #999;
    font-size: 12px;
    margin: -4px 0 10px;
}
button {
    margin: 0 8px 8px 0;
    font-size: 13px;
}
.slider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
}
.slider label {
    font-size: 13px;
    color: #333;
    width: 130px;
    flex-shrink: 0;
}
.slider input {
    flex: 1;
    min-width: 0;
}
.result {
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    color: #0369a1;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 13px;
    margin: 6px 0;
}
.code {
    background: #f7f7f9;
    border: 1px solid #eee;
    border-radius: 6px;
    padding: 10px 12px;
    font-size: 12px;
    line-height: 1.5;
    color: #333;
    overflow: auto;
    max-height: 220px;
}
.code.small {
    max-height: 140px;
    margin-top: 8px;
}
.expose-box {
    margin-top: 10px;
    padding: 14px;
    border: 1px dashed #bbb;
    border-radius: 8px;
    color: #888;
    font-size: 13px;
}
</style>
