<script setup lang="ts">
import type { ShowRecord } from '@/types'
import { artistText, formatMoney, posterOf, remainingText, showCost } from '@/utils/format'

const props = defineProps<{ show: ShowRecord }>()

const poster = computed(() => posterOf(props.show))
const cost = computed(() => showCost(props.show))
const subtitle = computed(() => [props.show.city, props.show.venue].filter(Boolean).join(' · '))
</script>

<template>
    <div class="show-card card">
        <van-image class="poster" :src="poster" fit="cover" radius="8">
            <template #error>
                <div class="poster poster--empty">无海报</div>
            </template>
        </van-image>

        <div class="body">
            <div class="title-row">
                <span class="title">{{ show.title }}</span>
                <van-icon v-if="show.isFavorite" name="star" color="#f59e0b" />
            </div>
            <div class="muted">{{ artistText(show.artists) }}</div>
            <div class="muted">{{ show.showDate }} {{ subtitle }}</div>
            <div class="bottom">
                <van-tag :type="remainingText(show.showDate).startsWith('已') ? 'default' : 'primary'">
                    {{ remainingText(show.showDate) }}
                </van-tag>
                <span class="cost">¥{{ formatMoney(cost) }}</span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.show-card {
    display: flex;
    gap: 12px;
    margin-bottom: 10px;
}

.poster {
    width: 72px;
    height: 96px;
    flex: none;
    border-radius: 8px;
    overflow: hidden;
}

.poster--empty {
    width: 72px;
    height: 96px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #eef0f3;
    color: var(--app-muted);
    font-size: 12px;
}

.body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.title-row {
    display: flex;
    align-items: center;
    gap: 6px;
}

.title {
    font-size: 15px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.bottom {
    margin-top: auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.cost {
    font-size: 14px;
    font-weight: 600;
}
</style>
