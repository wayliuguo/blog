<script lang="ts">
// pages/index.vue —— 路由 "/" 由构建期生成；asyncData 只在服务端执行（Nuxt 的 useAsyncData 对应物）
import { orders } from '../src/data'

export default {
    props: ['orders'],
    asyncData() {
        return { orders }
    },
}
</script>

<template>
  <main>
    <h1>订单中心（Vue SSR）</h1>
    <p>共 {{ orders.length }} 笔订单</p>
    <ul>
      <li v-for="o in orders" :key="o.id">
        <a :href="'/order/' + o.id">#{{ o.id }} {{ o.title }}</a>
      </li>
    </ul>
  </main>
</template>
