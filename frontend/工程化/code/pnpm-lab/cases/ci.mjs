import fs from 'node:fs'
import path from 'node:path'
import { run, copyFixture, rel } from './_util.mjs'

// CI 实验：只凭锁文件预热专用 store，再在离线模式下完成安装
export async function runCase({ root }) {
    const dir = copyFixture(path.join(root, 'fixtures/workspace'), path.join(root, '.work/ci'))
    const store = rel(dir, path.join(dir, '.store'))

    run(`pnpm fetch --store-dir ${store} --reporter=silent`, dir)
    const linked = fs.existsSync(path.join(dir, 'apps/web/node_modules/@lab/ui')) ? '存在' : '不存在'

    run(`pnpm install --offline --frozen-lockfile --store-dir ${store} --reporter=silent`, dir)

    console.log(`fetch 后 web 的链接      ${linked}`)
    console.log(`离线安装                成功`)
    console.log(`专用 store              ${store}`)
    console.log(`web 运行结果            ${run('node apps/web/index.js', dir)}`)
}
