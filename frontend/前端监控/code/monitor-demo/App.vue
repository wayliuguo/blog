<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { cartCount } from './store.js'
import { trackClick } from './useReport.js'

const route = useRoute()
const keyword = ref('')

function onSearch() {
    // 搜索框演示手动埋点：输入即上报（防抖在真实项目里加）
    trackClick('search', { keyword: keyword.value })
}
</script>

<template>
    <div class="shell">
        <!-- H5 顶栏：只留品牌 + 搜索，导航下沉到底部 tabbar -->
        <header class="topbar">
            <router-link to="/" class="logo">🛒 moni</router-link>
            <input
                v-model="keyword"
                class="search"
                placeholder="搜索商品"
                data-track="search_input"
                @keyup.enter="onSearch"
            />
            <button class="search-btn" data-track="search_click" @click="onSearch">搜索</button>
        </header>

        <main>
            <router-view v-slot="{ Component }">
                <transition name="page" mode="out-in">
                    <component :is="Component" />
                </transition>
            </router-view>
        </main>

        <footer class="foot">monitor-sdk 演示商城 · 接入端：node collector.js（5189）</footer>

        <!-- H5 底部 tabbar：三个一级入口，购物车常驻带角标 -->
        <nav class="tabbar">
            <router-link to="/" class="tab" data-track="tab_home">
                <span class="tab-icon">🏠</span>
                <span class="tab-label">首页</span>
            </router-link>
            <router-link to="/lab" class="tab" data-track="tab_lab">
                <span class="tab-icon">🧪</span>
                <span class="tab-label">实验室</span>
            </router-link>
            <router-link to="/cart" class="tab" data-track="tab_cart">
                <span class="tab-icon">🛍️</span>
                <span class="tab-label">购物车</span>
                <span v-if="cartCount" class="badge">{{ cartCount }}</span>
            </router-link>
        </nav>
    </div>
</template>

<style>
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-tap-highlight-color: transparent;
}
:root {
    --brand: #ff5a00;
    --brand-deep: #e84800;
    --bg: #f4f5f7;
    --card: #fff;
    --ink: #1c1e21;
    --ink-2: #6b7280;
    --line: #eef0f2;
    --radius: 14px;
}
html,
body {
    height: 100%;
}
body {
    background: #e9eaee;
    font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'HarmonyOS Sans SC', 'Microsoft YaHei', sans-serif;
    color: var(--ink);
}
/* 移动优先的页面壳：手机全宽，桌面居中成「手机预览」 */
.shell {
    max-width: 480px;
    margin: 0 auto;
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    background: var(--bg);
    box-shadow:
        0 0 0 1px rgba(0, 0, 0, 0.04),
        0 12px 48px rgba(0, 0, 0, 0.12);
}
@media (min-width: 520px) {
    .shell {
        border-radius: 18px;
        margin: 20px auto;
        min-height: calc(100vh - 40px);
    }
}
.topbar {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: calc(10px + env(safe-area-inset-top)) 14px 10px;
    background: linear-gradient(135deg, var(--brand) 0%, #ff8a3c 100%);
    box-shadow: 0 2px 10px rgba(255, 90, 0, 0.25);
}
.logo {
    font-size: 17px;
    font-weight: 800;
    text-decoration: none;
    color: #fff;
    letter-spacing: 0.5px;
    flex-shrink: 0;
}
.search {
    flex: 1;
    min-width: 0;
    padding: 8px 14px;
    border: none;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.92);
    font-size: 13px;
    color: var(--ink);
    outline: none;
}
.search::placeholder {
    color: #b0b4ba;
}
.search-btn {
    flex-shrink: 0;
    padding: 7px 12px;
    border: none;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
    font-size: 13px;
    font-weight: 600;
}
main {
    flex: 1;
    padding: 12px 12px calc(76px + env(safe-area-inset-bottom));
}
/* 页面切换：轻量纵向滑入，不遮采样窗口 */
.page-enter-active,
.page-leave-active {
    transition:
        opacity 0.16s ease,
        transform 0.16s ease;
}
.page-enter-from {
    opacity: 0;
    transform: translateY(8px);
}
.page-leave-to {
    opacity: 0;
}
/* H5 底部 tabbar：毛玻璃 + 安全区 */
.tabbar {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 480px;
    z-index: 20;
    display: flex;
    padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-top: 1px solid var(--line);
}
.tab {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    padding: 4px 0;
    text-decoration: none;
    color: var(--ink-2);
}
.tab-icon {
    font-size: 20px;
    line-height: 1.2;
    filter: grayscale(1);
    opacity: 0.75;
    transition:
        filter 0.2s,
        transform 0.2s;
}
.tab-label {
    font-size: 11px;
    font-weight: 500;
}
.tab.router-link-active {
    color: var(--brand);
}
.tab.router-link-active .tab-icon {
    filter: none;
    opacity: 1;
    transform: scale(1.1);
}
.tab.router-link-active .tab-label {
    font-weight: 700;
}
.badge {
    position: absolute;
    top: -2px;
    right: calc(50% - 22px);
    min-width: 16px;
    text-align: center;
    background: var(--brand);
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    border-radius: 9px;
    padding: 1px 5px;
}
.foot {
    text-align: center;
    color: var(--ink-2);
    font-size: 11px;
    padding: 10px 0 calc(10px + env(safe-area-inset-bottom));
}
button {
    padding: 9px 18px;
    border: none;
    border-radius: 8px;
    background: var(--brand);
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition:
        transform 0.12s,
        background 0.12s;
}
button:active {
    transform: scale(0.97);
    background: var(--brand-deep);
}
button.ghost {
    background: #fff;
    color: var(--brand);
    border: 1px solid var(--brand);
}
button.plain {
    background: #eef0f3;
    color: var(--ink);
}
.foot {
    padding-bottom: calc(70px + env(safe-area-inset-bottom));
}
</style>
