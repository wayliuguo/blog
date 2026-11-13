const SESSION_KEY = '__monitor_session__'
const UID_KEY = '__monitor_uid__'
/** 会话滑动过期：30 分钟没有活动就是新会话 */
const SESSION_TTL = 30 * 60 * 1000
/** uuid：randomUUID 优先，非安全上下文退化为随机串 */
function uuid() {
    try {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
    } catch {
        /* 非安全上下文没有 randomUUID，走下面的兜底 */
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
    })
}
/** 存储访问收口：sessionStorage / localStorage，隐私模式下返回 null */
function storage(kind) {
    try {
        return kind === 'session' ? window.sessionStorage : window.localStorage
    } catch {
        return null // 隐私模式下访问即抛异常，退化为内存态
    }
}
// 输入：无
// 输出：可用的会话（过期或不存在则新建）
// 过程：sessionStorage 读 { id, startedAt, lastActiveAt } → 超 TTL 换新会话 → 写回
function loadSession(now) {
    const store = storage('session')
    const userId = loadUserId()
    if (store) {
        try {
            const raw = store.getItem(SESSION_KEY)
            if (raw) {
                const saved = JSON.parse(raw)
                if (saved.id && now - saved.startedAt < SESSION_TTL) {
                    const session = {
                        id: saved.id,
                        userId,
                        startedAt: saved.startedAt,
                        lastActiveAt: now,
                        pageViews: saved.pageViews || 0
                    }
                    saveSession(session)
                    return session
                }
            }
        } catch {
            /* 坏数据直接重建 */
        }
    }
    const fresh = { id: uuid(), userId, startedAt: now, lastActiveAt: now, pageViews: 0 }
    saveSession(fresh)
    return fresh
}
/** 会话写回 sessionStorage：只存会话身份字段，配额异常静默放弃 */
function saveSession(session) {
    const store = storage('session')
    if (!store) return
    try {
        store.setItem(
            SESSION_KEY,
            JSON.stringify({ id: session.id, startedAt: session.startedAt, pageViews: session.pageViews })
        )
    } catch {
        /* 配额满时放弃持久化，内存态继续工作 */
    }
}
/** 匿名用户标识：localStorage 里的 uuid，业务 setUser() 后会被真实 id 覆盖 */
function loadUserId() {
    const store = storage('local')
    if (!store) return 'anonymous'
    try {
        const saved = store.getItem(UID_KEY)
        if (saved) return saved
        const id = uuid()
        store.setItem(UID_KEY, id)
        return id
    } catch {
        return 'anonymous'
    }
}
/** 页面快照：启动时算一次，之后由 updatePage 增量更新 */
function pageSnapshot() {
    return {
        url: location.href,
        path: location.pathname,
        route: location.pathname,
        referrer: document.referrer || '',
        title: document.title || ''
    }
}
/** 设备快照：整个生命周期基本不变，只算一次 */
function deviceSnapshot() {
    const nav = navigator
    return {
        ua: nav.userAgent,
        screen: `${screen.width}x${screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        dpr: window.devicePixelRatio || 1,
        language: nav.language || '',
        network: nav.connection?.effectiveType || 'unknown'
    }
}
// 输入：可运行配置
// 输出：运行时上下文（page / session / device / breadcrumbs / recent / release / env）
// 过程：三个快照各算一次，面包屑与 recent 留空数组，事件发生时由内核填充
export function createContext(cfg) {
    const now = Date.now()
    return {
        page: pageSnapshot(),
        session: loadSession(now),
        device: deviceSnapshot(),
        breadcrumbs: [],
        recent: { errors: [], resources: [], requests: [], routes: [] },
        release: cfg.release,
        env: cfg.env
    }
}
// 输入：页面字段的增量（url/path/route/title…）
// 输出：无（原地更新 ctx.page）
// 过程：合并补丁；path 变了说明发生了跳转，pageViews 加一并续期会话
export function updatePage(ctx, patch) {
    const before = ctx.page.path
    Object.assign(ctx.page, patch)
    if (patch.path && patch.path !== before) ctx.session.pageViews += 1
    touchSession(ctx.session)
}
/** 每次事件发生都续期：会话是"30 分钟滑动过期"，靠这里滑动 */
export function touchSession(session) {
    session.lastActiveAt = Date.now()
    saveSession(session)
}
// 输入：面包屑类型与文案
// 输出：无（环形队列，超上限丢最旧）
// 过程：截断 120 字后入队，超 size 从头部裁掉
export function pushBreadcrumb(ctx, type, message, size = 20) {
    ctx.breadcrumbs.push({ time: Date.now(), type, message: message.slice(0, 120) })
    if (ctx.breadcrumbs.length > size) ctx.breadcrumbs.splice(0, ctx.breadcrumbs.length - size)
}
/** 事件 id：每个事件一个 uuid */
export function newId() {
    return uuid()
}
