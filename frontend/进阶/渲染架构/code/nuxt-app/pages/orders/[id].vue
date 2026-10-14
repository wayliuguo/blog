<script setup lang="ts">
// 详情页：useRoute() 自动导入拿动态段参数
const route = useRoute()
const id = route.params.id as string
const { data: order, error } = await useFetch(`/api/orders/${id}`)
</script>

<template>
  <main>
    <template v-if="order">
      <h1>订单 {{ order.id }}（SWR 10s）</h1>
      <p>{{ order.title }} · ¥{{ order.amount }} · {{ order.status }}</p>
    </template>
    <template v-else-if="error">
      <h1>404</h1>
      <p>订单不存在</p>
    </template>
    <NuxtLink to="/orders">返回列表</NuxtLink>
  </main>
</template>
