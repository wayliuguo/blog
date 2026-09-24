<template>
    <div>
        <section class="card">
            <h2>稳定性 · 六类错误（体系篇 · 四）</h2>
            <div class="row" v-for="row in rows" :key="row.key">
                <span>{{ row.label }}</span>
                <button v-if="row.fn" @click="fire(row.fn)">触发</button>
                <span v-else class="note">{{ row.note }}</span>
            </div>
        </section>

        <p class="tip">
            六类抓法无一抓全：资源错误<b>不冒泡</b>只在捕获阶段、Promise 拒绝<b>不走 onerror</b>要单独监听、
            跨域脚本被同源策略抹成一句 <code>Script error.</code>。每类在 Console 都有独立一行，页面隐藏上报的 perf 也会在列。
        </p>
    </div>
</template>

<script setup>
import { triggerRuntime, triggerPromise, triggerResource, triggerHttp, triggerNetwork, triggerCross } from '../monitor.js'

const rows = [
    { key: 'runtime', label: '运行时错误 <code>&lt;error&gt;</code>', fn: triggerRuntime },
    { key: 'promise', label: 'Promise 拒绝 <code>unhandledrejection</code>', fn: triggerPromise },
    { key: 'resource', label: '资源加载失败（捕获阶段，无 message）', fn: triggerResource },
    { key: 'http', label: '接口错误 404 <code>fetch</code>', fn: triggerHttp },
    { key: 'network', label: '网络错误（拒绝连接）', fn: triggerNetwork },
    { key: 'cross', label: '跨域 <code>Script error.</code>', fn: triggerCross },
    { key: 'hint', label: '提示', note: '指纹按 message+位置+行号去重；本页 throttleMs=0 让每一次都出端' }
]

const fire = fn => fn()
</script>