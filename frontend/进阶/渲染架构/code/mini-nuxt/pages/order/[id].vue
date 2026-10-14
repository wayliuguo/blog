<script lang="ts">
// pages/order/[id].vue —— 方括号目录即动态段，params 由服务端路由匹配传入
import { findOrder } from '../../src/data'

export default {
    props: ['order'],
    asyncData({ params }: { params: { id: string } }) {
        return { order: findOrder(params.id) ?? null }
    },
}
</script>

<template>
  <main>
    <template v-if="order">
      <h1>订单 {{ order.id }}</h1>
      <p>{{ order.title }} · ¥{{ order.amount }} · {{ order.status }}</p>
    </template>
    <template v-else>
      <h1>404</h1>
      <p>订单不存在</p>
    </template>
    <a href="/">返回列表</a>
  </main>
</template>
