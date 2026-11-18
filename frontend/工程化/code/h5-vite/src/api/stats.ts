import { request } from './client'
import type { FilterOptions, StatsOverview } from '@/types'

/** 概览：总数、总花费、月度趋势、艺人/城市/类型分布都在一个包里 */
export function fetchStatsOverview(startYear: number, endYear: number) {
    return request<StatsOverview>({
        url: '/stats/overview',
        params: { startYear, endYear }
    })
}

/** 筛选面板的可选项：年份、城市、类型、艺人 */
export function fetchFilterOptions() {
    return request<FilterOptions>({ url: '/stats/filter-options' })
}
