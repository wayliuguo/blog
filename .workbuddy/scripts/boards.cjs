/**
 * 板块（board）解析 —— check-*.cjs 三个校验脚本共用的单一事实来源。
 *
 * 板块 = 仓库顶层的内容目录，与 .vitepress/config/<board>.js 一一对应：
 *   ai / frontend / node   （docs/ 只放设计稿，没有侧边栏配置）
 * 新增板块时只要加一个顶层目录 + 一份 sidebar 配置，三个脚本自动覆盖。
 *
 * 提供：
 *   boards.contentBoards()  顶层含 .md 的目录（找链接用）
 *   boards.sidebarBoards()  有 .vitepress/config/<name>.js 的目录（查覆盖用）
 *   boards.select(list)     按命令行 --board 过滤
 *   boards.walkMd(dir)      递归收集 .md（跳过 code/ 与 node_modules/）
 *   boards.stripFences(md)  去掉围栏代码块（避免把示例代码当正文扫）
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../..')
const CONFIG_DIR = path.join(ROOT, '.vitepress', 'config')
const SKIP_DIRS = new Set(['node_modules', 'dist', '.vitepress', '.git', '.workbuddy'])

function readDirSafe(dir) {
    try {
        return fs.readdirSync(dir, { withFileTypes: true })
    } catch {
        return []
    }
}

function hasMd(dir, depth = 6) {
    if (depth < 0) return false
    for (const e of readDirSafe(dir)) {
        if (e.isDirectory()) {
            if (SKIP_DIRS.has(e.name) || e.name === 'code') continue
            if (hasMd(path.join(dir, e.name), depth - 1)) return true
        } else if (e.name.endsWith('.md')) return true
    }
    return false
}

function contentBoards() {
    return readDirSafe(ROOT)
        .filter(e => e.isDirectory() && !SKIP_DIRS.has(e.name) && !e.name.startsWith('.'))
        .map(e => e.name)
        .filter(n => hasMd(path.join(ROOT, n)))
        .sort()
}

function sidebarBoards() {
    return readDirSafe(CONFIG_DIR)
        .filter(e => e.isFile() && e.name.endsWith('.js'))
        .map(e => path.basename(e.name, '.js'))
        .filter(n => n !== 'nav' && fs.existsSync(path.join(ROOT, n)) && hasMd(path.join(ROOT, n)))
        .sort()
}

/** 解析 --board a,b（可重复出现），返回去重后的数组；未指定返回 null 表示"全部" */
function parseBoardArg(argv = process.argv.slice(2)) {
    const picked = []
    argv.forEach((a, i) => {
        if (a === '--board' && argv[i + 1]) picked.push(...argv[i + 1].split(','))
    })
    const clean = picked.map(s => s.trim()).filter(Boolean)
    return clean.length ? [...new Set(clean)] : null
}

/** 按 --board 过滤；未指定则原样返回 */
function select(list, argv = process.argv.slice(2)) {
    const want = parseBoardArg(argv)
    if (!want) return list
    return list.filter(n => want.includes(n))
}

/** 递归收集 .md；跳过 code/（配套示例代码）与 node_modules/ */
function walkMd(dir, acc = []) {
    for (const e of readDirSafe(dir)) {
        const p = path.join(dir, e.name)
        if (e.isDirectory()) {
            if (SKIP_DIRS.has(e.name) || e.name === 'code') continue
            walkMd(p, acc)
        } else if (e.name.endsWith('.md')) acc.push(p)
    }
    return acc
}

/** 去掉 ``` 围栏代码块（含 ```text），避免示例代码里的 ](…) 被当成正文链接 */
function stripFences(md) {
    return md.replace(/^```[^\n]*\n[\s\S]*?^```[ \t]*$/gm, '')
}

module.exports = {
    ROOT,
    CONFIG_DIR,
    contentBoards,
    sidebarBoards,
    parseBoardArg,
    select,
    walkMd,
    stripFences
}
