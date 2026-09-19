#!/usr/bin/env node
/**
 * eng-lab 命令行入口：node cli.mjs <场景名>
 * 每个场景自带临时服务器（端口由系统分配），跑完自动退出，不需要固定端口。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'scenarios')
const names = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith('.mjs') && f !== 'all.mjs')
    .map((f) => f.replace(/\.mjs$/, ''))
    .sort()
const name = process.argv[2]

if (!name || name === 'list') {
    console.log('可用场景：\n  ' + names.join('\n  '))
    process.exit(name ? 0 : 1)
}
if (name !== 'all' && !names.includes(name)) {
    console.error(`没有这个场景：${name}\n可用：${names.join(' ')} all`)
    process.exit(1)
}

const mod = await import(new URL(`./scenarios/${name}.mjs`, import.meta.url))
await mod.default()
