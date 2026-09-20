// run.cjs — lowcode-lab 总入口：依次执行全部探针，任何一个失败立即终止
'use strict'
const { spawnSync } = require('node:child_process')
const path = require('node:path')

const cases = ['schema.cjs', 'render.cjs', 'editor.cjs', 'boundary.cjs']
let failed = 0

for (const c of cases) {
    const r = spawnSync(process.execPath, [path.join(__dirname, c)], { stdio: 'inherit' })
    if (r.status !== 0) {
        console.error(`FAIL ${c} (exit ${r.status})`)
        failed++
    }
}

console.log(failed ? `\n${failed} 个探针失败` : '\nlowcode-lab 全部探针通过')
process.exit(failed ? 1 : 0)
