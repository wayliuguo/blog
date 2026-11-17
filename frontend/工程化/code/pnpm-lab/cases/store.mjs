import fs from 'node:fs'
import path from 'node:path'
import { run, fresh, rel } from './_util.mjs'

// store 实验：同一个包装进两个临时工程，看实体文件是否同一份、顶层是不是链接
// 用独立 store 目录，避免机器上其他工程的硬链接干扰 nlink
export async function runCase({ root }) {
    const storeDir = path.join(root, '.work/store')
    const dirs = ['store-a', 'store-b'].map(name => {
        const dir = fresh(path.join(root, '.work', name))
        fs.writeFileSync(
            path.join(dir, 'package.json'),
            JSON.stringify(
                { name, private: true, dependencies: { 'is-odd': '3.0.1' } },
                null,
                4
            )
        )
        run(`pnpm install --reporter=silent --prefer-offline --store-dir "${storeDir}"`, dir)
        return dir
    })

    const pkgOf = dir => path.join(dir, 'node_modules/.pnpm/is-odd@3.0.1/node_modules/is-odd/package.json')
    const [a, b] = dirs
    const statA = fs.statSync(pkgOf(a))
    const statB = fs.statSync(pkgOf(b))
    const topLink = fs.lstatSync(path.join(a, 'node_modules/is-odd'))
    const real = fs.realpathSync(path.join(a, 'node_modules/is-odd'))

    console.log(`专用 store         ${rel(root, storeDir)}`)
    console.log(`.pnpm 里的实体     ${rel(a, path.dirname(pkgOf(a)))}`)
    console.log(`顶层 is-odd        ${topLink.isSymbolicLink() ? '符号链接' : '普通目录'} -> ${rel(a, real)}`)
    console.log(`两个工程同一文件   同一 inode：${statA.ino === statB.ino ? '是' : '否'}，nlink=${statB.nlink}`)
    console.log(`.pnpm 下的包       ${fs.readdirSync(path.join(a, 'node_modules/.pnpm')).filter(name => !name.startsWith('.') && name !== 'lock.yaml' && name !== 'node_modules').sort().join(' ')}`)
}
