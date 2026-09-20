// runtime-lab 运行器
//
//   npm run runtime   —— 逐个转译并执行 demos/*.ts，每个 demo 用 node:assert 自检；
//                        任何一个 demo 抛错（说明教学代码写错了）就非零退出。
const fs = require('fs')
const path = require('path')
const Module = require('module')
const { transpileFile, version } = require('./_tsc.cjs')

const demosDir = path.join(__dirname, 'demos')
const files = fs
    .readdirSync(demosDir)
    .filter(f => f.endsWith('.ts'))
    .sort()
    .map(f => path.join(demosDir, f))

console.log(`runtime-lab · typescript ${version} · ${files.length} 个 demo`)
let failed = 0
for (const file of files) {
    const name = path.basename(file)
    const out = transpileFile(file)
    const m = new Module(file, module)
    m.filename = file
    m.paths = Module._nodeModulePaths(path.dirname(file))
    try {
        console.log(`\n—— ${name} ——`)
        m._compile(out, file)
        console.log('   ✓ 自检通过')
    } catch (e) {
        failed++
        const stack = e && e.stack ? e.stack.split('\n').slice(0, 4).join('\n   ') : e
        console.log(`   ✗ 抛错\n   ${stack}`)
    }
}
console.log(`\n${failed === 0 ? '全部通过 ✓' : failed + ' 个 demo 抛错 ✗'}`)
process.exit(failed === 0 ? 0 : 1)
