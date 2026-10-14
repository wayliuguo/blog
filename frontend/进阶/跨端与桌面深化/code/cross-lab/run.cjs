'use strict'
// 总入口：node run.cjs 依次执行全部探针（同进程 require，规避沙箱内 spawn 限制）
const path = require('node:path')

const cases = ['jsi.cjs', 'twin.cjs', 'webview.cjs', 'bridge.cjs', 'electron.cjs', 'mapper.cjs', 'three-trees.cjs']
let fail = 0
for (const c of cases) {
    console.log(`\n===== ${c} =====`)
    try {
        require(path.join(__dirname, c))
    } catch (e) {
        fail++
        console.error(e.stack || e.message)
    }
}
console.log(fail === 0 ? '\ncross-lab 全部探针通过 ✓' : `\n${fail} 个探针失败 ✗`)
process.exitCode = fail
