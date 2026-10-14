<script setup lang="ts">
// 列表页：useOrders() 来自 composables/ 自动导入；本页 routeRules 配了 swr: 10（等价 ISR）
const { data, error } = await useOrders()
</script>

<template>
  <main>
    <h1>订单列表（SWR 10s）</h1>
    <p v-if="error">加载失败：{{ error.message }}</p>
    <ul v-else>
      <li v-for="o in data?.orders" :key="o.id">
        <NuxtLink :to="`/orders/${o.id}`">#{{ o.id }} {{ o.title }} · ¥{{ o.amount }} · {{ o.status }}</NuxtLink>
      </li>
    </ul>
    <NuxtLink to="/orders/new">新建订单 →</NuxtLink>
  </main>
</template>
