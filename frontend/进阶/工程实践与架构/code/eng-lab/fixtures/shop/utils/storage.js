// 本地持久化：只做序列化，不认识"用户"这个概念
export function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value))
}

export function load(key, fallback = null) {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
}
