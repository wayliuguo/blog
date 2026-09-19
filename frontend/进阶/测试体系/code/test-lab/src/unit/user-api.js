// 被测源码：一层薄薄的数据访问，方便演示「替换掉外部依赖」的不同手法

const db = new Map([['1', { id: '1', name: '阿白' }]])

export function findUser(id) {
    return db.get(id)
}

export async function fetchProfile(id) {
    const res = await fetch(`/api/users/${id}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
}
