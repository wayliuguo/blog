'use strict'
// Hybrid 容器优化模拟：WebView 预热池 + 离线包拦截（node webview.cjs）
const assert = require('node:assert')
const { createHash } = require('node:crypto')

// ── 1. WebView 创建成本模型 ─────────────────────────────────────
// 冷启动一个容器要付三笔成本（此处用确定性计数模拟真实毫秒）：
// 进程/内核初始化(2) + bridge 注入(1) + 壳 HTML 加载(1) = 4 个成本单位
let units = 0 // 总成本计数
let alive = 0 // 存活容器数
function createWebView() {
  units += 2 // 进程与内核初始化
  const wv = { ready: false, url: null }
  units += 1 // 注入 JSBridge
  units += 1 // 加载壳 HTML
  wv.ready = true
  alive++
  return wv
}

// 预热池：App 启动后在空闲期预创建容器，用户点击时直接取用
class WebViewPool {
  constructor(size) {
    this.idle = Array.from({ length: size }, () => createWebView())
    this.reuse = 0
  }
  acquire() {
    if (this.idle.length > 0) { this.reuse++; return this.idle.pop() } // 0 创建成本
    return createWebView() // 池被用光 → 冷启动兜底
  }
  release(wv) { wv.url = null; this.idle.push(wv) }
}

// ── 探针一：预热池把创建成本挪到空闲期 ─────────────────────────
{
  units = 0; alive = 0
  const pool = new WebViewPool(2) // 空闲期预创建 2 个 —— 成本在这里付出
  const warmCost = units
  assert.equal(alive, 2, '预热已产出 2 个就绪容器')
  units = 0
  const wv = pool.acquire() // 用户点击：直接取用
  assert.ok(wv.ready)
  assert.equal(units, 0, '命中预热池：0 创建成本')
  assert.equal(pool.reuse, 1)
  pool.acquire()
  units = 0
  pool.acquire() // 池已空 → 冷启动兜底
  assert.equal(units, 4, '池空后冷启动照常付全部成本')
  console.log(`探针一  : 预热付 ${warmCost} 单位 · 取用 0 单位 · 池空冷启动兜底 ✓`)
}

// ── 2. 离线包：把网络请求拦截在本地 ─────────────────────────────
let networkHits = 0
function fetchOnline(url) {
  networkHits++
  return `online:${url}`
}
function sign(s) {
  return createHash('sha256').update(s).digest('hex').slice(0, 16)
}
// 离线包：URL → 本地文件（内容 + 签名 + 版本），包由服务端下发
function makePackage(version, files) {
  const signed = {}
  for (const [url, body] of Object.entries(files)) {
    signed[url] = { body, hash: sign(body), ver: version }
  }
  return signed
}
// 拦截层：命中且签名校验通过走本地；否则回退在线
function request(pkg, url) {
  const entry = pkg[url]
  if (entry && sign(entry.body) === entry.hash) return { body: entry.body, offline: true }
  return { body: fetchOnline(url), offline: false }
}

// ── 探针二：命中零网络 · 未命中在线兜底 ────────────────────────
{
  networkHits = 0
  const pkg = makePackage('v1', { 'https://app.demo/js/app.js': 'console.log(1)' })
  const r1 = request(pkg, 'https://app.demo/js/app.js')
  assert.equal(r1.offline, true, '离线包命中')
  assert.equal(networkHits, 0, '命中不发网络请求')
  const r2 = request(pkg, 'https://app.demo/js/miss.js')
  assert.equal(r2.offline, false, '未命中回退在线')
  assert.equal(networkHits, 1)
  console.log('探针二  : 命中 0 网络 · 未命中在线兜底 ✓')
}

// ── 探针三：签名不符（包被篡改/损坏）→ 拒用本地，回退在线 ──────
{
  networkHits = 0
  const pkg = makePackage('v1', { 'https://app.demo/js/app.js': 'console.log(1)' })
  pkg['https://app.demo/js/app.js'].body = 'evil()' // 篡改内容但不改签名
  const r = request(pkg, 'https://app.demo/js/app.js')
  assert.equal(r.offline, false, '签名校验失败回退在线')
  assert.equal(r.body, 'online:https://app.demo/js/app.js')
  assert.equal(networkHits, 1)
  console.log('探针三  : 篡改包被拒用 · 回退在线 ✓')
  console.log('\nwebview 探针全部通过 ✓')
}
