<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { findProduct, addToCart } from '../store.js'
import { trackClick } from '../useReport.js'

const route = useRoute()
const router = useRouter()
const product = findProduct(route.params.id)
const qty = ref(1)

const total = computed(() => product ? product.price * qty.value : 0)

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

function goCart() {
  router.push('/cart')
}
</script>

<template>
  <div v-if="product" class="detail">
    <div class="hero">
      <span class="emoji">{{ product.emoji }}</span>
      <div class="info">
        <h2>{{ product.name }}</h2>
        <p class="price">¥{{ product.price }} <s>日常价 ¥{{ product.origin }}</s></p>
      </div>
    </div>

    <div class="row">
      <span>数量</span>
      <button class="plain" @click="changeQty(-1)">-</button>
      <b>{{ qty }}</b>
      <button class="plain" @click="changeQty(1)">+</button>
    </div>

    <div class="actions">
      <button class="ghost" @click="addCart">加入购物车</button>
      <button @click="buyNow">立即购买</button>
      <button class="plain" @click="goCart">查看购物车</button>
    </div>

    <ul class="promise">
      <li>顺丰包邮</li>
      <li>七天无理由</li>
      <li>全国联保</li>
    </ul>
  </div>
</template>

<style scoped>
.detail { background: #fff; border-radius: 10px; padding: 22px; }
.hero { display: flex; gap: 20px; align-items: center; }
.emoji { font-size: 72px; }
.info h2 { font-size: 20px; }
.price { margin-top: 8px; color: #ff5a00; font-size: 20px; font-weight: 700; }
.price s { color: #bbb; font-size: 13px; font-weight: 400; }
.row { display: flex; align-items: center; gap: 12px; margin: 22px 0; }
.actions { display: flex; gap: 10px; }
.promise { margin-top: 22px; color: #888; font-size: 12px; display: flex; gap: 16px; list-style: none; }
</style>
