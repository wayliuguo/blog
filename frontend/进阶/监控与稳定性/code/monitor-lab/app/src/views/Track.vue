<template>
    <div>
        <section class="card">
            <h2>业务 · 声明式埋点（体系篇 · 六）</h2>
            <div class="row">
                <span><code>data-track</code> 点击（事件委托上报）</span>
                <div>
                    <button data-track="cta-hero">开始体验</button>
                    <button data-track="cta-card" class="primary">卡片内按钮</button>
                </div>
                <span class="note">委托点击</span>
            </div>
            <div class="row" data-expose="card-intro">
                <span>首屏可见的卡片</span>
                <span class="note"><code>data-expose</code> 进视口即上报一次</span>
            </div>
            <div class="row">
                <span>自定义事件 <code>track('search',…)</code></span>
                <button @click="doSearch">触发</button>
                <span class="note">keyword 在采集口脱敏</span>
            </div>
            <div class="row">
                <span>PV / 会话</span>
                <button @click="doPv">触发</button>
                <span class="note">anonId + 30min 会话</span>
            </div>
        </section>

        <section class="card" style="min-height: 80px">
            <h2>底部横幅（要滚动到才曝光）</h2>
            <div class="row" data-expose="footer-banner">
                <span>滚动进视口 → IntersectionObserver 上报 <code>expose</code></span>
            </div>
        </section>

        <p class="tip">
            这些元素<b>没有一行采集代码</b>，只有 <code>data-track</code> / <code>data-expose</code> 属性：
            <code>IntersectionObserver</code> 采曝光（首屏不漏、滚到才采），事件委托一次监听覆盖全站。 关闭 /
            刷新页面结算 <code>stay</code> 停留时长一并上报。
        </p>
    </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { sm } from '../monitor.js'

function doSearch() {
    sm.track.track('search', { keyword: '性能优化' })
}
function doPv() {
    sm.track.pageView({ ref: 'direct' })
}

onMounted(() => {
    // 元素已挂载，启用曝光观察（首屏 + id）与委托点击
    sm.track.observeExposure()
    sm.track.listenClicks()
})
</script>
