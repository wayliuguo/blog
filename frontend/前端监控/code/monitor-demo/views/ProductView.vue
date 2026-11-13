<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { findProduct, addToCart } from '../store.js'
import { trackClick } from '../useReport.js'

const route = useRoute()
const product = findProduct(route.params.id)
const qty = ref(1)

const total = computed(() => (product ? product.price * qty.value : 0))

function changeQty(delta) {
    if (qty.value + delta >= 1) {
        qty.value += delta
        trackClick('qty_change', { id: product.id, qty: qty.value })
    }
}

function addCart() {
    addToCart(product, qty.value)
    // 关键转化事件：加购。业务漏斗的第三步
    trackClick('add_cart', { id: product.id, qty: qty.value })
}

async function buyNow() {
    // 立即购买走真实接口：请求耗时、HTTP 错误、慢请求都会被 SDK 采集
    trackClick('buy_click', { id: product.id, qty: qty.value })
    const res = await fetch('/mock/pay', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productId: product.id, qty: qty.value })
    })
    const data = await res.json()
    if (data.ok) {
        trackClick('pay_success', { id: product.id, amount: total.value })
    } else {
        trackClick('pay_fail', { id: product.id, reason: data.reason })
    }
}
</script>

<template>
    <div v-if="product" class="detail">
        <div class="hero">
            <span class="emoji">{{ product.emoji }}</span>
            <div class="info">
                <h2>{{ product.name }}</h2>
                <p class="price">
                    ¥{{ product.price }} <s>日常价 ¥{{ product.origin }}</s>
                </p>
            </div>
        </div>

        <div class="row">
            <span>数量</span>
            <button class="plain" data-track="qty_minus" @click="changeQty(-1)">-</button>
            <b>{{ qty }}</b>
            <button class="plain" data-track="qty_plus" @click="changeQty(1)">+</button>
        </div>

        <ul class="promise">
            <li>顺丰包邮</li>
            <li>七天无理由</li>
            <li>全国联保</li>
        </ul>

        <div class="desc">
            <p class="desc-title">服务承诺</p>
            <p class="desc-text">页面渲染完成后，性能、白屏、路由、行为等数据已经陆续上报。</p>
        </div>

        <!-- H5 底部操作条：加购与购买常驻，不用滚到底部找按钮 -->
        <div class="actions">
            <button class="ghost" data-track="add_cart" @click="addCart">加入购物车</button>
            <button data-track="buy_now" @click="buyNow">立即购买</button>
        </div>
    </div>
</template>

<style scoped>
.detail {
    background: var(--card);
    border-radius: var(--radius);
    padding: 18px 16px 16px;
    padding-bottom: calc(16px + env(safe-area-inset-bottom));
}
.hero {
    display: flex;
    gap: 16px;
    align-items: center;
    background: linear-gradient(120deg, #fff4ec, #ffe9d8);
    border-radius: 12px;
    padding: 16px;
}
.emoji {
    font-size: 64px;
    filter: drop-shadow(0 3px 6px rgba(255, 90, 0, 0.18));
}
.info h2 {
    font-size: 19px;
    font-weight: 700;
}
.price {
    margin-top: 8px;
    color: var(--brand);
    font-size: 20px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}
.price s {
    color: #b6b9be;
    font-size: 12px;
    font-weight: 400;
}
.row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 18px 2px;
    font-size: 14px;
    color: var(--ink-2);
}
.row b {
    color: var(--ink);
    font-size: 16px;
    min-width: 22px;
    text-align: center;
    font-variant-numeric: tabular-nums;
}
.row button {
    width: 34px;
    padding: 6px 0;
    font-size: 16px;
    border-radius: 8px;
}
.promise {
    margin-top: 4px;
    color: var(--ink-2);
    font-size: 12px;
    display: flex;
    gap: 14px;
    list-style: none;
}
.desc {
    margin-top: 18px;
    background: #f7f8fa;
    border-radius: 10px;
    padding: 12px 14px;
}
.desc-title {
    font-size: 13px;
    font-weight: 700;
}
.desc-text {
    margin-top: 6px;
    font-size: 12px;
    color: var(--ink-2);
    line-height: 1.6;
}
/* 底部操作条：左卡右主，比例 2:3 是 H5 商城的通行做法 */
.actions {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 480px;
    display: flex;
    gap: 10px;
    padding: 10px 14px calc(10px + env(safe-area-inset-bottom));
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-top: 1px solid var(--line);
    box-shadow: 0 -4px 16px rgba(24, 28, 36, 0.06);
}
.actions .ghost {
    flex: 2;
}
.actions button:not(.ghost) {
    flex: 3;
}
</style>
