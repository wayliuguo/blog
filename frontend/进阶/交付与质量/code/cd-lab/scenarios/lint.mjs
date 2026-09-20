/**
 * 场景：全量 lint vs 增量 lint（只跑改动文件）
 * 运行：npm run lint
 *
 * 用的是仓库根 node_modules 里真实安装的 ESLint 8，不是模拟的计时器：
 * 数字是 ESLint 自己跑出来的，所以「增量快多少」这个结论才有意义
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { title, section, table, ms, num, median, pct } from '../harness/table.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const LAB = path.resolve(HERE, '..')
const FIXTURES = path.join(LAB, 'fixtures')
const SRC = path.join(FIXTURES, 'src')
const CONTRACT = path.join(FIXTURES, 'contract')
// 仓库根：eslint 装在那里。也可以用 ESLINT_DIR 指向另一个装了 eslint 的目录
const REPO_ROOT = path.resolve(LAB, '../../../../..')

const require = createRequire(import.meta.url)

function loadEslint() {
    const root = process.env.ESLINT_DIR || REPO_ROOT
    try {
        return require(require.resolve('eslint', { paths: [root] }))
    } catch {
        console.error(`没找到 ESLint（在 ${root} 下没解析到）`)
        console.error('可以：npm i -D eslint@8，或用 ESLINT_DIR=/path/to/project npm run lint 指定一个装了 eslint 的目录')
        process.exit(1)
    }
}

const CONFIG = {
    root: true,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    env: { es2022: true, browser: true, node: true },
    rules: {
        'no-var': 'error',
        eqeqeq: 'error',
        'no-console': 'warn',
        'no-unused-vars': 'error'
    }
}

/** 一个样品模块：12 个导出 + 三条故意留的问题（var / == / console） */
function sample(i) {
    const lines = [`// 样品模块 ${i}`, '']
    for (let k = 0; k < 12; k++) lines.push(`export function f${i}_${k}(a) { return a + ${k} }`)
    lines.push(`var legacy${i} = ${i}`)
    lines.push(`export function check${i}(a, b) {`)
    lines.push(`    if (a == b) console.log('eq', legacy${i})`)
    lines.push(`    return a !== b`)
    lines.push('}')
    return lines.join('\n') + '\n'
}

function generate(count) {
    fs.mkdirSync(SRC, { recursive: true })
    const files = []
    for (let i = 0; i < count; i++) {
        const file = path.join(SRC, `m${i}.js`)
        fs.writeFileSync(file, sample(i))
        files.push(file)
    }
    return files
}

async function lintFiles(eslint, files) {
    const t0 = performance.now()
    const results = await eslint.lintFiles(files)
    const cost = performance.now() - t0
    let problems = 0
    let errors = 0
    for (const r of results) {
        errors += r.errorCount
        problems += r.errorCount + r.warningCount
    }
    return { cost, count: results.length, problems, errors }
}

/** 多轮取中位数：ESLint 的首次调用含加载规则与解析器的开销，第一轮通常偏慢 */
async function rounds(eslint, files, n = 3) {
    const runs = []
    for (let i = 0; i < n; i++) runs.push(await lintFiles(eslint, files))
    return {
        cost: median(runs.map((r) => r.cost)),
        count: runs[0].count,
        problems: runs[0].problems,
        errors: runs[0].errors
    }
}

export default async function run() {
    const { ESLint } = loadEslint()
    const eslint = new ESLint({ useEslintrc: false, overrideConfig: CONFIG, cwd: FIXTURES })

    const TOTAL = 1000
    const CHANGED = 12
    const files = generate(TOTAL)
    const changed = files.slice(0, CHANGED)

    const full = await rounds(eslint, [SRC])
    const incr = await rounds(eslint, changed)

    console.log(title(`全量 lint vs 增量 lint：${TOTAL} 个文件的样品工程（3 轮中位数）`))
    console.log(
        table(
            ['策略', '被检查文件', '耗时', '单文件', '报出的问题', '相对全量'],
            [
                ['全量 lint', full.count, ms(full.cost), ms(full.cost / full.count), full.problems, '—'],
                [
                    '只 lint 改动的 12 个',
                    incr.count,
                    ms(incr.cost),
                    ms(incr.cost / incr.count),
                    incr.problems,
                    `${num(incr.cost / full.cost, 2)}×`
                ]
            ]
        )
    )

    console.log(section('省下的时间换算'))
    const saved = (full.cost - incr.cost) / 1000
    console.log(`- 一次提交少等 ${num(saved, 1)} 秒`)
    console.log(`- 5 人团队每人每天 8 次提交 = 40 次 → 每天省 ${num((saved * 40) / 60, 1)} 分钟`)
    console.log('- 但 pre-commit 只是第一道门：CI 上仍然要跑全量，否则「别人改的代码」永远没人查')
    console.log(`- 所以增量不是「更严格或更松」，是**把反馈时间从 ${ms(full.cost)} 压到 ${ms(incr.cost)} 而不降低 CI 的标准**`)

    console.log(section('这个耗时随规模怎么长（决定要不要做增量）'))
    const scale = []
    for (const n of [100, 300, 1000]) {
        const r = await rounds(eslint, files.slice(0, n), 1)
        scale.push([`${n} 个文件`, ms(r.cost), ms(r.cost / n)])
    }
    console.log(table(['规模', '全量耗时', '单文件耗时'], scale))
    console.log('- 单文件耗时基本恒定 → **总耗时对文件数是线性的**，没有缓存时能到什么量级可以直推')
    console.log('- 这里用的是 4 条内置规则、每个文件 ~20 行。真实项目里换成 @typescript-eslint')
    console.log('  （要做类型感知解析）单文件会贵一个量级，1000 个文件经常是 10~30 秒——')
    console.log('  那个量级下，增量已经不是「体验优化」而是「能不能忍」的差别了')

    console.log(section('增量的盲区：改了导出名，谁都不会报'))
    fs.mkdirSync(CONTRACT, { recursive: true })
    const a = path.join(CONTRACT, 'a.js')
    const b = path.join(CONTRACT, 'b.js')
    fs.writeFileSync(a, 'export function getUserName(u) { return u.name }\n')
    fs.writeFileSync(b, "import { getUserName } from './a.js'\nexport function greet(u) { return 'hi ' + getUserName(u) }\n")
    const before = await lintFiles(eslint, [CONTRACT])

    // 把 a.js 的导出改名：b.js 的 import 从此拿不到东西，但两份文件各自都是「合法」的
    fs.writeFileSync(a, 'export function getUserName2(u) { return u.name }\n')
    const onlyA = await lintFiles(eslint, [a])
    const onlyB = await lintFiles(eslint, [b])
    const both = await lintFiles(eslint, [CONTRACT])

    console.log(
        table(
            ['检查范围', '报出的问题'],
            [
                ['改动前，全量检查 a+b', before.problems],
                ['把 a 的导出改名后，只检查 a', onlyA.problems],
                ['只检查 b（引用方）', onlyB.problems],
                ['两个一起全量检查', both.problems]
            ]
        )
    )
    console.log('- 全是 0。这不是增量的锅：**ESLint 本身就是单文件的静态分析**，')
    console.log('  它不解析 import 指向的那个文件里到底导出了什么。')
    console.log('- 真正拦住这类问题的是 TypeScript（类型检查跨文件）、构建（Rollup/Vite 会报')
    console.log('  "getUserName is not exported by a.js"）、以及跑起来的测试。')
    console.log('- 所以门禁要分层：lint 拦风格与明显错误，跨文件契约交给更贵的那一层。')

    console.log(section('另一个副作用：历史问题看不见了'))
    console.log(`- 全量 lint 会报出 ${full.problems} 个问题（含历史遗留），增量只报 ${incr.problems} 个`)
    console.log('- 好处：改一个文件不会被一百个别人的历史问题淹没，门槛才立得住')
    console.log('- 坏处：历史债务就此隐形。配套做法是上**基线**（把当前问题数记下来当起点，')
    console.log('  之后不许新增），而不是假装它们不存在。')
}
