// esm-probe：把「模块化」里那些靠记忆容易记错的语义，逐个跑成可复现的输出
// 运行：npm run probe
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))

// twin 是一个带 exports 条件映射的迷你包。bare specifier 只会去 node_modules
// 里找，所以运行前把它复制过去 —— 这份副本是运行产物，不入库。
function linkTwin() {
    const src = path.join(ROOT, 'pkgs', 'twin')
    const dst = path.join(ROOT, 'node_modules', 'twin')
    fs.rmSync(dst, { recursive: true, force: true })
    fs.mkdirSync(dst, { recursive: true })
    for (const f of fs.readdirSync(src)) fs.copyFileSync(path.join(src, f), path.join(dst, f))
}

function step(title) {
    console.log(`\n${'─'.repeat(60)}\n${title}\n${'─'.repeat(60)}`)
}

function probe(file, extraArgs = []) {
    const p = spawnSync(process.execPath, [...extraArgs, path.join(ROOT, 'probe', file)], {
        encoding: 'utf8',
        cwd: ROOT
    })
    process.stdout.write(p.stdout || '')
    if (p.status !== 0) process.stdout.write(p.stderr || '')
}

linkTwin()

step('探针 1：导入拿到的是引用还是快照')
probe('live-binding.mjs')

step('探针 2：循环依赖时谁先拿到 undefined')
probe('circular.mjs')

step('探针 3：ESM 引 CJS，具名导入从哪来')
probe('interop.mjs')

step('探针 4：条件导出按什么顺序命中')
probe('conditions.mjs')
probe('conditions.mjs', ['--conditions=browser'])

step('探针 5：同一个包被 import 和 require 各加载一次')
probe('dual-hazard.mjs')
