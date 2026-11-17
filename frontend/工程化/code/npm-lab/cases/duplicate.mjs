import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { run, fresh, copyFixture } from './_util.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// 重复安装：is-even@1.0.0 依赖 is-odd@0.1.2（要 is-number@3.0.0），
// 根工程又直接要 is-odd@3.0.1（要 is-number@6.0.0）。
// 平坦树里同名的两个版本只能一份在顶层、另一份嵌进父包自己的 node_modules
export async function runCase() {
    const dir = copyFixture(path.join(root, 'fixtures/duplicate'), fresh(path.join(os.tmpdir(), 'npm-lab-duplicate')))
    run('npm install --silent --no-audit --no-fund', dir)

    // --parseable 每个已安装包输出一行绝对路径，嵌套的那份也在里面
    const rows = run('npm ls --all --parseable', dir)
        .split(/\r?\n/)
        .filter(Boolean)
        .filter(pkgDir => pkgDir !== dir)
        .map(pkgDir => {
            const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'))
            return {
                where: path.relative(dir, pkgDir).split(path.sep).join('/'),
                name: pkg.name,
                version: pkg.version
            }
        })
        .sort((a, b) => a.where.localeCompare(b.where))

    console.log(`安装目录数          ${rows.length}`)
    console.log('node_modules 布局')
    for (const row of rows) console.log(`  ${row.where}  ${row.name}@${row.version}`)

    const byName = new Map()
    for (const { name, version } of rows) {
        if (!byName.has(name)) byName.set(name, new Set())
        byName.get(name).add(version)
    }
    for (const [name, versions] of byName) {
        if (versions.size > 1) console.log(`重复安装            ${name}  ${[...versions].join(' + ')}`)
    }

    // 同一句 require('is-number')，在根目录和 is-even 里命中不同副本
    const query = 'node -p "require(\'is-number/package.json\').version"'
    console.log(`根目录 require      is-number@${run(query, dir)}`)
    console.log(`is-even 内 require  is-number@${run(query, path.join(dir, 'node_modules/is-even'))}`)
}

await runCase()
