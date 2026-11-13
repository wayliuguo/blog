// 输入：上限 max、丢弃回调
// 输出：定长队列
// 过程：push 超限从头部 shift，保证最新的事件一定留得下（丢最旧比丢最新有价值）
export function createQueue(max, onDrop) {
    const buffer = []
    const limit = Math.max(1, max)
    return {
        push(event) {
            buffer.push(event)
            if (buffer.length > limit) {
                const dropped = buffer.length - limit
                buffer.splice(0, dropped)
                onDrop?.(dropped)
            }
        },
        pushAll(events) {
            for (const event of events) this.push(event)
        },
        take(n) {
            return buffer.splice(0, Math.max(0, n))
        },
        drain() {
            return buffer.splice(0, buffer.length)
        },
        size() {
            return buffer.length
        },
        clear() {
            buffer.length = 0
        }
    }
}
// ---- 离线兜底：IndexedDB 优先，不支持就退 localStorage ----
// 只在"发送失败"与"页面隐藏"两个时机写入，正常路径不碰磁盘。
const DB_NAME = 'monitor-sdk'
const DB_STORE = 'events'
const LS_KEY = '__monitor_offline__'
const PERSIST_LIMIT = 100
let dbPromise = null
/** 单例打开 IndexedDB（monitor-sdk/events），失败一律 resolve(null) 走 localStorage 降级 */
function openDb() {
    if (dbPromise) return dbPromise
    dbPromise = new Promise(resolve => {
        try {
            const factory = window.indexedDB
            if (!factory) return resolve(null)
            const request = factory.open(DB_NAME, 1)
            request.onupgradeneeded = () => {
                const db = request.result
                if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE)
            }
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => resolve(null)
        } catch {
            resolve(null)
        }
    })
    return dbPromise
}
// 输入：发送失败或页面隐藏时的一批事件
// 输出：无
// 过程：截最近 100 条 → IndexedDB 单键覆盖写 → 失败降级 localStorage（同样上限 100）→ 再失败静默
export async function persistEvents(events) {
    if (!events.length) return
    const slice = events.slice(-PERSIST_LIMIT)
    const db = await openDb()
    if (db) {
        try {
            await new Promise((resolve, reject) => {
                const tx = db.transaction(DB_STORE, 'readwrite')
                tx.objectStore(DB_STORE).put(slice, 'pending')
                tx.oncomplete = () => resolve()
                tx.onerror = () => reject(tx.error)
            })
            return
        } catch {
            /* 写失败退 localStorage */
        }
    }
    try {
        const raw = localStorage.getItem(LS_KEY)
        const old = raw ? JSON.parse(raw) : []
        localStorage.setItem(LS_KEY, JSON.stringify(old.concat(slice).slice(-PERSIST_LIMIT)))
    } catch {
        /* 配额满就算了，监控不能因为存不下而报错 */
    }
}
// 输入：无（启动时由内核调用一次）
// 输出：上次没送出去的事件（没有则空数组）
// 过程：IndexedDB 取出即删，空了再试 localStorage（取出即删防重复补发）；任何异常都退化为空数组
export async function restoreEvents() {
    const fromLs = () => {
        try {
            const raw = localStorage.getItem(LS_KEY)
            if (!raw) return []
            localStorage.removeItem(LS_KEY)
            return JSON.parse(raw)
        } catch {
            return []
        }
    }
    const db = await openDb()
    if (!db) return fromLs()
    try {
        const saved = await new Promise((resolve, reject) => {
            const tx = db.transaction(DB_STORE, 'readwrite')
            const store = tx.objectStore(DB_STORE)
            const request = store.get('pending')
            request.onsuccess = () => {
                store.delete('pending')
                resolve(request.result || [])
            }
            request.onerror = () => reject(request.error)
        })
        return saved.length ? saved : fromLs()
    } catch {
        return fromLs()
    }
}
