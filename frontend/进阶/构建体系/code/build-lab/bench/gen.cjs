// bench：生成一份"够大但可控"的源码样本，供后面的构建耗时对比使用
// 运行：由 bench/run.cjs 自动调用，也可 node bench/gen.cjs
const fs = require('node:fs')
const path = require('node:path')

const OUT = path.join(__dirname, 'src')
const N = Number(process.argv[2] || 200)

fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })

// 每个模块导出 3 个东西：其中 used 会被入口用到，unused 用来看 tree-shaking
for (let i = 1; i <= N; i++) {
    const next = i < N ? `\nexport { used as u${i + 1} } from './m${i + 1}.js'` : ''
    const src = `// m${i}.js
export function used(x) {
    return x + ${i}
}

export function unused${i}() {
    return '这段应该被 tree-shaking 摇掉 ${i}'
}

export const big${i} = [${Array.from({ length: 20 }, (_, k) => k + i).join(', ')}]
${next}
`
    fs.writeFileSync(path.join(OUT, `m${i}.js`), src)
}

const entry = `import { used as u1 } from './m1.js'
import { used as u2 } from './m2.js'

const total = u1(1) + u2(2)
console.log('total', total)
`
fs.writeFileSync(path.join(OUT, 'index.js'), entry)

console.log(`生成 ${N} 个模块 + 入口，写入 ${path.relative(process.cwd(), OUT)}`)
