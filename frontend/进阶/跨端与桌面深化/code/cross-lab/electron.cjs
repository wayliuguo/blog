'use strict'
// Electron 进程模型模拟：IPC invoke/handle · contextBridge 白名单 · 自动更新状态机（node electron.cjs）
const assert = require('node:assert')
const { createHash } = require('node:crypto')

// ── 1. IPC：invoke/handle 往返 ──────────────────────────────────
// 渲染进程 ipcRenderer.invoke(channel, ...args) → 主进程 ipcMain.handle(channel, handler)
// 返回 Promise；channel 未注册 handle 则明确 reject
class IpcMain {
  constructor() { this.handlers = new Map() }
  handle(channel, fn) { this.handlers.set(channel, fn) }
}
class IpcRenderer {
  constructor(main) { this.main = main }
  invoke(channel, ...args) {
    const fn = this.main.handlers.get(channel)
    if (!fn) return Promise.reject(new Error(`No handler registered for '${channel}'`))
    return Promise.resolve(fn(...args))
  }
}

// ── 2. contextBridge：白名单暴露 ────────────────────────────────
// 主进程把「精挑细选的 API」挂到 window.desktop——未暴露的能力在渲染层根本不存在
function exposeInMainWorld(api) {
  const exposed = {}
  for (const [name, def] of Object.entries(api)) {
    if (def.expose) exposed[name] = def.fn
  }
  return exposed
}

// ── 3. 自动更新：check → download → verify → swap ──────────────
function sha256(s) { return createHash('sha256').update(s).digest('hex') }
class Updater {
  constructor(current, manifest, download, installed) {
    this.current = current
    this.manifest = manifest   // 服务端清单：{ version, hash }
    this.download = download   // (version) => 包内容
    this.installed = installed // 本地已安装记录
  }
  check() {
    return this.manifest.version !== this.current ? this.manifest.version : null
  }
  apply() {
    const next = this.check()
    if (!next) return 'up-to-date'
    const body = this.download(next)
    if (sha256(body) !== this.manifest.hash) return 'verify-failed: rollback' // 校验失败回滚
    this.installed.version = next
    this.installed.body = body
    return `updated to ${next}`
  }
}

;(async () => {
  // ── 探针一：invoke/handle 往返 · 未注册 channel 明确拒绝 ──────
  const main = new IpcMain()
  const renderer = new IpcRenderer(main)
  main.handle('app:read-config', (key) => ({ key, value: 'dark' }))
  const ret = await renderer.invoke('app:read-config', 'theme')
  assert.deepEqual(ret, { key: 'theme', value: 'dark' })
  await assert.rejects(renderer.invoke('app:missing'), /No handler/, '未注册 channel 必须明确报错')
  console.log('探针一  : invoke/handle 往返 · 未注册 channel 明确拒绝 ✓')

  // ── 探针二：contextBridge 只暴露白名单 API ────────────────────
  const desktop = exposeInMainWorld({
    readFile: { expose: true, fn: (p) => `content of ${p}` },
    exec: { expose: false, fn: () => 'dangerous' },
    appVersion: { expose: true, fn: () => '1.2.3' },
  })
  assert.equal(desktop.readFile('a.txt'), 'content of a.txt')
  assert.equal(desktop.appVersion(), '1.2.3')
  assert.ok(!('exec' in desktop), '未白名单的能力在渲染层不存在')
  console.log('探针二  : contextBridge 只暴露白名单 API ✓')

  // ── 探针三：更新检查 · hash 校验失败回滚不落盘 ────────────────
  const body = 'app-shell-v130'
  const installed = { version: '1.2.3', body: '' }
  const good = new Updater('1.2.3', { version: '1.3.0', hash: sha256(body) }, () => body, installed)
  assert.equal(good.apply(), 'updated to 1.3.0')
  assert.equal(installed.version, '1.3.0')

  const same = new Updater('1.3.0', { version: '1.3.0', hash: sha256(body) }, () => body, installed)
  assert.equal(same.apply(), 'up-to-date')

  const bad = new Updater('1.3.0', { version: '1.4.0', hash: sha256(body) }, () => 'corrupted', installed)
  assert.equal(bad.apply(), 'verify-failed: rollback')
  assert.equal(installed.version, '1.3.0', '校验失败不落盘')
  console.log('探针三  : 更新检查 · hash 校验失败回滚不落盘 ✓')
  console.log('\nelectron 探针全部通过 ✓')
})()
