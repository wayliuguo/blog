// 单元测试：断言 feature 逻辑
import { greet } from './api.js'

export function runAll() {
    if (greet('pit') !== 'hello pit') {
        throw new Error('greet 断言失败')
    }
    return '2 passed'
}
