import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { run, fresh, copyFixture, topLevel } from './_util.mjs'

// 严格性实验：同一份源码（只声明 is-odd，却 require is-number）分别用 npm / pnpm 安装
// 临时工程放到系统临时目录，避免向上找到博客仓库自己的 node_modules 而误判
export async function runCase({ root }) {
    const fixture = path.join(root, 'fixtures/strict-pkg')
    const base = fresh(path.join(os.tmpdir(), 'pnpm-lab-strict'))
    const npmDir = copyFixture(fixture, path.join(base, 'npm'))
    const pnpmDir = copyFixture(fixture, path.join(base, 'pnpm'))

    run('npm install --silent --no-audit --no-fund', npmDir)
    run('pnpm install --reporter=silent --no-frozen-lockfile', pnpmDir)

    console.log(`npm 顶层            ${topLevel(npmDir).join(' ')}`)
    console.log(`pnpm 顶层           ${topLevel(pnpmDir).join(' ')}`)
    console.log(`npm 运行 check.js   ${run('node src/check.js', npmDir)}`)
    console.log(`pnpm 运行 check.js  ${run('node src/check.js', pnpmDir)}`)

    // 补上显式声明后，pnpm 也会把 is-number 放到顶层
    const pkgFile = path.join(pnpmDir, 'package.json')
    const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'))
    pkg.dependencies['is-number'] = '6.0.0'
    fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 4) + '\n')
    run('pnpm install --reporter=silent --no-frozen-lockfile', pnpmDir)

    console.log(`pnpm 补声明后顶层   ${topLevel(pnpmDir).join(' ')}`)
    console.log(`pnpm 补声明后结果   ${run('node src/check.js', pnpmDir)}`)
}
