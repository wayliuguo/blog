<script setup lang="ts">
// 首页：useFetch 在服务端取数（SSR），响应随 HTML 下发，客户端不再重复请求
const { data: summary } = await useFetch('/api/orders/summary')
</script>

<template>
  <main>
    <h1>订单中心（Nuxt）</h1>
    <p>共 {{ summary?.total }} 笔订单，累计 ¥{{ summary?.amount }}</p>
    <ul>
      <li v-for="o in summary?.orders" :key="o.id">
        <NuxtLink :to="`/orders/${o.id}`">#{{ o.id }} {{ o.title }}</NuxtLink>
      </li>
    </ul>
  </main>
</template>
