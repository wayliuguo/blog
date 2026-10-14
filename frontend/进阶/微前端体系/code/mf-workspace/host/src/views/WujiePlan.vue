<script setup lang="ts">
// 方案四：wujie（腾讯无界）。JS 跑在隐藏 iframe（天然沙箱），UI 渲染到宿主 shadow DOM。
// WujieVue 组件 props 下行、events 上行（子应用用 window.$wujie.bus.$emit）。
import { ref } from 'vue'
import PlanShell from '../components/PlanShell.vue'
import { setSelectedId } from '../store'

const selectedId = ref('1001')

function onListSelect(id: string) {
    selectedId.value = id
    setSelectedId(id, 'wujie')
}

// 子应用走 UMD 产物：wujie 用真实 iframe 加载 entry html（classic script 正常执行），
// 应用自挂载后由 wujie 代理渲染到宿主 shadow DOM
const listUrl = 'http://127.0.0.1:3033/'
const detailUrl = 'http://127.0.0.1:3034/'
</script>

<template>
    <PlanShell title="wujie（腾讯无界）" desc="iframe 保活 + 影子 DOM 渲染的组合拳：JS 天然隔离且可保活（第二次切换秒开），弹窗可以跨应用逃逸。通信走 wujie 内置 bus。注意观察切回 iframe 方案后再回来——wujie 默认保活，重新挂载不重新执行脚本。">
        <WujieVue
            width="100%"
            height="100%"
            name="vue-list"
            :url="listUrl"
            :props="{ orderId: selectedId }"
            @order-select="onListSelect"
            class="wujie-box"
        ></WujieVue>
        <WujieVue
            width="100%"
            height="100%"
            name="react-detail"
            :url="detailUrl"
            :props="{ orderId: selectedId }"
            class="wujie-box"
        ></WujieVue>
    </PlanShell>
</template>

<style scoped>
.wujie-box { flex: 1; min-height: 300px; background: #fff; border: 1px solid #d8dadf; border-radius: 8px; }
</style>
