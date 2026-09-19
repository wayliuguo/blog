// 共用：定位 typescript 编译器 + 两个运行时辅助
//
//   emitDts(src)  —— 从源码字符串生成 .d.ts（演示"类型发布"的本质）
//
// 本 lab 不自带依赖，从 code 目录逐级向上找 node_modules/typescript（仓库已装）。
const fs = require('fs')
const path = require('path')

function loadTypeScript() {
    let dir = __dirname
    while (true) {
        const candidate = path.join(dir, 'node_modules', 'typescript')
        if (fs.existsSync(path.join(candidate, 'package.json'))) {
            const ts = require(candidate)
            return { ts, version: require(path.join(candidate, 'package.json')).version }
        }
        const up = path.dirname(dir)
        if (up === dir) break
        dir = up
    }
    throw new Error('未找到 typescript。请在仓库根目录执行：npm i -D typescript')
}

const { ts, version } = loadTypeScript()

// 把 .ts 源码转成 CommonJS（只转译、不类型检查——本 lab 关注运行时行为）
function transpileFile(file) {
    const src = fs.readFileSync(file, 'utf8')
    return ts.transpileModule(src, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2020,
            esModuleInterop: true,
            skipLibCheck: true
        }
    }).outputText
}

// 从源码字符串生成 .d.ts：把"类型"单独抽成一份声明文件
function emitDts(src, fileName = 'module.ts') {
    const opts = {
        declaration: true,
        emitDeclarationOnly: true,
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        strict: true,
        skipLibCheck: true
    }
    const files = { [fileName]: src }
    const host = ts.createCompilerHost(opts)
    const baseGet = host.getSourceFile
    host.getSourceFile = (fn, lv, oe, sc) => {
        if (files[fn]) return ts.createSourceFile(fn, files[fn], lv, true)
        return baseGet(fn, lv, oe, sc)
    }
    host.fileExists = (fn) => !!files[fn] || ts.sys.fileExists(fn)
    host.readFile = (fn) => (files[fn] !== undefined ? files[fn] : ts.sys.readFile(fn))
    let dts = ''
    host.writeFile = (fn, text) => {
        if (fn.endsWith('.d.ts')) dts = text
    }
    const prog = ts.createProgram([fileName], opts, host)
    prog.emit()
    return dts
}

module.exports = { loadTypeScript, transpileFile, emitDts, version }
