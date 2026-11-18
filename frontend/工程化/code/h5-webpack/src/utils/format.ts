import { ENV } from '@/env'
import type { ArtistRef, ShowRecord } from '@/types'

/** 金额：最多两位小数，去掉无效尾零（100 / 100.1 / 100.12） */
export function formatMoney(value: unknown): string {
    const num = Number(value) || 0
    return num.toFixed(2).replace(/\.?0+$/, '')
}

/** 单场费用口径：票价 + 其他费用（与后端 StatsService 一致） */
export function showCost(show: Pick<ShowRecord, 'price' | 'otherFee'>): number {
    return (Number(show.price) || 0) + (Number(show.otherFee) || 0)
}

/** 艺人数组 → 「A、B」，与小程序展示口径一致 */
export function artistText(list?: ArtistRef[]): string {
    return (list || []).map(item => item.name).join('、')
}

/** 海报优先级：OSS → 原图 → 小图 */
export function posterOf(show: ShowRecord): string {
    const url = show.posterOssUrl || show.posterOriginalUrl || show.posterUrl
    if (!url) return ''
    return url.startsWith('/') ? `${ENV.assetBase}${url}` : url
}

/** 今天 0 点，避免用当前时刻做差 */
function startOfToday(): Date {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
}

/** 距离开演还有几天：正数未开演，0 今天，负数已开演 */
export function daysUntil(showDate?: string): number {
    if (!showDate) return 0
    const target = new Date(`${showDate}T00:00:00`)
    if (Number.isNaN(target.getTime())) return 0
    return Math.round((target.getTime() - startOfToday().getTime()) / 86400000)
}

export function isUpcoming(show: ShowRecord): boolean {
    if (show.status) return show.status === 'upcoming'
    return daysUntil(show.showDate) > 0
}

/** 「还剩余 12 天」/「今天开演」/「已过去 30 天」 */
export function remainingText(showDate?: string): string {
    const days = daysUntil(showDate)
    if (days > 0) return `还剩余 ${days} 天`
    if (days === 0) return '今天开演'
    return `已过去 ${Math.abs(days)} 天`
}

/** 把逗号 / 顿号分隔的输入切成数组，空串剔除 */
export function splitNames(input: string): string[] {
    return input
        .split(/[,，、]/)
        .map(name => name.trim())
        .filter(Boolean)
}
