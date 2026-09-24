/**
 * 全局唯一的 SDK 实例 + 各路由共用的「制造坏情况」触发函数。
 * 把「触发逻辑」集中到这里，四个视图只负责摆按钮、贴解释——定位就是演示。
 */
import { init } from '../../sdk/index.mjs'

// 全局单例：一次 init 同时挂上错误 / 性能 / 埋点三类采集插件
// debug:true 强制开 console 日志；不写它也因 Vite 开发态 import.meta.env.DEV 自动开启
export const sm = init({
    appId: 'monitor-lab',
    url: '/collect',
    throttleMs: 0, // 点多少次就报多少次，方便看全六类错误
    sampleRate: 1,
    debug: true
})

export const sleep = ms => new Promise(r => setTimeout(r, ms))
// 同步长循环 → 生成长任务
export function jam(ms) {
    const end = performance.now() + ms
    while (performance.now() < end) {}
}

// ---- 稳定性 · 六类错误 ----
export const triggerRuntime = () =>
    setTimeout(() => {
        const n = undefined
        n.foo()
    }, 10)
export const triggerPromise = () => Promise.reject(new Error('接口数据解析失败'))
export function triggerResource() {
    const img = document.createElement('img')
    img.src = '/missing-image.png'
    document.body.appendChild(img)
}
export const triggerHttp = () => fetch('/definitely-missing')
export async function triggerNetwork() {
    try {
        await fetch('http://127.0.0.1:1/nope')
    } catch {
        /* 业务吞掉，SDK 已在 catch 里上报 network */
    }
}
export function triggerCross() {
    window.dispatchEvent(new ErrorEvent('error', { message: 'Script error.', filename: '', lineno: 0, colno: 0 }))
}

// ---- 体验 · 三类性能降级 ----
export async function triggerJam() {
    jam(140)
}
export async function triggerShift() {
    const b = document.createElement('div')
    b.textContent = '活动横幅（未预留高度，插入时把内容推下去 → layout-shift 计入 CLS）'
    b.style.cssText = 'background:#fde68a;padding:12px;text-align:center;'
    document.body.insertBefore(b, document.body.firstChild)
}
export async function triggerLate() {
    const hero = document.createElement('div')
    hero.textContent = '最后出现、占满一屏的元素 → 面积最大的内容接管 LCP'
    hero.style.cssText =
        'height:320px;background:linear-gradient(135deg,#dbeafe,#bfdbfe);display:flex;align-items:center;justify-content:center;font-size:20px;margin-top:16px;'
    document.body.appendChild(hero)
}
