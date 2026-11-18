<script setup lang="ts">
import { useRouter } from 'vue-router'
import { fetchShows } from '@/api/show'
import { fetchFilterOptions } from '@/api/stats'
import ShowCard from '@/components/ShowCard.vue'
import type { FilterOptions, ShowListParams, ShowRecord } from '@/types'

const router = useRouter()
const PAGE_SIZE = 20

type StatusKey = 'all' | 'upcoming' | 'performed' | 'favorite'

const status = ref<StatusKey>('all')
const statusOptions: Array<{ text: string; value: StatusKey }> = [
    { text: '全部', value: 'all' },
    { text: '待开演', value: 'upcoming' },
    { text: '已开演', value: 'performed' },
    { text: '收藏', value: 'favorite' }
]

const filters = reactive({ year: '', category: '', city: '', artist: '' })
const options = ref<FilterOptions>({ years: [], cities: [], types: [], artists: [] })

const list = ref<ShowRecord[]>([])
const page = ref(1)
const total = ref(0)
const loading = ref(false)
const finished = ref(false)
const failed = ref(false)
const refreshing = ref(false)

const yearOptions = computed(() => [
    { text: '全部年份', value: '' },
    ...(options.value.years || []).map((year) => ({ text: `${year} 年`, value: String(year) }))
])
const categoryOptions = computed(() => [
    { text: '全部类型', value: '' },
    ...(options.value.types || []).map((type) => ({ text: type, value: type }))
])
const cityOptions = computed(() => [
    { text: '全部城市', value: '' },
    ...(options.value.cities || []).map((city) => ({ text: city, value: city }))
])
const artistOptions = computed(() => [
    { text: '全部艺人', value: '' },
    ...(options.value.artists || []).map((artist) => {
        const name = typeof artist === 'string' ? artist : artist.name
        return { text: name, value: name }
    })
])

const isEmpty = computed(() => !loading.value && !refreshing.value && list.value.length === 0)

/** 把界面上的筛选值翻成列表接口的入参 */
function buildParams(pageNo: number): ShowListParams {
    const params: ShowListParams = { page: pageNo, pageSize: PAGE_SIZE }
    if (filters.year) params.years = [Number(filters.year)]
    if (filters.category) params.categories = [filters.category]
    if (filters.city) params.cities = [filters.city]
    if (filters.artist) params.artistNames = [filters.artist]
    if (status.value === 'favorite') params.isFavorite = true
    else if (status.value !== 'all') params.status = status.value
    return params
}

async function onLoad() {
    if (finished.value) {
        loading.value = false
        return
    }
    try {
        const res = await fetchShows(buildParams(page.value))
        const items = res.items || []
        list.value = page.value === 1 ? items : list.value.concat(items)
        total.value = res.meta?.totalItems ?? list.value.length
        page.value += 1
        finished.value = list.value.length >= total.value
    } catch {
        failed.value = true
        finished.value = true
    } finally {
        loading.value = false
        refreshing.value = false
    }
}

/** 筛选变化后清空重来：页码、总量、结束标记全部归零 */
function reload() {
    list.value = []
    page.value = 1
    total.value = 0
    finished.value = false
    failed.value = false
    loading.value = true
    void onLoad()
}

function goDetail(show: ShowRecord) {
    router.push({ name: 'show-detail', params: { id: show.id } })
}

watch(status, reload)

onMounted(async () => {
    try {
        const result = await fetchFilterOptions()
        options.value = {
            years: result.years || [],
            cities: result.cities || [],
            types: result.types || [],
            artists: result.artists || []
        }
    } catch {
        // 筛选选项拉不到不影响列表本身，保持空选项即可
    }
})
</script>

<template>
    <div class="page">
        <van-tabs v-model:active="status" shrink>
            <van-tab v-for="item in statusOptions" :key="item.value" :name="item.value" :title="item.text" />
        </van-tabs>

        <van-dropdown-menu>
            <van-dropdown-item v-model="filters.year" :options="yearOptions" @change="reload" />
            <van-dropdown-item v-model="filters.category" :options="categoryOptions" @change="reload" />
            <van-dropdown-item v-model="filters.city" :options="cityOptions" @change="reload" />
            <van-dropdown-item v-model="filters.artist" :options="artistOptions" @change="reload" />
        </van-dropdown-menu>

        <van-pull-refresh v-model="refreshing" @refresh="reload">
            <van-list
                v-model:loading="loading"
                :finished="finished"
                :finished-text="list.length ? '没有更多了' : ''"
                @load="onLoad"
            >
                <ShowCard v-for="show in list" :key="show.id" :show="show" @click="goDetail(show)" />
            </van-list>

            <van-empty v-if="isEmpty && failed" description="加载失败，检查网络或 token 后重试">
                <van-button round type="primary" size="small" @click="reload">重新加载</van-button>
            </van-empty>
            <van-empty v-else-if="isEmpty" description="还没有演出记录" />
        </van-pull-refresh>

        <div class="fab">
            <van-button round type="primary" icon="plus" @click="router.push({ name: 'show-create' })">
                记录一场
            </van-button>
        </div>
    </div>
</template>

<style scoped>
.page {
    padding-top: 0;
}
</style>
