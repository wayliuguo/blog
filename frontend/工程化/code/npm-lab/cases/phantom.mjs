import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { run, fresh, copyFixture, topLevel } from './_util.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// 幽灵依赖：fixture 只声明 is-odd，src/check.js 却 require 它的传递依赖 is-number
// 临时工程放系统临时目录，避免向上命中博客仓库自己的 node_modules
export async function runCase() {
    const dir = copyFixture(path.join(root, 'fixtures/phantom'), fresh(path.join(os.tmpdir(), 'npm-lab-phantom')))
    run('npm install --silent --no-audit --no-fund', dir)

    console.log(`npm 顶层            ${topLevel(dir).join(' ')}`)
    console.log(`npm 运行 check.js   ${run('node src/check.js', dir)}`)
}

await runCase()
