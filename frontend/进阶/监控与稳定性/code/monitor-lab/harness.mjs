/**
 * 实验台脚手架（零依赖）：对齐表格 / 起采集端 / 起无头 Chrome / 等上报到达
 * 端口用 0 让系统分配，避免与正在手动浏览的 5189 冲突
 */
import { spawn } from 'node:child_process'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))

/** 场景既可被 all.mjs 串起来跑，也可 node scenarios/xxx.mjs 单独跑 */
export function runAsMain(metaUrl, run) {
    if (process.argv[1] && pathToFileURL(process.argv[1]).href === metaUrl) {
        run().catch(err => {
            console.error(err)
            process.exitCode = 1
        })
    }
}

/* ---------- 输出格式化 ---------- */
const WIDE = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe6f\uff00-\uff60\uffe0-\uffe6]/

export function width(text) {
    let n = 0
    for (const ch of String(text)) n += WIDE.test(ch) ? 2 : 1
    return n
}

export function pad(text, len, align = 'left') {
    const s = String(text)
    const gap = len - width(s)
    if (gap <= 0) return s
    return align === 'right' ? ' '.repeat(gap) + s : s + ' '.repeat(gap)
}

export function table(head, rows) {
    const all = [head, ...rows].map(r => r.map(c => String(c)))
    const widths = head.map((_, i) => Math.max(...all.map(r => width(r[i] ?? ''))))
    const line = r => '| ' + r.map((c, i) => pad(c ?? '', widths[i])).join(' | ') + ' |'
    const sep = '|' + widths.map(n => '-'.repeat(n + 2)).join('|') + '|'
    return [line(head), sep, ...rows.map(line)].join('\n')
}

export const ms = v => (v == null ? '—' : `${Math.round(v)} ms`)
export const pct = (v, digits = 1) => (v == null ? '—' : `${(v * 100).toFixed(digits)}%`)
export const title = text => `\n${'='.repeat(70)}\n${text}\n${'='.repeat(70)}`
export const section = text => `\n---- ${text} ----`

/* ---------- HTTP ---------- */
export function get(port, route) {
    return new Promise((resolve, reject) => {
        http.get({ host: '127.0.0.1', port, path: route }, res => {
            let buf = ''
            res.on('data', c => {
                buf += c
            })
            res.on('end', () => {
                try {
                    resolve(JSON.parse(buf))
                } catch {
                    resolve(buf)
                }
            })
        }).on('error', reject)
    })
}

export function post(port, route, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body)
        const req = http.request(
            {
                host: '127.0.0.1',
                port,
                path: route,
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
            },
            res => {
                let buf = ''
                res.on('data', c => {
                    buf += c
                })
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(buf))
                    } catch {
                        resolve(buf)
                    }
                })
            }
        )
        req.on('error', reject)
        req.end(data)
    })
}

/* ---------- 采集端 ---------- */
export function startCollector() {
    return new Promise((resolve, reject) => {
        const proc = spawn(process.execPath, [path.join(HERE, 'collector.mjs')], {
            env: { ...process.env, PORT: '0' },
            stdio: ['ignore', 'pipe', 'pipe']
        })
        let out = ''
        const timer = setTimeout(() => reject(new Error('采集端启动超时:\n' + out)), 10000)
        proc.stdout.on('data', chunk => {
            out += chunk
            const m = out.match(/http:\/\/localhost:(\d+)\//)
            if (m) {
                clearTimeout(timer)
                resolve({ port: Number(m[1]), proc })
            }
        })
        proc.stderr.on('data', c => {
            out += c
        })
    })
}

export function stopCollector(handle) {
    if (handle && handle.proc) handle.proc.kill()
}

/** 轮询采集端，直到 predicate 成立或超时；返回最后一次拿到的数据 */
export async function waitFor(port, predicate, { timeout = 20000, interval = 200 } = {}) {
    const deadline = Date.now() + timeout
    let last = null
    while (Date.now() < deadline) {
        try {
            last = await get(port, '/api/events')
            if (predicate(last)) return last
        } catch {
            /* 服务还没起来，继续等 */
        }
        await new Promise(r => setTimeout(r, interval))
    }
    return last
}

/* ---------- 无头 Chrome ---------- */
const CANDIDATES = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'google-chrome',
    'chromium'
].filter(Boolean)

export function findChrome() {
    for (const file of CANDIDATES) {
        if (!file.includes('/') && !file.includes('\\')) return file
        if (fs.existsSync(file)) return file
    }
    throw new Error('没找到 Chrome，可用环境变量 CHROME_PATH 指定可执行文件路径')
}

export const PROFILE_DIR = process.env.MONITOR_LAB_PROFILE || path.join(os.tmpdir(), 'monitor-lab-chrome-profile')

export function openChrome(url, flags = []) {
    const args = [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--no-first-run',
        '--disable-extensions',
        '--disable-background-networking',
        '--window-size=1280,800',
        `--user-data-dir=${PROFILE_DIR}`,
        ...flags,
        url
    ]
    return spawn(findChrome(), args, { stdio: 'ignore' })
}

export function closeChrome(proc) {
    if (!proc) return
    try {
        proc.kill()
    } catch {
        /* 已退出 */
    }
}
