<script setup lang="ts">
// 方案二：qiankun（single-spa 系）。宿主用 loadMicroApp 手动加载两个子应用，
// 生命周期协议（bootstrap/mount/unmount）由子应用导出，通信只走 initGlobalState 一条通道
// （宿主侧订阅在 register-micro-apps.ts，收到 selectedId 后写进中枢 store）。
import { onMounted, onUnmounted, ref } from 'vue'
import { loadMicroApp } from 'qiankun'
import PlanShell from '../components/PlanShell.vue'

const listRef = ref<HTMLElement>()
const detailRef = ref<HTMLElement>()
let listApp: ReturnType<typeof loadMicroApp> | null = null
let detailApp: ReturnType<typeof loadMicroApp> | null = null

// loadMicroApp 返回带 mountPromise 的句柄，卸载时必须 unmount，否则内存与事件都留在页面里
onMounted(async () => {
    // 子应用走 UMD 产物（build:qk + preview:qk）：qiankun 拉取 entry html、
    // 提取 UMD script 执行、从 exports 找 bootstrap/mount/unmount
    listApp = loadMicroApp({
        name: 'vue-list',
        entry: 'http://127.0.0.1:3033/',
        container: listRef.value!,
        props: { initialOrderId: '1001' },
    })
    detailApp = loadMicroApp({
        name: 'react-detail',
        entry: 'http://127.0.0.1:3034/',
        container: detailRef.value!,
        props: { initialOrderId: '1001' },
    })
    await Promise.all([listApp.mountPromise, detailApp.mountPromise])
})

onUnmounted(async () => {
    await Promise.allSettled([listApp?.unmount(), detailApp?.unmount()])
})
</script>

<template>
    <PlanShell title="qiankun（single-spa 系）" desc="子应用导出 bootstrap/mount/unmount 生命周期，宿主 fetch 子应用 HTML 后提取脚本执行并接管沙箱。通信走 initGlobalState 共享 state。观察：切换路由再回来会重新 mount——子应用被完整卸载重建。">
        <div ref="listRef" class="container"></div>
        <div ref="detailRef" class="container"></div>
    </PlanShell>
</template>

<style scoped>
.container { flex: 1; min-height: 300px; background: #fff; border: 1px solid #d8dadf; border-radius: 8px; }
</style>
