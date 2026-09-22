import { createUser } from '@scope/sdk'

// ui 只声明了对 @scope/sdk 的直接依赖；
// 想在这里直接 import @scope/shared 会报错 —— pnpm 的非扁平结构只暴露直接依赖（防幽灵依赖）
export function renderWelcome(name: string): string {
    return createUser(name)
}

console.log(renderWelcome('zhang'))
