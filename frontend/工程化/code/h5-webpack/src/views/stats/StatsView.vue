<script setup lang="ts">
import { fetchFilterOptions, fetchStatsOverview } from '@/api/stats'
import { formatMoney, showCost } from '@/utils/format'
import type { StatsOverview } from '@/types'

type Dimension = 'byStar' | 'byCity' | 'byType'

const currentYear = new Date().getFullYear()
const years = ref<number[]>([currentYear])
const startYear = ref(String(currentYear))
const endYear = ref(String(currentYear))
const overview = ref<StatsOverview | null>(null)
const loading = ref(false)
const dimension = ref<Dimension>('byCity')

const yearOptions = computed(() => (years.value.length ? years.value : [currentYear]).map((y) => ({
    text: `${y} 年`,
    value: String(y)
})))

const dimensionTabs = [
    { name: 'byCity', title: '城市' },
    { name: 'byStar', title: '艺人' },
    { name: 'byType', title: '类型' }
]

const monthly = computed(() => {
    const buckets = Array.from({ length: 12 }, () => ({ count: 0, spent: 0 }))
    ;(overview.value?.monthly || []).forEach((item) => {
        const month = Number(item.month.slice(5, 7))
        if (month >= 1 && month <= 12) {
            buckets[month - 1].count += item.count || 0
            buckets[month - 1].spent += item.spent || 0
        }
    })
    return buckets.map((bucket, index) => ({ label: `${index + 1}月`, ...bucket }))
})

const maxMonthly = computed(() => Math.max(1, ...monthly.value.map((item) => item.spent)))

/** 不同维度的原始字段名不同，这里统一成 name / count / totalSpent */
const ranking = computed(() => {
    const source = overview.value
    if (!source) return []
    const raw =
        dimension.value === 'byCity'
            ? (source.byCity || []).map((item) => ({ name: item.city, ...item }))
            : dimension.value === 'byStar'
              ? source.byStar || []
              : (source.byType || []).map((item) => ({ name: item.type, ...item }))

    const rows = raw
        .map((item) => ({
            name: item.name || '',
            count: item.count || 0,
            spent: item.totalSpent || 0
        }))
        .sort((a, b) => b.spent - a.spent)

    const totalSpent = rows.reduce((sum, item) => sum + item.spent, 0)
    return rows.slice(0, 10).map((item) => ({
        ...item,
        percent: totalSpent > 0 ? Math.round((item.spent / totalSpent) * 1000) / 10 : 0
    }))
})

const avgCost = computed(() => {
    const total = overview.value?.totalShows || 0
    return total > 0 ? (overview.value?.totalSpent || 0) / total : 0
})

async function load() {
    loading.value = true
    try {
        overview.value = await fetchStatsOverview(Number(startYear.value), Number(endYear.value))
    } catch {
        // 提示已在 request 层统一处理，这里保持旧数据
    } finally {
        loading.value = false
    }
}

onMounted(async () => {
    try {
        const options = await fetchFilterOptions()
        if (options.years?.length) years.value = options.years
    } catch {
        // 拉不到年份选项就只用当前年
    }
    await load()
})
</script>

<template>
    <div class="page">
        <van-dropdown-menu>
            <van-dropdown-item v-model="startYear" :options="yearOptions" @change="load" />
            <van-dropdown-item v-model="endYear" :options="yearOptions" @change="load" />
        </van-dropdown-menu>

        <div class="grid">
            <div class="cell">
                <span class="num">{{ overview?.totalShows ?? '—' }}</span>
                <span class="muted">总场次</span>
            </div>
            <div class="cell">
                <span class="num">¥{{ formatMoney(overview?.totalSpent) }}</span>
                <span class="muted">总花费</span>
            </div>
            <div class="cell">
                <span class="num">¥{{ formatMoney(avgCost) }}</span>
                <span class="muted">场均花费</span>
            </div>
            <div class="cell">
                <span class="num">{{ overview?.cityCount ?? overview?.byCity?.length ?? 0 }}</span>
                <span class="muted">去过的城市</span>
            </div>
        </div>

        <p class="section-title">月度花费</p>
        <div class="card">
            <div v-for="item in monthly" :key="item.label" class="bar-row">
                <span class="bar-label">{{ item.label }}</span>
                <van-progress
                    class="bar"
                    :percentage="Math.round((item.spent / maxMonthly) * 100)"
                    :show-pivot="false"
                    stroke-width="6"
                />
                <span class="bar-value">¥{{ formatMoney(item.spent) }}</span>
            </div>
        </div>

        <p class="section-title">分布</p>
        <van-tabs v-model:active="dimension" shrink>
            <van-tab v-for="tab in dimensionTabs" :key="tab.name" :name="tab.name" :title="tab.title" />
        </van-tabs>
        <div class="card">
            <van-loading v-if="loading" />
            <van-empty v-else-if="!ranking.length" description="所选区间没有数据" />
            <div v-for="item in ranking" v-else :key="item.name" class="rank-row">
                <div class="rank-head">
                    <span class="rank-name">{{ item.name }}</span>
                    <span class="muted">{{ item.count }} 场 · ¥{{ formatMoney(item.spent) }}</span>
                </div>
                <van-progress
                    :percentage="Math.max(2, item.percent)"
                    :show-pivot="false"
                    stroke-width="6"
                    color="#4e79a7"
                />
            </div>
        </div>
    </div>
</template>

<style scoped>
.grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 12px;
}

.cell {
    background: var(--app-card);
    border-radius: var(--app-radius);
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.num {
    font-size: 20px;
    font-weight: 600;
}

.bar-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
}

.bar-label {
    width: 34px;
    font-size: 12px;
    color: var(--app-muted);
}

.bar {
    flex: 1;
}

.bar-value {
    width: 64px;
    text-align: right;
    font-size: 12px;
}

.rank-row {
    padding: 8px 0;
}

.rank-head {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
    font-size: 13px;
}

.rank-name {
    font-weight: 500;
}
</style>
