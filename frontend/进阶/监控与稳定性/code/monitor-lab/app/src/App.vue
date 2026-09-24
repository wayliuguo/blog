<template>
    <div class="wrap">
        <header class="mast">
            <h1>前端监控 · 单页验证台</h1>
            <p>
                三个路由演示三类上报：<strong>错误 / 性能 / 埋点</strong>。SDK 只负责
                <code>采 → 采样 → 攒批 → 发送</code>，别在页面上找日志面板—— 用 <kbd>F12</kbd> 打开 <b>Console</b>（看
                SDK 开发态彩色日志）与 <b>Network</b> （看 <code>/collect</code> 的请求体）来验证。
            </p>
        </header>

        <nav class="tabs">
            <router-link to="/" exact-active-class="on">首页</router-link>
            <router-link to="/errors" exact-active-class="on">错误 Errors</router-link>
            <router-link to="/perf" exact-active-class="on">性能 Perf</router-link>
            <router-link to="/track" exact-active-class="on">埋点 Track</router-link>
        </nav>

        <main class="body">
            <router-view />
        </main>

        <footer class="tip">页面隐藏（切后台 / 关页）时 SDK 会收口上报 LCP / CLS 终值——它们"越晚越准"。</footer>
    </div>
</template>
