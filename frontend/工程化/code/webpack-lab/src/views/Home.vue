<script setup>
import { ref } from 'vue'
import HelloCard from '../components/HelloCard.vue'

const count = ref(0)
</script>

<template>
    <HelloCard title="首页"> 这个视图由路由懒加载切出独立 chunk，首屏不下载。 </HelloCard>

    <button class="btn" @click="count++">点击次数：{{ count }}</button>
</template>
