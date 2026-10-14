<script setup lang="ts">
import { hostState } from '../store'
defineProps<{ title: string; desc: string }>()
</script>

<template>
    <div class="plan">
        <aside class="panel">
            <h2>{{ title }}</h2>
            <p class="desc">{{ desc }}</p>
            <div class="state">
                <div>当前选中订单：<b>{{ hostState.selectedId }}</b></div>
                <div>最后通信通道：{{ hostState.lastChannel }}</div>
            </div>
            <div class="log">
                <div class="log-title">事件日志</div>
                <div v-for="line in hostState.eventLog" :key="line" class="log-line">{{ line }}</div>
            </div>
        </aside>
        <main class="stage"><slot /></main>
    </div>
</template>

<style scoped>
.plan { display: flex; gap: 16px; padding: 16px; }
.panel { width: 300px; flex-shrink: 0; background: #fff; border-radius: 8px; padding: 16px; }
.panel h2 { font-size: 16px; margin-bottom: 8px; }
.desc { font-size: 12px; color: #646a73; line-height: 1.6; margin-bottom: 12px; }
.state { background: #f2f6ff; border-radius: 6px; padding: 10px; font-size: 13px; line-height: 1.9; margin-bottom: 12px; }
.log { font-size: 12px; }
.log-title { font-weight: 600; margin-bottom: 6px; }
.log-line { color: #646a73; padding: 2px 0; border-bottom: 1px dashed #eee; word-break: break-all; }
.stage { flex: 1; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
</style>
