/**
 * type-lab 类型检查器
 *
 * 两个模式：
 *   npm run check         检查全部示例 —— 当前状态应当 0 错误
 *   npm run check:errors  解封所有 `//ERR ` 开头的演示行再检查 —— 打印真实报错
 *
 * 为什么要 `//ERR` 这种写法：示例代码必须能直接跑通（否则 clone 下来一片红），
 * 但教学又需要展示"写错会怎样"。于是把错误行写成注释，默认不参与编译，
 * 加一个开关就能让它们集体现形，报错信息由编译器现场生成、不会过时。
 */
const fs = require('fs')
const path = require('path')
const { loadTypeScript } = require('./load-ts.cjs')

const { ts, version } = loadTypeScript()
const errorsMode = process.argv.includes('--errors')

const dir = __dirname
const fileNames = fs
    .readdirSync(dir)
    .filter((f) => /^\d\d-.*\.ts$/.test(f))
    .sort()
    .map((f) => path.join(dir, f))

const options = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    lib: ['lib.es2020.d.ts', 'lib.dom.d.ts'],
    strict: true,
    noEmit: true,
    skipLibCheck: true
}

// errors 模式下把 `//ERR ` 前缀去掉，让演示行变成真实代码
const host = ts.createCompilerHost(options)
const readSource = host.getSourceFile.bind(host)
host.getSourceFile = (fileName, langVersion, onError, shouldCreate) => {
    if (errorsMode && fileName.endsWith('.ts')) {
        const patched = fs
            .readFileSync(fileName, 'utf8')
            .split('\n')
            .map((line) => line.replace(/^(\s*)\/\/ERR /, '$1'))
            .join('\n')
        return ts.createSourceFile(fileName, patched, langVersion, true)
    }
    return readSource(fileName, langVersion, onError, shouldCreate)
}

function format(diagnostic) {
    const text = ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')
    if (diagnostic.file && diagnostic.start !== undefined) {
        const pos = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
        const line = diagnostic.file.text.split('\n')[pos.line].trim()
        return `TS${diagnostic.code}  ${text}\n        ${line}`
    }
    return `TS${diagnostic.code}  ${text}`
}

const program = ts.createProgram(fileNames, options, host)
const all = ts.getPreEmitDiagnostics(program)

console.log(`typescript ${version} · ${fileNames.length} 个示例 · ${errorsMode ? 'errors 模式（已解封 //ERR 行）' : '默认模式'}`)

const byFile = new Map()
for (const d of all) {
    const name = d.file ? path.basename(d.file.fileName) : '(全局)'
    if (!byFile.has(name)) byFile.set(name, [])
    byFile.get(name).push(format(d))
}

if (byFile.size === 0) {
    console.log(errorsMode ? '\n全部解封后仍然 0 错误（说明 //ERR 行没写对）' : '\n✓ 0 错误')
} else {
    for (const [name, list] of byFile) {
        console.log(`\n${name}  ${list.length} 项`)
        for (const item of list) console.log(`  ${item}`)
    }
}
// 只有"默认模式还报错"才算失败；errors 模式报得越多越正常
process.exit(byFile.size > 0 && !errorsMode ? 1 : 0)
