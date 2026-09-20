/**
 * type-gym 类型判题器
 *
 * 两个用法：
 *   npm run gym          检查 solutions.ts（答案版）—— 当前状态应当 0 错误
 *   npm run gym:todo     检查 exercises.ts（未解题）—— 应当出现 N 处类型错误
 *
 * 为什么分两份：
 *   exercises.ts 里每道题的答案位是 `TODO`（= never），等式 `Expect<Equal<TODO, 期望>>`
 *   一定不成立 → 编译红，读者能立刻看到"哪题还没做对"。
 *   solutions.ts 把 TODO 换成正确答案 → 0 错误，作为判题与对答案的依据。
 *   两份共用 utils.ts 里的 Equal / Expect。
 */
const fs = require('fs')
const path = require('path')
const ts = require('typescript')

const exercisesMode = process.argv.includes('--exercises')
const dir = __dirname

const options = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    lib: ['lib.es2020.d.ts', 'lib.dom.d.ts'],
    strict: true,
    noEmit: true,
    skipLibCheck: true
}

// 默认只编译 utils + solutions；--exercises 才编译 utils + exercises。
const fileNames = exercisesMode
    ? [path.join(dir, 'utils.ts'), path.join(dir, 'exercises.ts')]
    : [path.join(dir, 'utils.ts'), path.join(dir, 'solutions.ts')]

const program = ts.createProgram(fileNames, options)
const all = ts.getPreEmitDiagnostics(program)

const byFile = new Map()
for (const d of all) {
    const name = d.file ? path.basename(d.file.fileName) : '(全局)'
    if (!byFile.has(name)) byFile.set(name, [])
    const text = ts.flattenDiagnosticMessageText(d.messageText, ' ')
    let line = ''
    if (d.file && d.start !== undefined) {
        const pos = d.file.getLineAndCharacterOfPosition(d.start)
        line = d.file.text.split('\n')[pos.line].trim()
    }
    byFile.get(name).push({ code: d.code, text, line })
}

console.log(
    `typescript ${ts.version} · ${exercisesMode ? 'exercises（未解题）' : 'solutions（答案）'} · ${all.length} 个诊断`
)

if (byFile.size === 0) {
    console.log(
        exercisesMode ? '\n⚠ 未解题居然 0 错误，说明 exercises 的答案位没写成 TODO' : '\n✓ 0 错误（答案全部成立）'
    )
} else {
    for (const [name, list] of byFile) {
        console.log(`\n${name}  ${list.length} 处`)
        for (const it of list.slice(0, 60))
            console.log(`  TS${it.code}  ${it.text}${it.line ? '\n        ' + it.line : ''}`)
        if (list.length > 60) console.log(`  … 其余 ${list.length - 60} 处省略`)
    }
}

// 默认模式：必须 0 错误才算通过；--exercises 模式：本来就期望有错误，直接 0 退出。
process.exit(exercisesMode ? 0 : byFile.size === 0 ? 0 : 1)
