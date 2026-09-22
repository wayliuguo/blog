import { greet } from './api.js'
// 这两个被自定义插件剔除：mock 与 test 都不该进线上产物
import { mockConfig } from './config.mock.js'
import { runAll } from './feature.test.js'

const used = greet('pit')
console.log('index: ' + used)

// 本行只在 __DEV__ 下保留（define 常量 + 注释剥离见正文说明）
if (__DEV__) {
    console.log('dev-only block')
}

// mock 与 test 若被剔除，这里就不会执行
export const usingMock = mockConfig
export const tests = runAll()
