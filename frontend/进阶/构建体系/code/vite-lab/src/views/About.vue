<script setup>
import { inject } from 'vue'

const appInfo = inject('appInfo')
</script>

<template>
    <section>
        <h2>关于</h2>
        <p class="tip">这一页是独立 chunk，导航到 /about 时才下载。</p>
        <p class="tip">虚拟模块：{{ appInfo.build.name }} ({{ appInfo.build.mode }})</p>
    </section>
</template>