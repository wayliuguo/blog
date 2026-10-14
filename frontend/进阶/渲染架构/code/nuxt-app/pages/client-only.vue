<script setup lang="ts">
// 纯 CSR 页：routeRules 里 ssr: false——服务端只发壳，内容全靠客户端渲染
const now = ref('')
onMounted(() => {
  // onMounted 只在浏览器跑：这里故意用 document，服务端渲染会直接报错
  now.value = new Date().toLocaleString()
})
</script>

<template>
  <main>
    <h1>纯 CSR 页（ssr: false）</h1>
    <p>本页 HTML 里没有这段内容，curl 看不到「当前时间」四个字。</p>
    <p>当前时间：{{ now || '（客户端挂载后出现）' }}</p>
  </main>
</template>
