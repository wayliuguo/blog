import { request } from './client'
import type { PageResult, ShowListParams, ShowPayload, ShowRecord } from '@/types'

/** 分页查询：列表接口用 POST，筛选条件放在 body 里 */
export function fetchShows(params: ShowListParams) {
    return request<PageResult<ShowRecord>>({
        url: '/show-records/list',
        method: 'POST',
        data: params
    })
}

export function fetchShowDetail(id: string | number) {
    return request<ShowRecord>({ url: `/show-records/${id}` })
}

export function createShow(payload: ShowPayload) {
    return request<ShowRecord>({ url: '/show-records', method: 'POST', data: payload })
}

export function updateShow(id: string | number, payload: ShowPayload) {
    return request<ShowRecord>({ url: `/show-records/${id}`, method: 'PUT', data: payload })
}

export function deleteShow(id: string | number) {
    return request<null>({ url: `/show-records/${id}`, method: 'DELETE' })
}

/** 收藏切换：后端按当前状态取反，不需要前端传目标值 */
export function toggleShowFavorite(id: string | number) {
    return request<ShowRecord>({ url: `/show-records/${id}/favorite`, method: 'PUT' })
}

/** 复制一条记录到自己名下 */
export function copyShow(id: string | number) {
    return request<ShowRecord>({ url: `/show-records/${id}/copy`, method: 'POST' })
}
