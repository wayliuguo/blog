<script setup lang="ts">
import { ref } from 'vue'
import { orders } from './data'
import { detectEnv, reportSelect, type Env } from './env'
// 样式独立成文件：dev 走全局注入，WC 构建走 ?inline 注入 shadow DOM（见 wc-entry.ts）
import './app.css'

const env: Env = detectEnv()
const selectedId = ref('')

function select(orderId: string) {
    selectedId.value = orderId
    reportSelect(orderId)
}
</script>

<template>
    <div class="sub-app">
        <header>
            <b>订单列表</b>
            <span class="env">vue-sub · 环境：{{ env }}</span>
        </header>
        <ul>
            <li
                v-for="o in orders"
                :key="o.id"
                :class="{ active: o.id === selectedId }"
                @click="select(o.id)"
            >
                <span class="no">#{{ o.id }}</span>
                <span>{{ o.title }}</span>
                <span class="amount">¥{{ o.amount }}</span>
            </li>
        </ul>
    </div>
</template>

