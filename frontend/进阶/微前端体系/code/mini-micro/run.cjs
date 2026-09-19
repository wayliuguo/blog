// mini-micro 自检实验台：模拟 CDN + 假容器，把加载→沙箱→生命周期→卸载→预加载跑通
// 零依赖，node run.cjs 直接跑
const assert = require('node:assert')
const { MiniMicro, matchRoute } = require('./scheduler.cjs')

// ── 假 CDN：HTML entry + 子应用 JS（真实字符串，稍后被 new Function 在沙箱里执行）──
const cdn = {
  'orders.html': '<style>.card { color: red }</style><script src="orders.js"></script>',
  'orders.js': `
window.__ORDERS__ = 'mine'
window.bootstrap = function () { log('orders: bootstrap') }
window.mount = function (ctx) {
  log('orders: mount user=' + ctx.props.user)
  window.setInterval(function () {}, 1000)           // 副作用：定时器
  window.addEventListener('resize', function () {})  // 副作用：监听器
}
window.unmount = function () { log('orders: unmount') }`,
  'report.html': '<style>.panel { margin: 0 }</style><script src="report.js"></script>',
  'report.js': `
window.__REPORT__ = 'mine'
window.bootstrap = function () { log('report: bootstrap') }
window.mount = function (ctx) { log('report: mount, props=' + JSON.stringify(ctx.props)) }
window.unmount = function () { log('report: unmount') }`,
}

const logs = []
function log(msg) { logs.push(msg) }

const sharedGlobal = Object.create(globalThis)   // 模拟浏览器共享 window
sharedGlobal.log = function log(msg) { logs.push(msg) }   // 公共能力放共享全局，子应用沿原型链回落可用
const micro = new MiniMicro({
  fetch: (url) => {
    if (!cdn[url]) throw new Error('404: ' + url)
    return cdn[url]
  },
  sharedGlobal,
})
micro.register({ name: 'orders', entry: 'orders.html', activeRule: '/orders', props: { user: 'li' } })
micro.register({ name: 'report', entry: 'report.html', activeRule: '/report', props: { mode: 'day' } })

// ── 场景一：路由匹配 → 启动 orders ────────────────────────────────
console.log('场景一 · 路由命中与启动')
assert.equal(matchRoute('/orders', '/orders/list/42'), true)
assert.equal(matchRoute('/orders', '/report'), false)
const container = { styles: [] }
const app = micro.start('orders', container)
console.log(logs.slice(-2).join(' | '))
assert.deepEqual(logs.slice(-2), ['orders: bootstrap', 'orders: mount user=li'])
assert.equal(app.sandbox.proxy.__ORDERS__, 'mine')        // 子应用写进了自己的沙箱
assert.ok(!('__ORDERS__' in sharedGlobal))                // 共享全局没被污染
console.log('  ✓ bootstrap→mount 按序调度，写入落沙箱\n')

// ── 场景二：样式隔离 ─────────────────────────────────────────────
console.log('场景二 · 样式随行与隔离')
console.log(container.styles.join(' | '))
assert.equal(container.styles[0], '[data-app=orders] .card { color: red }')
console.log('  ✓ HTML entry 带出的样式已加应用前缀\n')

// ── 场景三：卸载与副作用清理 → 切到 report ────────────────────────
console.log('场景三 · 卸载清账与切换')
const timersBefore = app.sandbox.sideEffects.timers.length
assert.equal(timersBefore, 1)      // mount 时申请的定时器记了账
micro.stop()
console.log(logs.slice(-2).join(' | '))
assert.equal(app.sandbox.sideEffects.timers.length, 0)    // 定时器已清
assert.deepEqual(Object.keys(app.sandbox.proxy), ['__MICRO_APP_NAME__'])  // 属性已撤销，仅留应用名
const rep = micro.start('report', { styles: [] })
assert.equal(rep.sandbox.proxy.__REPORT__, 'mine')
console.log('  ✓ unmount→cleanup 清账，切换后新应用干净启动\n')

// ── 场景四：预加载 —— 先抓资源不执行，命中时零网络（用新实例拿干净缓存）──
console.log('场景四 · 预加载')
const fresh = new MiniMicro({ fetch: (url) => cdn[url], sharedGlobal })
fresh.register({ name: 'orders', entry: 'orders.html', activeRule: '/orders' })
const before = fresh.fetchCount
fresh.preload('orders')
const afterPreload = fresh.fetchCount
fresh.start('orders', { styles: [] })
const afterStart = fresh.fetchCount
console.log(`preload 抓取 ${afterPreload - before} 次 · start 阶段再抓 ${afterStart - afterPreload} 次`)
assert.ok(afterPreload - before >= 2)      // html + js 已进缓存
assert.equal(afterStart - afterPreload, 0) // 启动零网络
fresh.stop()                               // 清掉 mount 申请的定时器，进程才能正常退出
console.log('  ✓ 预加载后路由命中零网络开销\n')

console.log('mini-micro 全部场景通过 ✓')
