// 白屏验证页：容器撑满视口、内容为空。
// 预期 1.2s 首采（空白占比 > 90%）→ 1.5s 后复检仍空白 → 上报一条 white-screen。
import { init } from '../monitor-sdk/src/index.js'

const sdk = init({
    endpoint: 'http://localhost:5189/api/report',
    release: '4.0.0',
    env: 'blank-page',
    debug: true,
    whitescreen: { initialDelay: 1200, recheckDelay: 1500 }
})

window.__sdk = sdk
