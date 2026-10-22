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
    <header class="topbar">
      <router-link to="/" class="logo">🛒 moni 商城</router-link>
      <nav>
        <router-link to="/" class="nav-link">首页</router-link>
        <router-link to="/lab" class="nav-link lab-link">实验室</router-link>
      </nav>
      <input v-model="keyword" class="search" placeholder="搜索商品" @keyup.enter="onSearch" />
      <router-link to="/cart" class="cart">
        购物车
        <span v-if="cartCount" class="badge">{{ cartCount }}</span>
      </router-link>
    </header>

    <main>
      <router-view />
    </main>

    <footer class="foot">monitor-sdk 演示商城 · 接入端：node collector.js（5189）</footer>
  </div>
</template>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #f5f6f8; font-family: system-ui, -apple-system, sans-serif; color: #222; }
.shell { max-width: 760px; margin: 0 auto; min-height: 100vh; display: flex; flex-direction: column; }
.topbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; gap: 14px;
  padding: 12px 18px; background: #fff;
  box-shadow: 0 1px 6px rgba(0,0,0,.08);
}
.logo { font-size: 18px; font-weight: 700; text-decoration: none; color: #ff5a00; }
.nav { display: flex; gap: 10px; }
.nav-link { text-decoration: none; color: #555; font-size: 14px; }
.nav-link.router-link-active { color: #ff5a00; font-weight: 600; }
.search { flex: 1; max-width: 200px; margin-left: auto; padding: 6px 10px; border: 1px solid #ddd; border-radius: 16px; font-size: 13px; }
.cart { position: relative; text-decoration: none; color: #333; font-size: 14px; font-weight: 600; }
.badge {
  position: absolute; top: -8px; right: -14px;
  background: #ff5a00; color: #fff; font-size: 11px;
  border-radius: 10px; padding: 1px 5px;
}
main { flex: 1; padding: 18px; }
.foot { text-align: center; color: #999; font-size: 12px; padding: 16px; }
button {
  padding: 8px 16px; border: none; border-radius: 6px;
  background: #ff5a00; color: #fff; font-size: 14px; cursor: pointer;
}
button.ghost { background: #fff; color: #ff5a00; border: 1px solid #ff5a00; }
button.plain { background: #eee; color: #333; }
</style>
