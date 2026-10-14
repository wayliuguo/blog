<template>
  <div style="font-family: system-ui, sans-serif; max-width: 640px; margin: 24px auto">
    <nav>
      <NuxtLink to="/">首页</NuxtLink> · <NuxtLink to="/orders">订单列表</NuxtLink> ·
      <NuxtLink to="/client-only">纯 CSR 页</NuxtLink>
    </nav>
    <hr />
    <NuxtPage />
  </div>
</template>
