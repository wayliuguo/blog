/** 与后端 /show-records 系列接口对齐的数据结构 */

export interface ArtistRef {
    name: string
}

export interface ShowRecord {
    id: number
    title: string
    artists: ArtistRef[]
    guests?: ArtistRef[]
    showDate: string
    showTime?: string
    city: string
    cityAdcode?: string
    venue?: string
    category?: string
    price?: number | string
    otherFee?: number | string
    rating?: number
    posterUrl?: string
    posterOriginalUrl?: string
    posterOssUrl?: string
    photos?: string[]
    isFavorite?: boolean
    /** 后端给出的已开演 / 待开演标记；本地也会按日期兜底计算 */
    status?: string
}

/** 新增 / 编辑提交的载荷：artists、guests 只有 name */
export interface ShowPayload {
    title: string
    artists: ArtistRef[]
    guests: ArtistRef[]
    showDate: string
    city: string
    cityAdcode?: string
    venue: string
    category: string
    price: number
    otherFee: number
    rating: number
    posterUrl?: string
    posterOriginalUrl?: string
    posterOssUrl?: string
    photos?: string[]
}

export interface PageMeta {
    totalItems?: number
}

export interface PageResult<T> {
    items: T[]
    meta?: PageMeta
}

export interface ShowListParams {
    page: number
    pageSize: number
    years?: number[]
    categories?: string[]
    artistNames?: string[]
    cities?: string[]
    isFavorite?: boolean
    status?: 'upcoming' | 'performed'
}

export interface FilterOptions {
    years: number[]
    cities: string[]
    types: string[]
    artists: Array<string | ArtistRef>
}

export interface StatRankItem {
    name: string
    count: number
    totalSpent: number
}

export interface StatsOverview {
    totalShows: number
    totalSpent: number
    cityCount?: number
    monthly?: Array<{ month: string; count: number; spent: number }>
    byStar?: Array<{ name: string; count: number; totalSpent: number }>
    byCity?: Array<{ city: string; count: number; totalSpent: number }>
    byType?: Array<{ type: string; count: number; totalSpent: number }>
}

export interface UserProfile {
    nickname?: string
    avatar?: string
    bio?: string
}
