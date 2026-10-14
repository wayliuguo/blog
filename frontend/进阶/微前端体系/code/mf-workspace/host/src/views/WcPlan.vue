<script setup lang="ts">
// 方案五：Web Components。子应用构建成自定义元素产物（defineCustomElement / 手写 wrapper），
// 宿主动态插入 <script> 后直接写标签。零运行时框架依赖，是"最小体积"路线。
import { onMounted, ref } from 'vue'
import PlanShell from '../components/PlanShell.vue'
import { setSelectedId } from '../store'

const loaded = ref(false)
const selectedId = ref('1001')

const LIST_JS = 'http://127.0.0.1:3141/order-list-element.js'
const DETAIL_JS = 'http://127.0.0.1:3142/order-detail-element.js'

function loadScript(src: string) {
    return new Promise<void>((resolve, reject) => {
        const s = document.createElement('script')
        s.src = src
        s.onload = () => resolve()
        s.onerror = () => reject(new Error(`加载失败：${src}`))
        document.head.appendChild(s)
    })
}

onMounted(async () => {
    try {
        // 产物由各子应用 npm run build:wc 生成，vite preview 静态服务
        await Promise.all([loadScript(LIST_JS), loadScript(DETAIL_JS)])
        loaded.value = true
    } catch (e) {
        alert((e as Error).message + '（先在两个子应用目录执行 npm run build:wc 并启动 npm run preview:wc）')
    }
})

function onSelect(e: CustomEvent<{ orderId: string }>) {
    selectedId.value = e.detail.orderId
    setSelectedId(e.detail.orderId, 'web-components')
}
</script>

<template>
    <PlanShell title="Web Components 方案" desc="子应用导出真正的自定义元素：宿主不关心子应用用什么框架，只认 <order-list-element> 标签、attribute 下行、CustomEvent 上行。这是 micro-app 的原理原型，也是最贴近'长期演进'的路线。">
        <template v-if="loaded">
            <order-list-element :selected-id="selectedId" @order-select="onSelect" class="wc-box"></order-list-element>
            <order-detail-element :order-id="selectedId" class="wc-box"></order-detail-element>
        </template>
        <div v-else class="wc-box placeholder">正在加载自定义元素产物…</div>
    </PlanShell>
</template>

<style scoped>
.wc-box { flex: 1; min-height: 300px; background: #fff; border: 1px solid #d8dadf; border-radius: 8px; }
.placeholder { display: flex; align-items: center; justify-content: center; color: #646a73; }
</style>
