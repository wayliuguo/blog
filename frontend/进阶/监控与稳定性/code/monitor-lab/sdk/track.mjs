/**
 * 埋点采集（零依赖）：PV / 会话 / 停留 / 曝光 / 点击 / 自定义事件
 * 三条原则：
 *   1. 声明式 —— 业务只写 data-track 属性，采集逻辑集中在 SDK 里（事件委托，不逐个绑监听）
 *   2. 会话化 —— 用匿名 ID + 30 分钟不活跃切会话，PV/UV/停留都挂在会话上
 *   3. 可脱敏 —— 文本、URL 的 query 在采集口就截断，敏感字段不出端
 */

const SESSION_GAP = 30 * 60 * 1000 // 30 分钟不活跃算新会话
const MAX_TEXT = 40

export function createTracker(options = {}) {
    const win = options.win || (typeof window !== 'undefined' ? window : globalThis)
    const emit = options.emit || (() => {})
    const now = options.now || (() => Date.now())
    const store = options.store || win.localStorage || globalThis.localStorage
    const events = []

    const session = { id: '', startedAt: now(), lastAt: now(), pageViews: 0, enterAt: now() }

    function uid(prefix) {
        return prefix + '-' + Math.random().toString(36).slice(2, 10)
    }

    function loadIdentity() {
        let anon = store && store.getItem('ml_anon_id')
        if (!anon) {
            anon = uid('anon')
            if (store) store.setItem('ml_anon_id', anon)
        }
        return anon
    }
    const anonId = loadIdentity()

    function track(name, payload = {}) {
        const t = now()
        if (t - session.lastAt > SESSION_GAP) {
            session.id = uid('s')
            session.startedAt = t
            session.pageViews = 0
        }
        session.lastAt = t

        const ev = { type: 'track', name, ts: t, sessionId: session.id, anonId, ...payload }
        events.push(ev)
        emit(ev)
        return ev
    }

    function pageView(params = {}) {
        session.pageViews++
        session.enterAt = now()
        const url = String((win.location && win.location.pathname) || '/')
        return track('pv', { url: sanitizeUrl(url), ref: params.ref || 'direct' })
    }

    // 停留时长：离开页面时结算，用 enterAt 与当前时间差
    function pageLeave() {
        const stay = now() - session.enterAt
        return track('stay', { url: String((win.location && win.location.pathname) || '/'), stay })
    }

    // 曝光：IntersectionObserver 比 scroll 监听省得多，且不会漏首屏
    function observeExposure(selector = '[data-expose]') {
        const doc = win.document
        if (!doc || typeof win.IntersectionObserver !== 'function') return 0
        const io = new win.IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return
                const el = entry.target
                // entry.time 是「被判定进入视口」的时刻（相对页面开始），不是停留时长
                track('expose', { id: el.getAttribute('data-expose'), at: Math.round(entry.time) })
                io.unobserve(el) // 曝光只报一次
            })
        })
        const nodes = doc.querySelectorAll(selector)
        nodes.forEach(n => io.observe(n))
        return nodes.length
    }

    // 点击：事件委托，一次监听覆盖全站，新增 DOM 无需重绑
    function listenClicks(root) {
        const doc = root || win.document
        if (!doc) return
        doc.addEventListener('click', e => {
            const el = e.target && e.target.closest && e.target.closest('[data-track]')
            if (!el) return
            track('click', { id: el.getAttribute('data-track'), text: sanitizeText(el.textContent) })
        })
    }

    return {
        events,
        session,
        anonId,
        pageView,
        pageLeave,
        track,
        observeExposure,
        listenClicks,
        report: () => aggregateSession(events, session)
    }
}

export function sanitizeText(text) {
    const s = String(text || '')
        .replace(/\s+/g, ' ')
        .trim()
    return s.length > MAX_TEXT ? s.slice(0, MAX_TEXT) + '…' : s
}

// 脱敏：只留 path，丢掉可能带 token / 手机号的 query
export function sanitizeUrl(url) {
    return String(url).split('?')[0]
}

// 前端侧的轻量汇总：真正的看板在接收端，这里给小规模自查用
export function aggregateSession(events, session) {
    const pv = events.filter(e => e.name === 'pv')
    const uv = new Set(events.map(e => e.anonId))
    const expose = events.filter(e => e.name === 'expose')
    const click = events.filter(e => e.name === 'click')
    const stays = events.filter(e => e.name === 'stay').map(e => e.stay)
    return {
        sessionId: session.id,
        pv: pv.length,
        uv: uv.size,
        expose: expose.length,
        exposeIds: [...new Set(expose.map(e => e.id))],
        click: click.length,
        clickIds: [...new Set(click.map(e => e.id))],
        avgStay: stays.length ? Math.round(stays.reduce((a, b) => a + b, 0) / stays.length) : 0,
        total: events.length
    }
}
