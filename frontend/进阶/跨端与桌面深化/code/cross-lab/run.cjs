'use strict'
// 总入口：node run.cjs 依次执行全部探针
const { spawnSync } = require('node:child_process')
const path = require('node:path')

const cases = ['jsi.cjs', 'twin.cjs', 'webview.cjs', 'bridge.cjs', 'electron.cjs']
let fail = 0
for (const c of cases) {
  const r = spawnSync(process.execPath, [path.join(__dirname, c)], { encoding: 'utf8' })
  console.log(`\n===== ${c} =====`)
  process.stdout.write(r.stdout)
  if (r.status !== 0) {
    fail++
    console.error(r.stderr)
  }
}
console.log(fail === 0 ? '\ncross-lab 全部探针通过 ✓' : `\n${fail} 个探针失败 ✗`)
process.exitCode = fail
