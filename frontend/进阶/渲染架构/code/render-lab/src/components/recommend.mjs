/**
 * 推荐位：120ms，比评价快。
 * 两个边界并发起跑，所以它会先补位 —— 流式的补位顺序按「谁先好」而不是「谁在前面」。
 */
import { h } from '../vdom.mjs'

export const RECOMMEND_LATENCY = 120

export function Recommend({ items }) {
    return h(
        'section',
        { class: 'rec', 'data-marker': 'recommend' },
        h('h2', null, '猜你喜欢'),
        h(
            'ul',
            null,
            items.map(item => h('li', { class: 'rec-item' }, item.name))
        )
    )
}

export function RecommendSkeleton() {
    return h('p', { class: 'skel' }, '推荐位加载中…')
}
