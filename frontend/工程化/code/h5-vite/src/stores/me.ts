import { defineStore } from 'pinia'
import { fetchProfile } from '@/api/user'
import { fetchStatsOverview } from '@/api/stats'
import type { StatsOverview, UserProfile } from '@/types'

/**
 * 跨页共享的用户态：底部「我的」与「统计」都要用，
 * 页内临时状态（列表分页、表单）不放进 store。
 */
export const useMeStore = defineStore('me', () => {
    const profile = ref<UserProfile>({})
    const stats = ref<StatsOverview | null>(null)
    const loading = ref(false)

    async function load(force = false) {
        if (loading.value) return
        if (!force && stats.value) return
        loading.value = true
        const currentYear = new Date().getFullYear()
        try {
            const [user, overview] = await Promise.all([
                fetchProfile(),
                fetchStatsOverview(currentYear - 5, currentYear + 1)
            ])
            profile.value = user || {}
            stats.value = overview
        } catch {
            // 错误提示已在 request 层统一 toast，这里只保证 loading 复位
        } finally {
            loading.value = false
        }
    }

    return { profile, stats, loading, load }
})
