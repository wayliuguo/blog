// 校验规则。注意这里 import 了 store/session —— 一个纯工具不该知道"当前登录用户"，
// 这条边就是架构检查里要报的「反向依赖」
import { currentUser } from '../store/session.js'

export function canEdit(order) {
    return currentUser().role !== 'viewer' && order.status !== 'closed'
}

export function required(value, label) {
    if (value == null || value === '') throw new Error(`${label} 不能为空`)
    return value
}
