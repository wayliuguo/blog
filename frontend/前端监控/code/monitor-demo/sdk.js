// SDK 接入点：全站唯一实例。放独立文件是为了让 Vue 组件、useReport 都能拿到同一个实例，
// 而不是各自 init 一份（多实例会导致监听器重复挂载、队列各自为战）。
import { init } from '../monitor-sdk/src/index.js'

export const sdk = init({
    endpoint: 'http://localhost:5189/api/report',
    release: '4.0.0',
    env: 'development',
    debug: true,
    // 公参：静态维度，每条事件自动带上（用户身份用 sdk.setUser 动态改）
    tags: { channel: 'h5', ab_group: 'B' },
    // 白屏：演示页缩短首检与复检间隔，方便在实验室里点一次就看到结果
    whitescreen: { initialDelay: 1200, recheckDelay: 1500 },
    // 慢请求阈值调低到 500ms，让 /mock/slow 一定上榜
    request: { slowThreshold: 500 },
    // beforeSend 是治理收口：① 计数（采样演示用）② 脱敏（去掉可能带 token 的 query）
    beforeSend(event) {
        window.__monitorPassed = (window.__monitorPassed || 0) + 1
        if (event.type === 'request' && event.data) {
            event.data.url = String(event.data.url || '').split('?')[0]
        }
        return event
    }
})

// 演示/调试入口：控制台可直接 __sdk.stats 看送达与丢弃明细
window.__sdk = sdk
