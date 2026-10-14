<script setup lang="ts">
// 新建订单：$fetch 直调 server API，成功后跳详情
const title = ref('')
const amount = ref<number | null>(null)
const error = ref('')

async function submit() {
  error.value = ''
  try {
    const res = await $fetch<{ id: string }>('/api/orders', {
      method: 'POST',
      body: { title: title.value, amount: amount.value },
    })
    await navigateTo(`/orders/${res.id}`)
  } catch (e: any) {
    error.value = e?.statusMessage ?? '提交失败'
  }
}
</script>

<template>
  <main>
    <h1>新建订单（Nitro API）</h1>
    <form @submit.prevent="submit">
      <p><input v-model="title" placeholder="商品标题" required /></p>
      <p><input v-model.number="amount" type="number" min="1" placeholder="金额" required /></p>
      <button type="submit">提交</button>
      <p v-if="error" style="color: red">{{ error }}</p>
    </form>
  </main>
</template>
