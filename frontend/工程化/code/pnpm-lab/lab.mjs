#!/usr/bin/env node
// 按 case 名分发；每个 case 自己准备临时工程、执行命令，只打印稳定事实
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const CASES = ['store', 'strict', 'lockfile', 'workspace', 'ci']
const name = process.argv[2]

if (!name || !CASES.includes(name)) {
    console.log(`用法：pnpm lab <case>\n可选：${CASES.join(' / ')}`)
    process.exit(name ? 1 : 0)
}

const { runCase } = await import(`./cases/${name}.mjs`)
await runCase({ root: ROOT })
