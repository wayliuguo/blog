<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { showConfirmDialog, showSuccessToast, showToast } from 'vant'
import { copyShow, deleteShow, fetchShowDetail, toggleShowFavorite } from '@/api/show'
import { artistText, formatMoney, posterOf, remainingText, showCost } from '@/utils/format'
import type { ShowRecord } from '@/types'

const route = useRoute()
const router = useRouter()
const id = String(route.params.id)

const show = ref<ShowRecord | null>(null)
const loading = ref(true)
const failed = ref(false)

const poster = computed(() => (show.value ? posterOf(show.value) : ''))
const cost = computed(() => (show.value ? showCost(show.value) : 0))

async function load() {
    loading.value = true
    failed.value = false
    try {
        show.value = await fetchShowDetail(id)
    } catch {
        failed.value = true
    } finally {
        loading.value = false
    }
}

async function onToggleFavorite() {
    if (!show.value) return
    await toggleShowFavorite(id)
    show.value.isFavorite = !show.value.isFavorite
    showToast(show.value.isFavorite ? '已收藏' : '已取消收藏')
}

async function onCopy() {
    await copyShow(id)
    showSuccessToast('已复制到我的记录')
    router.replace({ name: 'shows' })
}

async function onDelete() {
    try {
        await showConfirmDialog({ title: '删除记录', message: '删除后不可恢复，确定继续？' })
    } catch {
        return
    }
    await deleteShow(id)
    showSuccessToast('已删除')
    router.replace({ name: 'shows' })
}

onMounted(load)
</script>

<template>
    <div>
        <van-nav-bar title="演出详情" left-arrow fixed placeholder @click-left="router.back()" />

        <van-loading v-if="loading" class="center" />
        <van-empty v-else-if="failed || !show" description="加载失败或记录不存在">
            <van-button round size="small" type="primary" @click="load">重试</van-button>
        </van-empty>

        <div v-else class="page">
            <van-image v-if="poster" class="poster" :src="poster" fit="cover" radius="12" />

            <div class="card head">
                <h2 class="name">{{ show.title }}</h2>
                <div class="muted">{{ artistText(show.artists) }}</div>
                <div v-if="show.guests?.length" class="muted">嘉宾：{{ artistText(show.guests) }}</div>
                <div class="row">
                    <van-rate :model-value="show.rating || 0" readonly allow-half :size="16" />
                    <span class="muted">{{ remainingText(show.showDate) }}</span>
                </div>
            </div>

            <p class="section-title">演出信息</p>
            <van-cell-group inset>
                <van-cell title="日期" :value="show.showDate" />
                <van-cell title="地点" :value="[show.city, show.venue].filter(Boolean).join(' · ')" />
                <van-cell title="类型" :value="show.category || '未填写'" />
                <van-cell title="票价" :value="show.price ? `¥${formatMoney(show.price)}` : '—'" />
                <van-cell title="其他费用" :value="show.otherFee ? `¥${formatMoney(show.otherFee)}` : '—'" />
                <van-cell title="合计" :value="`¥${formatMoney(cost)}`" />
            </van-cell-group>

            <div class="actions">
                <van-button :icon="show.isFavorite ? 'star' : 'star-o'" block @click="onToggleFavorite">
                    {{ show.isFavorite ? '取消收藏' : '收藏' }}
                </van-button>
                <van-button type="primary" block @click="router.push({ name: 'show-edit', params: { id } })">
                    编辑
                </van-button>
                <van-button block @click="onCopy">复制</van-button>
                <van-button type="danger" plain block @click="onDelete">删除</van-button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.center {
    display: flex;
    justify-content: center;
    padding: 48px 0;
}

.poster {
    width: 100%;
    height: 220px;
    margin-bottom: 12px;
}

.head {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.name {
    margin: 0;
    font-size: 20px;
}

.row {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 20px;
}
</style>
