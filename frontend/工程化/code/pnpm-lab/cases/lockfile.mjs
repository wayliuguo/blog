import fs from 'node:fs'
import path from 'node:path'
import { run, fresh } from './_util.mjs'

// lockfile 实验：先由 package.json 生成锁文件，再验证 frozen 门禁会拦住"声明变了但锁没更新"
export async function runCase({ root }) {
    const dir = fresh(path.join(root, '.work/lockfile'))
    const pkgFile = path.join(dir, 'package.json')
    fs.writeFileSync(
        pkgFile,
        JSON.stringify({ name: 'lockfile-demo', private: true, dependencies: { 'is-odd': '3.0.1' } }, null, 4) + '\n'
    )

    run('pnpm install --lockfile-only --reporter=silent', dir)
    const lockFile = path.join(dir, 'pnpm-lock.yaml')
    const lock = fs.readFileSync(lockFile, 'utf8')

    console.log(`lockfileVersion    ${lock.match(/^lockfileVersion: (.+)$/m)[1]}`)
    console.log('pnpm-lock.yaml：')
    console.log(lock.trimEnd())

    // 只改 package.json，不动锁文件
    const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'))
    pkg.dependencies['is-number'] = '6.0.0'
    fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 4) + '\n')

    let frozen = '未失败'
    try {
        run('pnpm install --frozen-lockfile --reporter=append-only', dir)
    } catch (err) {
        const text = `${err.message || ''}\n${err.stdout || ''}\n${err.stderr || ''}`
        frozen = (text.match(/ERR_PNPM_[A-Z_]+/) || ['未捕获错误码'])[0]
    }
    console.log(`frozen 安装        ${frozen}`)

    run('pnpm install --lockfile-only --reporter=silent', dir)
    const updated = fs.readFileSync(lockFile, 'utf8')
    const direct = /is-number:\s*\n\s*specifier: 6\.0\.0/.test(updated)
    console.log(`重新生成锁文件      直接依赖 is-number 已写入 importers：${direct ? '是' : '否'}`)
}
