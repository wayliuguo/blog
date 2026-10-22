<script setup>
import { ref } from 'vue'
import { cart, cartTotal } from '../store.js'
import { trackClick, errorReport } from '../useReport.js'

// 提交订单：业务事件 + 已知异常手动上报在同一流程里协作的完整示例
// 成功路径 trackClick('order_submit' → 'order_done')，异常路径 errorReport 带流程标签
const toast = ref('')

// 提示不用 alert：阻塞式弹窗会卡住页面主线程（自动化测试也会被它挂死）
function notify(msg) {
  toast.value = msg
  setTimeout(() => (toast.value = ''), 2600)
}

async function submitOrder() {
  trackClick('order_submit', { items: cart.items.length, total: cartTotal.value })

  // 订单校验：故意演示「业务 catch 里手动上报」——errorReport 走 SDK 的 report()，
  // 栈由 SDK 从 Error 实例归一拆出，流程标签随事件上报
  try {
    const payload = buildPayload()
    const res = await fetch('/mock/pay', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (data.ok) {
      trackClick('order_done', { total: cartTotal.value })
      cart.items.length = 0
      notify('下单成功（演示）')
    } else {
      trackClick('order_fail', { reason: data.reason })
      notify('支付失败：' + data.reason)
    }
  } catch (e) {
    errorReport(e, { flow: 'order' }, { total: cartTotal.value })
    notify('下单异常，已上报（看 collector 终端）')
  }
}

// 50% 概率抛错：演示页需要可复现的异常源，真实业务里这是任何一段会抛的代码
function buildPayload() {
  if (Math.random() < 0.5) {
    JSON.parse('{bad json}') // SyntaxError → 进 catch → errorReport
  }
  return { items: cart.items, total: cartTotal.value }
}
</script>

<template>
  <div class="cart-view">
    <h2>购物车</h2>
    <p v-if="!cart.items.length" class="empty">购物车是空的，去首页挑一件吧</p>
    <ul v-else>
      <li v-for="it in cart.items" :key="it.id" class="item">
        <span class="emoji">{{ it.emoji }}</span>
        <span class="name">{{ it.name }}</span>
        <span class="qty">× {{ it.qty }}</span>
        <span class="price">¥{{ it.price * it.qty }}</span>
      </li>
    </ul>

    <div v-if="cart.items.length" class="bar">
      <span>合计 <b class="total">¥{{ cartTotal }}</b></span>
      <button @click="submitOrder">提交订单</button>
    </div>

    <transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </div>
</template>

<style scoped>
.cart-view { background: #fff; border-radius: 10px; padding: 22px; }
h2 { margin-bottom: 14px; }
.empty { color: #999; padding: 30px 0; text-align: center; }
.item { display: flex; align-items: center; gap: 14px; padding: 12px 0; border-bottom: 1px solid #f2f2f2; list-style: none; }
.emoji { font-size: 30px; }
.name { flex: 1; }
.qty { color: #888; }
.price { color: #ff5a00; font-weight: 700; }
.bar { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; }
.total { color: #ff5a00; font-size: 18px; }
.toast {
  position: fixed; left: 50%; bottom: 60px; transform: translateX(-50%);
  background: rgba(0,0,0,.78); color: #fff; font-size: 13px;
  border-radius: 18px; padding: 8px 18px; z-index: 99;
}
.fade-enter-active, .fade-leave-active { transition: opacity .3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
