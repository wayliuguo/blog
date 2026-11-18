<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { showSuccessToast, showToast } from 'vant'
import { createShow, fetchShowDetail, updateShow } from '@/api/show'
import { fetchFilterOptions } from '@/api/stats'
import { artistText, splitNames } from '@/utils/format'
import type { ShowPayload } from '@/types'

const route = useRoute()
const router = useRouter()
const id = computed(() => (route.params.id ? String(route.params.id) : ''))
const isEdit = computed(() => Boolean(id.value))

const draft = ref({
    title: '',
    artists: '',
    guests: '',
    showDate: '',
    city: '',
    venue: '',
    category: '',
    price: '',
    otherFee: '',
    rating: 0,
    posterUrl: ''
})

// 编辑时要保留前端没展示的字段，提交时原样带回
const origin = ref<ShowPayload | null>(null)

const categories = ref<string[]>([])
const submitting = ref(false)

const now = new Date()
const dateValues = ref<string[]>([
    String(now.getFullYear()),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
])
const showDatePicker = ref(false)
const showCategoryPicker = ref(false)

const categoryColumns = computed(() =>
    (categories.value.length ? categories.value : ['音乐会', '话剧', '音乐节', '展览', '其他']).map((item) => ({
        text: item,
        value: item
    }))
)

async function loadOptions() {
    try {
        const options = await fetchFilterOptions()
        categories.value = options.types || []
    } catch {
        // 选项拉不到时用本地兜底分类
    }
}

async function loadDetail() {
    const detail = await fetchShowDetail(id.value)
    const form = draft.value
    form.title = detail.title || ''
    form.artists = artistText(detail.artists)
    form.guests = artistText(detail.guests)
    form.showDate = detail.showDate || ''
    form.city = detail.city || ''
    form.venue = detail.venue || ''
    form.category = detail.category || ''
    form.price = detail.price != null ? String(detail.price) : ''
    form.otherFee = detail.otherFee != null ? String(detail.otherFee) : ''
    form.rating = detail.rating || 0
    form.posterUrl = detail.posterUrl || detail.posterOssUrl || ''
    if (detail.showDate) dateValues.value = detail.showDate.split('-')
    origin.value = {
        title: detail.title,
        artists: detail.artists || [],
        guests: detail.guests || [],
        showDate: detail.showDate,
        city: detail.city,
        cityAdcode: detail.cityAdcode,
        venue: detail.venue || '',
        category: detail.category || '',
        price: Number(detail.price) || 0,
        otherFee: Number(detail.otherFee) || 0,
        rating: detail.rating || 0,
        posterUrl: detail.posterUrl,
        posterOriginalUrl: detail.posterOriginalUrl,
        posterOssUrl: detail.posterOssUrl,
        photos: detail.photos
    }
}

function onDateConfirm({ selectedValues }: { selectedValues: string[] }) {
    draft.value.showDate = selectedValues.join('-')
    showDatePicker.value = false
}

function onCategoryConfirm({ selectedOptions }: { selectedOptions: Array<{ text: string; value: string }> }) {
    draft.value.category = selectedOptions[0]?.value || ''
    showCategoryPicker.value = false
}

async function onSubmit() {
    const form = draft.value
    if (!form.title.trim()) {
        showToast('请填写演出名称')
        return
    }
    const artists = splitNames(form.artists)
    if (!artists.length) {
        showToast('请至少填写一位艺人')
        return
    }

    const payload: ShowPayload = {
        title: form.title.trim(),
        artists: artists.map((name) => ({ name })),
        guests: splitNames(form.guests).map((name) => ({ name })),
        showDate: form.showDate,
        city: form.city.trim(),
        cityAdcode: origin.value?.cityAdcode,
        venue: form.venue.trim(),
        category: form.category,
        price: Number(form.price) || 0,
        otherFee: Number(form.otherFee) || 0,
        rating: form.rating,
        posterUrl: form.posterUrl.trim() || origin.value?.posterUrl,
        posterOriginalUrl: origin.value?.posterOriginalUrl,
        posterOssUrl: origin.value?.posterOssUrl,
        photos: origin.value?.photos
    }

    submitting.value = true
    try {
        const saved = isEdit.value ? await updateShow(id.value, payload) : await createShow(payload)
        showSuccessToast(isEdit.value ? '已保存' : '已添加')
        router.replace({ name: 'show-detail', params: { id: saved.id ?? id.value } })
    } finally {
        submitting.value = false
    }
}

onMounted(async () => {
    await loadOptions()
    if (isEdit.value) {
        try {
            await loadDetail()
        } catch {
            showToast('记录加载失败')
        }
    }
})
</script>

<template>
    <div>
        <van-nav-bar
            :title="isEdit ? '编辑演出' : '新增演出'"
            left-arrow
            fixed
            placeholder
            @click-left="router.back()"
        />

        <div class="page">
            <p class="section-title">基本信息</p>
            <van-cell-group inset>
                <van-field v-model="draft.title" label="演出名称" maxlength="200" placeholder="必填" />
                <van-field
                    v-model="draft.artists"
                    label="艺人"
                    placeholder="多位用、或逗号分隔，必填"
                    maxlength="500"
                />
                <van-field v-model="draft.guests" label="嘉宾" placeholder="选填" />
                <van-field
                    v-model="draft.showDate"
                    label="演出日期"
                    readonly
                    placeholder="选择日期"
                    @click="showDatePicker = true"
                />
            </van-cell-group>

            <p class="section-title">地点</p>
            <van-cell-group inset>
                <van-field v-model="draft.city" label="城市" placeholder="如：北京" />
                <van-field v-model="draft.venue" label="场馆" placeholder="如：工人体育馆" />
                <van-field
                    v-model="draft.category"
                    label="类型"
                    readonly
                    placeholder="选择类型"
                    @click="showCategoryPicker = true"
                />
            </van-cell-group>

            <p class="section-title">花费与评分</p>
            <van-cell-group inset>
                <van-field v-model="draft.price" type="number" label="票价" placeholder="0" />
                <van-field v-model="draft.otherFee" type="number" label="其他费用" placeholder="0" />
                <van-field label="评分">
                    <template #input>
                        <van-rate v-model="draft.rating" />
                    </template>
                </van-field>
            </van-cell-group>

            <p class="section-title">海报</p>
            <van-cell-group inset>
                <van-field v-model="draft.posterUrl" label="海报 URL" placeholder="https://..." />
            </van-cell-group>

            <div class="submit">
                <van-button type="primary" block :loading="submitting" @click="onSubmit">
                    {{ isEdit ? '保存修改' : '添加记录' }}
                </van-button>
            </div>
        </div>

        <van-popup v-model:show="showDatePicker" position="bottom">
            <van-date-picker
                v-model="dateValues"
                title="选择日期"
                @confirm="onDateConfirm"
                @cancel="showDatePicker = false"
            />
        </van-popup>

        <van-popup v-model:show="showCategoryPicker" position="bottom">
            <van-picker
                :columns="categoryColumns"
                title="选择类型"
                @confirm="onCategoryConfirm"
                @cancel="showCategoryPicker = false"
            />
        </van-popup>
    </div>
</template>

<style scoped>
.page {
    padding-top: 0;
}

.submit {
    margin: 24px 0 40px;
}
</style>
