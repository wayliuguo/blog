import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { run, fresh, copyFixture, topLevel } from './_util.mjs'

// 严格性实验：项目只声明 is-odd，源码却 require 它的传递依赖 is-number
// 临时工程放系统临时目录，避免向上命中博客仓库自己的 node_modules
export async function runCase({ root }) {
    const fixture = path.join(root, 'fixtures/strict-pkg')
    const dir = copyFixture(fixture, path.join(fresh(path.join(os.tmpdir(), 'pnpm-lab-strict')), 'pnpm'))

    run('pnpm install --reporter=silent --no-frozen-lockfile', dir)
    console.log(`pnpm 顶层           ${topLevel(dir).join(' ')}`)
    console.log(`pnpm 运行 check.js  ${run('node src/check.js', dir)}`)

    // 补上显式声明后，is-number 才会作为直接依赖出现在顶层
    const pkgFile = path.join(dir, 'package.json')
    const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'))
    pkg.dependencies['is-number'] = '6.0.0'
    fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 4) + '\n')
    run('pnpm install --reporter=silent --no-frozen-lockfile', dir)

    console.log(`pnpm 补声明后顶层   ${topLevel(dir).join(' ')}`)
    console.log(`pnpm 补声明后结果   ${run('node src/check.js', dir)}`)
}
