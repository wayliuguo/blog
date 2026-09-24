<template>
    <div>
        <section class="grid">
            <router-link class="tile" to="/errors">
                <h3><span class="badge">错误</span>稳定性</h3>
                <p class="note">六类错误六种抓法、指纹频控</p>
                <span class="route">/#/errors</span>
            </router-link>
            <router-link class="tile" to="/perf">
                <h3><span class="badge">性能</span>体验</h3>
                <p class="note">RUM 采集、LCP/CLS 越晚越准、评级</p>
                <span class="route">/#/perf</span>
            </router-link>
            <router-link class="tile" to="/track">
                <h3><span class="badge">埋点</span>业务</h3>
                <p class="note">声明式埋点、会话/曝光/点击、脱敏</p>
                <span class="route">/#/track</span>
            </router-link>
        </section>

        <section class="card" style="margin-top: 16px">
            <h2>怎么验证</h2>
            <div class="row">
                <span>SDK 采集到每条事件，入队时打一行</span>
                <span class="note">看 <b>Console</b> 里 <code>[monitor] 采集</code> 的彩色行</span>
            </div>
            <div class="row">
                <span>攒批 / 定时到达，发送时打一行</span>
                <span class="note">看 <code>[monitor] 发送</code> 的条数与 ✓ / ✗</span>
            </div>
            <div class="row">
                <span>每一批真正 POST 出去</span>
                <span class="note">看 <b>Network</b> 里 <code>/collect</code> 的 <code>events</code> 请求体</span>
            </div>
            <div class="row">
                <span>采集端落盘并打印批次摘要</span>
                <span class="note">看跑采集端那个终端的 <code>▼ 收到 N 条</code></span>
            </div>
        </section>

        <p class="tip">
            先进任一页点几下按钮，立刻切回 DevTools 观察。<code>throttleMs:0</code> 让错误不打频控，
            点一次看全六类；线上一般开 3 秒频控。
        </p>
    </div>
</template>

<script setup>
// SDK 在 src/monitor.js 全局初始化，本页不额外触发上报
</script>