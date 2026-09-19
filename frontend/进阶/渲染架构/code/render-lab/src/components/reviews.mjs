/**
 * 买家评价：本页最慢的数据源（260ms）。
 * 它就是流式渲染要对付的那块 —— 不让它挡住前面早已就绪的内容。
 */
import { h } from '../vdom.mjs'

export const REVIEWS_LATENCY = 260

export function Reviews({ reviews }) {
    return h(
        'section',
        { class: 'reviews', 'data-marker': 'reviews' },
        h('h2', null, `买家评价 · ${reviews.length} 条`),
        h(
            'ul',
            null,
            reviews.map((review) => h('li', { class: 'rv' }, `${review.user}：${review.text}（${review.stars} 星）`))
        )
    )
}

/** 边界处的兜底：体积极小，先占住位置 */
export function ReviewsSkeleton() {
    return h('p', { class: 'skel' }, '评价加载中…')
}
