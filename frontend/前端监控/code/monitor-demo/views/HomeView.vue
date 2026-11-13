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
                <p class="banner-sub">
                    距下一轮开抢 <b>{{ mm() }}</b
                    >:<b>{{ ss() }}</b>
                </p>
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
                <div class="price">
                    ¥{{ p.price }} <s>¥{{ p.origin }}</s>
                </div>
            </router-link>
        </div>
    </div>
</template>

<style scoped>
.banner {
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(120deg, #ff5a00, #ff9500);
    border-radius: var(--radius);
    padding: 20px 20px;
    color: #fff;
}
/* 斜向高光条：给纯色渐变一点层次 */
.banner::after {
    content: '';
    position: absolute;
    top: -40%;
    right: -12%;
    width: 55%;
    height: 180%;
    background: rgba(255, 255, 255, 0.14);
    transform: rotate(24deg);
    border-radius: 40px;
}
.banner-text {
    position: relative;
    z-index: 1;
}
.banner-title {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: 2px;
}
.banner-sub {
    margin-top: 6px;
    font-size: 13px;
    opacity: 0.94;
    font-variant-numeric: tabular-nums;
}
.banner-emoji {
    position: relative;
    z-index: 1;
    font-size: 44px;
    filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.18));
}
.sec-title {
    margin: 16px 2px 10px;
    font-size: 16px;
    font-weight: 700;
}
/* H5 双列大卡：单手操作下点击目标更大 */
.grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
}
.card {
    position: relative;
    background: var(--card);
    border-radius: var(--radius);
    padding: 20px 12px 14px;
    text-align: center;
    text-decoration: none;
    color: var(--ink);
    box-shadow: 0 1px 6px rgba(24, 28, 36, 0.06);
    transition:
        transform 0.15s,
        box-shadow 0.15s;
}
.card:active {
    transform: scale(0.97);
    box-shadow: 0 2px 10px rgba(24, 28, 36, 0.12);
}
.tag {
    position: absolute;
    top: 8px;
    left: 8px;
    background: #eef0f3;
    color: var(--ink-2);
    font-size: 11px;
    border-radius: 5px;
    padding: 1px 7px;
    font-weight: 600;
}
.tag.hot {
    background: #ffece4;
    color: var(--brand);
}
.emoji {
    font-size: 48px;
    filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.1));
}
.name {
    margin-top: 10px;
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.price {
    margin-top: 4px;
    color: var(--brand);
    font-weight: 700;
    font-size: 16px;
    font-variant-numeric: tabular-nums;
}
.price s {
    color: #b6b9be;
    font-weight: 400;
    font-size: 12px;
    margin-left: 4px;
}
</style>
