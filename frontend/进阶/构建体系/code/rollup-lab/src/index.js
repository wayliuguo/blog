// 库入口：对外导出 + 一个"看起来无副作用"的模块 + 一个 CJS 依赖 + 一个虚拟模块
import { add, mul } from './math.js'
import { VERSION } from './meta.js'
import { logOrder } from './order.js'
import pkg from './dep.cjs'
import { BUILD_INFO } from 'virtual:build-info'

export function sum(list) {
    return list.reduce((acc, n) => acc + n, 0)
}

export function calc(a, b) {
    return add(a, b) + mul(a, b)
}

export function describe() {
    return `${pkg.name}@${VERSION} · build ${BUILD_INFO.version}`
}

export { VERSION, logOrder }

// external 演示：react 不打进产物，留给使用方提供
export { useState } from 'react'