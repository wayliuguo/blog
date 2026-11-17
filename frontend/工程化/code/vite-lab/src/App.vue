<script setup>
import { inject } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { helper } from './helper.js'

const appInfo = inject('appInfo')
</script>

<template>
    <div class="app">
        <header class="header">
            <h1 class="title">Vite 生产构建</h1>
            <nav class="nav">
                <RouterLink to="/">首页</RouterLink>
                <RouterLink to="/about">关于</RouterLink>
            </nav>
        </header>

        <main class="main">
            <RouterView />
        </main>

        <p class="tip">{{ helper() }} · {{ appInfo.appName }} · prod={{ appInfo.inProd }}</p>
    </div>
</template>

<style scoped>
.header {
    display: flex;
    align-items: baseline;
    gap: 16px;
}

.nav {
    display: flex;
    gap: 12px;
}

.nav a {
    color: #646cff;
    text-decoration: none;
}

.nav a.router-link-active {
    font-weight: 700;
}
</style>
