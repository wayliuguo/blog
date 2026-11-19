<script setup lang="ts">
import { useMeStore } from '@/stores/me'
import { ENV, TOKEN_HINT } from '@/env'
import { formatMoney } from '@/utils/format'

const me = useMeStore()

const stats = computed(() => me.stats)
const tokenState = computed(() => (ENV.apiToken ? '已配置' : '未配置'))

onMounted(() => me.load())
</script>

<template>
    <div class="page">
        <div class="card profile">
            <van-image round width="56" height="56" :src="me.profile.avatar">
                <template #error>
                    <van-icon name="user-circle-o" size="56" color="#c8ccd4" />
                </template>
            </van-image>
            <div class="who">
                <div class="nickname">{{ me.profile.nickname || '未获取到昵称' }}</div>
                <div class="muted">{{ me.profile.bio || '赴演记 · 记录你的每一场演出' }}</div>
            </div>
        </div>

        <div class="stats">
            <div class="stat">
                <span class="num">{{ stats?.totalShows ?? '—' }}</span>
                <span class="muted">场演出</span>
            </div>
            <div class="stat">
                <span class="num">¥{{ formatMoney(stats?.totalSpent) }}</span>
                <span class="muted">总花费</span>
            </div>
            <div class="stat">
                <span class="num">{{ stats?.cityCount ?? stats?.byCity?.length ?? 0 }}</span>
                <span class="muted">个城市</span>
            </div>
        </div>

        <p class="section-title">运行信息</p>
        <van-cell-group inset>
            <van-cell title="应用名称" :value="ENV.appTitle" />
            <van-cell title="接口地址" :value="ENV.apiBase" />
            <van-cell title="资源域名" :value="ENV.assetBase" />
            <van-cell title="API Token" :value="tokenState" />
            <van-cell title="构建工具" :value="ENV.bundler" />
        </van-cell-group>

        <p v-if="!ENV.apiToken" class="tip">{{ TOKEN_HINT }}</p>

        <div class="refresh">
            <van-button block @click="me.load(true)">刷新数据</van-button>
        </div>
    </div>
</template>

<style scoped>
.profile {
    display: flex;
    align-items: center;
    gap: 12px;
}

.who {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.nickname {
    font-size: 17px;
    font-weight: 600;
}

.stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-top: 12px;
}

.stat {
    background: var(--app-card);
    border-radius: var(--app-radius);
    padding: 14px 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
}

.num {
    font-size: 17px;
    font-weight: 600;
}

.tip {
    margin: 16px 4px 0;
    padding: 12px;
    border-radius: var(--app-radius);
    background: #fff7e6;
    color: #b45309;
    font-size: 12px;
    line-height: 1.6;
}

.refresh {
    margin: 24px 0 40px;
}
</style>
