<script setup lang="ts">
// 方案一：iframe 基线。两个 iframe 分别承载列表与详情，
// 跨源靠 postMessage 协议通信——所有"现代"微前端方案要替代的就是这套心智。
import { onMounted, onUnmounted, ref } from 'vue'
import PlanShell from '../components/PlanShell.vue'
import { setSelectedId } from '../store'

const listSrc = 'http://127.0.0.1:3031/?mode=iframe'
const detailSrc = ref('http://127.0.0.1:3032/?mode=iframe&orderId=1001')

function onMessage(e: MessageEvent) {
    // 生产上必须校验 origin，教学工程简化为打印
    if (typeof e.data !== 'object' || e.data === null) return
    if (e.data.type === 'order-select') {
        setSelectedId(e.data.orderId, 'iframe')
        // 宿主做中枢：把选中 id 转发给详情 iframe
        detailSrc.value = `http://127.0.0.1:3032/?mode=iframe&orderId=${e.data.orderId}`
    }
}
onMounted(() => window.addEventListener('message', onMessage))
onUnmounted(() => window.removeEventListener('message', onMessage))
</script>

<template>
    <PlanShell title="iframe 方案（基线）" desc="隔离最彻底：样式、JS、路由天然独立；代价是通信只能 postMessage、弹窗/路由/登录态处处是墙。两个 iframe 重新加载才切换订单——注意观察详情页的整页刷新。">
        <iframe :src="listSrc" title="订单列表" class="frame"></iframe>
        <iframe :src="detailSrc" title="订单详情" class="frame"></iframe>
    </PlanShell>
</template>

<style scoped>
.frame { flex: 1; width: 100%; border: 1px solid #d8dadf; border-radius: 8px; background: #fff; min-height: 300px; }
</style>
