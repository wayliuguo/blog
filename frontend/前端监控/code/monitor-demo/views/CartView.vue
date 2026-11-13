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
        errorReport(e, { flow: 'order', total: String(cartTotal.value) })
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
        <div v-if="!cart.items.length" class="empty">
            <p class="empty-emoji">🧺</p>
            <p class="empty-text">购物车是空的，去首页挑一件吧</p>
            <router-link to="/" class="empty-link">去逛逛</router-link>
        </div>
        <ul v-else>
            <li v-for="it in cart.items" :key="it.id" class="item">
                <span class="emoji">{{ it.emoji }}</span>
                <span class="name">{{ it.name }}</span>
                <span class="qty">× {{ it.qty }}</span>
                <span class="price">¥{{ it.price * it.qty }}</span>
            </li>
        </ul>

        <!-- H5 固定结算条：合计与提交常驻底部 -->
        <div v-if="cart.items.length" class="bar">
            <span class="bar-total"
                >合计 <b class="total">¥{{ cartTotal }}</b></span
            >
            <button data-track="submit_order" @click="submitOrder">提交订单</button>
        </div>

        <transition name="fade">
            <div v-if="toast" class="toast">{{ toast }}</div>
        </transition>
    </div>
</template>

<style scoped>
.cart-view {
    background: var(--card);
    border-radius: var(--radius);
    padding: 18px 16px 16px;
    padding-bottom: calc(90px + env(safe-area-inset-bottom));
}
h2 {
    margin-bottom: 12px;
    font-size: 18px;
}
.empty {
    text-align: center;
    padding: 46px 0 30px;
}
.empty-emoji {
    font-size: 52px;
    filter: grayscale(0.4);
}
.empty-text {
    margin-top: 10px;
    color: var(--ink-2);
    font-size: 13px;
}
.empty-link {
    display: inline-block;
    margin-top: 14px;
    padding: 8px 26px;
    background: var(--brand);
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    border-radius: 18px;
    text-decoration: none;
}
.item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 2px;
    border-bottom: 1px solid var(--line);
    list-style: none;
    font-size: 14px;
}
.emoji {
    font-size: 32px;
}
.name {
    flex: 1;
    font-weight: 600;
}
.qty {
    color: var(--ink-2);
    font-variant-numeric: tabular-nums;
}
.price {
    color: var(--brand);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}
/* 结算条与商品页操作条同一套 H5 范式 */
.bar {
    position: fixed;
    bottom: calc(58px + env(safe-area-inset-bottom));
    left: 50%;
    transform: translateX(-50%);
    width: calc(100% - 24px);
    max-width: 456px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--card);
    border-radius: var(--radius);
    box-shadow: 0 4px 18px rgba(24, 28, 36, 0.12);
    padding: 10px 14px;
}
.bar-total {
    font-size: 13px;
    color: var(--ink-2);
}
.total {
    color: var(--brand);
    font-size: 19px;
    font-variant-numeric: tabular-nums;
}
.toast {
    position: fixed;
    left: 50%;
    bottom: calc(110px + env(safe-area-inset-bottom));
    transform: translateX(-50%);
    background: rgba(28, 30, 33, 0.86);
    color: #fff;
    font-size: 13px;
    border-radius: 18px;
    padding: 9px 20px;
    z-index: 99;
    backdrop-filter: blur(6px);
}
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
