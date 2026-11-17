import fs from 'node:fs'
import path from 'node:path'
import { run, copyFixture, rel } from './_util.mjs'

// workspace 实验：本地包用 workspace:* 建立链接，--filter 按依赖图先建依赖再建使用方
export async function runCase({ root }) {
    const dir = copyFixture(path.join(root, 'fixtures/workspace'), path.join(root, '.work/workspace'))
    run('pnpm install --reporter=silent', dir)

    const linkOf = target => {
        const link = fs.lstatSync(target)
        return `${link.isSymbolicLink() ? '符号链接' : '普通目录'} -> ${rel(dir, fs.realpathSync(target))}`
    }

    console.log(`web 的 @lab/ui       ${linkOf(path.join(dir, 'apps/web/node_modules/@lab/ui'))}`)
    console.log(`ui 的 @lab/utils     ${linkOf(path.join(dir, 'packages/ui/node_modules/@lab/utils'))}`)
    console.log(`web 运行结果         ${run('node apps/web/index.js', dir)}`)
    console.log('锁文件里的 workspace 协议：')
    console.log(
        fs
            .readFileSync(path.join(dir, 'pnpm-lock.yaml'), 'utf8')
            .split('\n')
            .filter(line => /workspace:|link:/.test(line))
            .join('\n')
    )
    console.log('按依赖图执行 build：')
    console.log(run('pnpm --filter @lab/web... --reporter=append-only run build', dir))
}
