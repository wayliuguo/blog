/**
 * 全页唯一的交互点：点赞按钮。
 * 岛化要回答的问题就是「一个按钮到底该拉多少代码过来」—— 答案是这个文件加它依赖的 vdom。
 */
import { h } from '../vdom.mjs'

export function LikeButton({ likes }) {
    let count = likes
    const button = h(
        'button',
        {
            class: 'like',
            type: 'button',
            onClick: (event) => {
                count += 1
                event.currentTarget.textContent = `👍 已赞 ${count}`
            }
        },
        `👍 点赞 ${count}`
    )
    return h('div', { class: 'like-box' }, button, h('span', { class: 'hint' }, '整页唯一的交互点'))
}
