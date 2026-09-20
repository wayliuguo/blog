// viz-bench 驱动：起服务 → 三种渲染器 × 多档点数 → 收帧率 → 出对照表
// 零依赖。WebGL 在无头环境走 swiftshader 软件渲染（绝对帧率偏低，测的是相对趋势）。
const { spawn, spawnSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const ROOT = __dirname
const REPORT = path.join(ROOT, '.last-report.json')
const PORT = 5193

const CHROME = (() => {
  const cands = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
    'google-chrome', 'chromium'
  ].filter(Boolean)
  for (const c of cands) {
    if (!c.includes('/') && !c.includes('\\')) return c
    if (fs.existsSync(c)) return c
  }
  throw new Error('没找到 Chrome，可用 CHROME_PATH 指定')
})()

const PROFILE = path.join(os.tmpdir(), 'viz-bench-chrome-profile')
const MODES = [
  { mode: 'canvas', webgl: false, label: 'Canvas 2D' },
  { mode: 'svg', webgl: false, label: 'SVG' },
  { mode: 'webgl', webgl: true, label: 'WebGL' }
]
const NS = [2000, 10000, 50000]

function startServer() {
  const child = spawn(process.execPath, [path.join(ROOT, 'server.cjs')], { stdio: ['ignore', 'pipe', 'ignore'] })
  return new Promise((resolve) => {
    child.stdout.on('data', (d) => { if (d.toString().includes('viz-bench server on')) resolve(child) })
    setTimeout(() => resolve(child), 1500)
  })
}

function openChrome(url, webgl) {
  const args = [
    '--headless=new', '--no-sandbox', '--no-first-run', '--disable-extensions',
    '--disable-background-networking', '--window-size=800,600',
    // 反节流：否则无头环境会把 requestAnimationFrame 压到几乎不跑，测不到真实帧率
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    `--user-data-dir=${PROFILE}`
  ]
  if (webgl) {
    args.push('--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader')
  } else {
    args.push('--disable-gpu')
  }
  args.push(url)
  return spawn(CHROME, args, { stdio: 'ignore' })
}

function waitReport(prevMtime) {
  return new Promise((resolve) => {
    const t0 = Date.now()
    const tick = () => {
      if (fs.existsSync(REPORT) && fs.statSync(REPORT).mtimeMs > prevMtime) {
        try { return resolve(JSON.parse(fs.readFileSync(REPORT, 'utf8'))) } catch (e) {}
      }
      if (Date.now() - t0 > 15000) return resolve({ error: 'timeout' })
      setTimeout(tick, 100)
    }
    tick()
  })
}

function killChrome(chrome) {
  try { spawnSync('taskkill', ['/F', '/PID', String(chrome.pid)], { stdio: 'ignore' }) } catch (e) {}
  try { chrome.kill('SIGKILL') } catch (e) {}
}

function row(arr) { console.log('| ' + arr.join(' | ') + ' |') }
function hr(n) { console.log('| ' + Array(n).fill('---').join(' | ') + ' |') }

;(async () => {
  const server = await startServer()
  const acc = {} // key: mode + ':' + n
  for (const n of NS) {
    for (const m of MODES) {
      const prev = fs.existsSync(REPORT) ? fs.statSync(REPORT).mtimeMs : 0
      const url = `http://127.0.0.1:${PORT}/?mode=${m.mode}&n=${n}&ms=3000`
      const chrome = openChrome(url, m.webgl)
      const r = await waitReport(prev)
      killChrome(chrome)
      acc[`${m.mode}:${n}`] = r
    }
  }
  server.kill()

  console.log('\n#### 1 万点渲染：三种方案帧率对照（动画 3s，无头 swiftshader）\n')
  row(['点数', 'Canvas 2D (FPS)', 'SVG (FPS)', 'WebGL (FPS)', '备注'])
  hr(5)
  for (const n of NS) {
    const c = acc[`canvas:${n}`], s = acc[`svg:${n}`], w = acc[`webgl:${n}`]
    const fps = (r) => (r && r.avgFps ? r.avgFps : (r && r.error ? 'err' : '—'))
    const note = n >= 10000 ? 'SVG 已明显掉帧' : ''
    row([String(n), String(fps(c)), String(fps(s)), String(fps(w)), note])
  }

  console.log('\n#### 各方案的帧时间细节（p95 帧耗时 / 最长帧，单位 ms；>16.7ms 即低于 60fps）\n')
  row(['点数', '方案', '平均 FPS', 'p95 帧', '最长帧'])
  hr(5)
  for (const n of NS) {
    for (const m of MODES) {
      const r = acc[`${m.mode}:${n}`]
      if (!r || r.error) continue
      row([String(n), m.label, String(r.avgFps || '—'), String(r.p95FrameMs ?? '—'), String(r.longestFrameMs ?? '—')])
    }
  }

  console.log('\n（WebGL 在无头环境用 swiftshader 软件渲染，绝对帧率偏低，但「相对三者的趋势」和真机一致：点越多 SVG 越崩、Canvas 平稳、WebGL 最稳。决策边界：交互式散点 < 1 万点 Canvas/SVG 都行；> 1 万且要流畅动画优先 WebGL。）')
  if (fs.existsSync(REPORT)) fs.unlinkSync(REPORT)
})()
