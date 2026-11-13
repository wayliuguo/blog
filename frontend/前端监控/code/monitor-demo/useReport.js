// 业务二次封装：SDK 只提供 report()（自定义事件）与 captureError()（已知异常）两个手动入口，
// 区分业务语义的类型化函数在这一层完成——PV / 点击 / 错误各一个具名函数，事件名 = 平台.页面.行为
import { sdk } from './sdk.js'

const PAGE_MAP = { '/': 'HOME', '/cart': 'CART', '/lab': 'LAB' }

// 页面段：路由 path → 事件名页面段。数字段过滤（商品 id 不炸开事件名）、空路径回退 INDEX
function pageName() {
    const path = window.location.pathname
    if (PAGE_MAP[path]) return PAGE_MAP[path]
    const seg = path
        .split('/')
        .filter(Boolean)
        .filter(s => !/^\d+$/.test(s))
        .join('_')
        .toUpperCase()
        .replace(/-/g, '_')
    return seg || 'INDEX'
}

function eventName(action) {
    return `monishop.${pageName()}.${action}`
}

// PV：路由切换时由 afterEach 调用——PV 是业务事件，SDK 不自动上报
export function trackPageView() {
    sdk.report({
        name: eventName('PV'),
        params: { path: window.location.pathname + window.location.search }
    })
}

export function trackClick(action, params = {}) {
    sdk.report({ name: eventName(action), params })
}

// 已知异常：业务 catch 分支里调用。source=manual 区别于全局兜底采集的三路
export function errorReport(error, tags = {}) {
    sdk.captureError(error, tags)
}
