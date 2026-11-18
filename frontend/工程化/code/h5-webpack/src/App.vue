<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'

const route = useRoute()
// 详情、表单页不显示底部导航
const showTabbar = computed(() => ['shows', 'stats', 'mine'].includes(String(route.name)))
</script>

<template>
    <div class="app">
        <RouterView />
        <van-tabbar v-if="showTabbar" route fixed placeholder safe-area-inset-bottom>
            <van-tabbar-item replace to="/shows" icon="apps-o">演出</van-tabbar-item>
            <van-tabbar-item replace to="/stats" icon="chart-trending-o">统计</van-tabbar-item>
            <van-tabbar-item replace to="/mine" icon="user-o">我的</van-tabbar-item>
        </van-tabbar>
    </div>
</template>

<style scoped>
.app {
    min-height: 100vh;
}
</style>
