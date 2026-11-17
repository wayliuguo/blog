import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

// 同步执行一条命令，返回去掉首尾空白的 stdout；失败时 error 上带 status / stderr
export function run(command, cwd) {
    return execSync(command, {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        // CI 让 pnpm 关掉交互与动画，输出只剩结果行
        env: { ...process.env, CI: '1' }
    }).trim()
}

// 清空并重建目录，保证每次实验从零开始
export function fresh(dir) {
    fs.rmSync(dir, { recursive: true, force: true })
    fs.mkdirSync(dir, { recursive: true })
    return dir
}

// 复制 fixture 到临时目录（目标先删掉，避免叠在旧结果上）
export function copyFixture(from, to) {
    fs.rmSync(to, { recursive: true, force: true })
    fs.cpSync(from, to, { recursive: true })
    return to
}

// 打印路径时统一用正斜杠，方便和文档里的路径对照
export function rel(root, target) {
    return path.relative(root, target).split(path.sep).join('/')
}

// 列出 node_modules 顶层的真实包名（跳过 .bin / .modules.yaml 这类内部项）
export function topLevel(dir) {
    return fs
        .readdirSync(path.join(dir, 'node_modules'))
        .filter(name => !name.startsWith('.'))
        .sort()
}
