import { b } from './b.js'

export function a() {
    return 'a -> ' + b()
}

// const 没有提升：在 b.js 顶层读它时，绑定已存在但尚未初始化
export const A_NAME = 'a-module'
