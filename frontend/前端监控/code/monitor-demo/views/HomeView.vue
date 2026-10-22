<script setup>
import { ref, onUnmounted } from 'vue'
import { products, SECKILL_COUNTDOWN } from '../products.js'
import { trackClick } from '../useReport.js'

// 秒杀倒计时：给页面一点「活」的气息，也顺带演示频繁 DOM 更新下的性能采集
const countdown = ref(SECKILL_COUNTDOWN)
const timer = setInterval(() => {
  countdown.value = countdown.value > 0 ? countdown.value - 1 : SECKILL_COUNTDOWN
}, 1000)
onUnmounted(() => clearInterval(timer))

const mm = () => String(Math.floor(countdown.value / 60)).padStart(2, '0')
const ss = () => String(countdown.value % 60).padStart(2, '0')

// 商品点击：手动埋点示例 —— 带维度的业务事件（声明式 data-track 只能带文本）
function onProductClick(p) {
  trackClick('product_click', { id: p.id, price: p.price, tag: p.tag })
}
</script>

<template>
  <div class="home">
    <div class="banner">
      <div class="banner-text">
        <p class="banner-title">超级秒杀日</p>
        <p class="banner-sub">距下一轮开抢 <b>{{ mm() }}</b>:<b>{{ ss() }}</b></p>
      </div>
      <p class="banner-emoji">🔥</p>
    </div>

    <h2 class="sec-title">秒杀好物</h2>
    <div class="grid">
      <!--
        data-expose：声明式曝光 —— 卡片进入视口即上报，观察后注销天然去重
        data-track：声明式点击 —— 事件委托全局接管，动态元素无需逐个绑定
      -->
      <router-link
        v-for="p in products"
        :key="p.id"
        :to="'/product/' + p.id"
        class="card"
        :data-expose="'product_expose:' + p.id"
        :data-track="'product_card_click:' + p.id"
        @click="onProductClick(p)"
      >
        <span v-if="p.tag" class="tag" :class="p.tag === '秒杀' ? 'hot' : ''">{{ p.tag }}</span>
        <div class="emoji">{{ p.emoji }}</div>
        <div class="name">{{ p.name }}</div>
        <div class="price">¥{{ p.price }} <s>¥{{ p.origin }}</s></div>
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.banner {
  display: flex; align-items: center; justify-content: space-between;
  background: linear-gradient(120deg, #ff5a00, #ff9500);
  border-radius: 12px; padding: 26px 28px; color: #fff;
}
.banner-title { font-size: 24px; font-weight: 800; letter-spacing: 2px; }
.banner-sub { margin-top: 6px; font-size: 14px; opacity: .92; }
.banner-emoji { font-size: 44px; }
.sec-title { margin: 20px 0 12px; font-size: 17px; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.card {
  position: relative; background: #fff; border-radius: 10px;
  padding: 18px 12px; text-align: center; text-decoration: none; color: #222;
  box-shadow: 0 1px 4px rgba(0,0,0,.06); transition: transform .15s;
}
.card:hover { transform: translateY(-2px); }
.tag {
  position: absolute; top: 8px; left: 8px;
  background: #eee; color: #666; font-size: 11px;
  border-radius: 4px; padding: 1px 6px;
}
.tag.hot { background: #ffece4; color: #ff5a00; }
.emoji { font-size: 40px; }
.name { margin-top: 8px; font-size: 14px; }
.price { margin-top: 4px; color: #ff5a00; font-weight: 700; font-size: 15px; }
.price s { color: #bbb; font-weight: 400; font-size: 12px; margin-left: 4px; }
</style>
