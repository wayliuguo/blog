import { createProfile, type UserProfile } from '@scope/shared'

export function greet(user: UserProfile): string {
    return `Hello, ${user.name}`
}

// 演示：sdk 依赖 shared，跨包导入直接可用
export function createUser(name: string): string {
    const profile = createProfile(name)
    return greet(profile)
}
