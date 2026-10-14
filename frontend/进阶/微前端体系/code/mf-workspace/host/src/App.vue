<script setup lang="ts">
// micro-app 全局注册：只需一次 start()，之后 <micro-app> 标签即可用
import microApp from '@micro-zoe/micro-app'

microApp.start({
    tagName: 'micro-app',
    // 实操演示关掉预渲染，让"每次切换重新加载"的行为可观察
    prefetchLevel: 0,
})
</script>

<template>
    <header class="topbar">
        <span class="logo">订单中心 · 微前端宿主</span>
        <nav>
            <RouterLink to="/iframe">iframe</RouterLink>
            <RouterLink to="/qiankun">qiankun</RouterLink>
            <RouterLink to="/micro-app">micro-app</RouterLink>
            <RouterLink to="/wujie">wujie</RouterLink>
            <RouterLink to="/web-components">Web Components</RouterLink>
        </nav>
    </header>
    <RouterView />
</template>

<style>
* { margin: 0; box-sizing: border-box; }
body { font-family: system-ui, 'Microsoft YaHei', sans-serif; background: #f5f6f8; color: #1f2329; }
.topbar {
    display: flex; align-items: center; gap: 24px;
    background: #1e2a38; color: #fff; padding: 10px 20px;
}
.topbar .logo { font-weight: 700; }
.topbar nav { display: flex; gap: 4px; }
.topbar nav a {
    color: #b8c4d0; text-decoration: none; padding: 4px 12px; border-radius: 4px; font-size: 14px;
}
.topbar nav a.router-link-active { background: #2d3e52; color: #fff; }
</style>
