<script setup lang="ts">
// 方案三：micro-app（京东）。Web Components 化接入：宿主只写 <micro-app> 标签，
// data 下行、@datachange 上行，子应用几乎零改造。
// 子应用走 UMD 产物（与 qiankun 共用 build:qk 产物）——micro-app 执行 classic script
// 后期待应用自挂载，不调任何生命周期协议。
import { ref } from 'vue'
import PlanShell from '../components/PlanShell.vue'
import { setSelectedId } from '../store'

const listUrl = 'http://127.0.0.1:3033/'
const detailUrl = 'http://127.0.0.1:3034/'
const selectedId = ref('1001')

// 列表子应用通过 window.microApp.dispatch 上抛的数据在这里收到
function onListData(e: CustomEvent<{ type: string; orderId: string }>) {
    if (e.detail?.type === 'order-select') {
        selectedId.value = e.detail.orderId
        setSelectedId(e.detail.orderId, 'micro-app')
    }
}
</script>

<template>
    <PlanShell title="micro-app（京东）" desc="像写普通组件一样接微前端：一个 <micro-app> 标签 + data 属性下行 + dispatch 事件上行。子应用不需要导出生命周期。子应用消费 UMD 产物（与 qiankun 共用）。">
        <micro-app
            name="vue-list"
            :url="listUrl"
            :data="{ orderId: selectedId }"
            @datachange="onListData"
            class="micro"
        ></micro-app>
        <micro-app
            name="react-detail"
            :url="detailUrl"
            :data="{ orderId: selectedId }"
            class="micro"
        ></micro-app>
    </PlanShell>
</template>

<style scoped>
.micro { flex: 1; min-height: 300px; display: block; background: #fff; border: 1px solid #d8dadf; border-radius: 8px; }
</style>
