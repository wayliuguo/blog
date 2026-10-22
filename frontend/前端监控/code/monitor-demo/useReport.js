// 业务二次封装（形态对齐 cash-web 的 hooks/useReport）：
// SDK 只提供单一手动上报入口 report()，区分上报类型的类型化函数在这一层完成——
// PV / 点击 / 错误各给一个具名函数，事件名 = 平台.页面.行为 三段式
import { report, getCurrentInstance } from '../monitor-sdk/src/index.js'

// 页面段：路由 path → 事件名页面段。数字段过滤（商品 id 不炸开事件名）、空路径回退 INDEX
const PAGE_MAP = { '/': 'HOME', '/cart': 'CART', '/lab': 'LAB' }
function pageName() {
    const path = window.location.pathname
    if (PAGE_MAP[path]) return PAGE_MAP[path]
    const seg = path
        .split('/')
        .filter(Boolean)
        .filter((s) => !/^\d+$/.test(s))
        .join('_')
        .toUpperCase()
        .replace(/-/g, '_')
    return seg || 'INDEX'
}

// 完整事件名：平台.页面.行为（平台段读 init 时传入的 eventPrefix）
function eventPos(pos) {
    const { cfg } = getCurrentInstance()
    return (cfg.eventPrefix ? cfg.eventPrefix + '.' : '') + pageName() + '.' + pos
}

// PV：路由切换时由 afterEach 调用——PV 是业务事件，SDK 不自动上报（形态同 cash-web 的 page_visit 手动上报）
export function trackPageView() {
    report({ type: 'track', event: eventPos('PV'), params: { path: window.location.pathname + window.location.search } })
}

// 点击/自定义行为：语义对齐 cash-web 的 dataReport({ eventPos, extendInfo })
export function trackClick(pos, params = {}) {
    report({ type: 'track', event: eventPos(pos), params })
}

// 已知异常：业务 catch 分支里调用，handled=true 区别于全局兜底；error 对象由 SDK 归一拆出 message/stack
export function errorReport(error, tags, extra) {
    report({ type: 'runtime', handled: true, error, tags, extra })
}
