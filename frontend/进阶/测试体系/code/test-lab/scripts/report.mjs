// 自定义 reporter 演示：把 vitest 的 JSON 报告汇总成"给机器看"和"给人看"两份信息
// 运行：npm run report
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const outFile = path.join('node_modules', '.cache', 'test-lab-report.json')
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'

const res = spawnSync(
    npm,
    ['exec', '--', 'vitest', 'run', '--reporter=json', `--outputFile.json=${outFile}`],
    { encoding: 'utf8', shell: true, stdio: ['ignore', 'pipe', 'pipe'] }
)

if (!fs.existsSync(outFile)) {
    console.error('没能拿到 JSON 报告：', (res.stdout || '').slice(0, 400), (res.stderr || '').slice(0, 400))
    process.exit(1)
}

const report = JSON.parse(fs.readFileSync(outFile, 'utf8'))
const files = report.testResults || []
let passed = 0
let failed = 0
let skipped = 0
const slow = []

for (const file of files) {
    for (const t of file.assertionResults || []) {
        if (t.status === 'passed') passed += 1
        else if (t.status === 'failed') failed += 1
        else skipped += 1
        if (typeof t.duration === 'number') slow.push({ title: `${path.basename(file.name)} > ${t.title}`, duration: t.duration })
    }
}

slow.sort((a, b) => b.duration - a.duration)

console.log('---- 给机器看（门禁 / 趋势用）----')
console.log(
    JSON.stringify(
        {
            numTotalTests: report.numTotalTests ?? passed + failed + skipped,
            numPassedTests: report.numPassedTests ?? passed,
            numFailedTests: report.numFailedTests ?? failed,
            success: report.success ?? failed === 0,
            durationMs: Math.round(report.runDuration ?? 0)
        },
        null,
        2
    )
)

console.log('\n---- 给人看（本次最慢的 5 个用例）----')
for (const item of slow.slice(0, 5)) {
    console.log(`${String(item.duration).padStart(6)}ms  ${item.title}`)
}

process.exit(failed > 0 ? 1 : 0)
