/* eslint-disable indent */
// 这个里面针对的是属性操作

import { patchAttr } from './modules/attr'
import { patchClass } from './modules/class'
import { patchEvent } from './modules/event'
import { patchStyle } from './modules/style'

export const patchProps = (el, key, prevValue, nextValue) => {
    switch (key) {
        case 'class':
            patchClass(el, nextValue)
            break
        case 'style':
            patchStyle(el, prevValue, nextValue)
            break
        default:
            // 如果不是事件，才是属性
            if (/^on[^a-z]/.test(key)) {
                // 事件就是添加和删除修改
                patchEvent(el, key, nextValue)
            } else {
                patchAttr(el, key, nextValue)
            }
            break
    }
}
