<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
    <div class="app">
        <header class="header">
            <span class="logo"></span>
            <h1 class="title">webpack 生产构建</h1>
            <nav class="nav">
                <RouterLink to="/">首页</RouterLink>
                <RouterLink to="/about">关于</RouterLink>
            </nav>
        </header>

        <main class="main">
            <RouterView />
        </main>

        <p class="tip">页面由手写 MiniHtmlPlugin 生成；样式由手写 loader 交给 MiniCssExtractPlugin 抽成独立 CSS。</p>
    </div>
</template>

<style scoped>
.header {
    display: flex;
    align-items: center;
    gap: 12px;
}

.nav {
    margin-left: auto;
    display: flex;
    gap: 16px;
}

.nav a {
    color: #1f6feb;
    text-decoration: none;
}

.nav a.router-link-active {
    font-weight: 700;
}
</style>
