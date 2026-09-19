import { fetchProfile } from './user-api.js'

// 被测源码单独成文件，才能在测试里用 vi.mock 整模块替换掉它的依赖
export async function loadUserName(id) {
    try {
        const user = await fetchProfile(id)
        return user.name
    } catch {
        return '未知用户'
    }
}

export async function loadUserCard(id) {
    const [user, orders] = await Promise.all([fetchProfile(id), Promise.resolve([{ id: 'o1' }])])
    return { name: user.name, orderCount: orders.length }
}
