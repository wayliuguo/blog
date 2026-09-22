// min-webpack：一个约百行的「最小 webpack」，复刻 Compiler → Compilation → Module → Chunk → Asset 五对象流水线
// 目的：把 webpack 篇「一、五个对象」那段心智模型落到能跑的代码，理解源码执行顺序
// 运行：node webpack-lab/min-webpack/bundle.cjs
// 只支持 ESM 静态 import，不含 loader 链/代码分割/tree-shaking，但「流水线顺序 + 运行时怎么生成」是真实的
'use strict'
const fs = require('node:fs')
const path = require('node:path')
const acorn = require('acorn')

// —— 钩子模型：tapable 的极简版。webpack 的 hook 就是这个原理：注册一批 fn，触发时按序调用 ——
class Hook {
    constructor() {
        this.taps = []
    }
    tap(name, fn) {
        this.taps.push({ name, fn })
    }
    call(...args) {
        for (const t of this.taps) t.fn(...args)
    }
}

// —— Compiler：一次构建的入口，只创建一次，持有配置与 hooks ——
class Compiler {
    constructor(options) {
        this.options = options
        // webpack 上各种 compiler.hooks.xxx 的缩小版；重点演示 make(建图) → seal(封装) → emit(写盘)
        this.hooks = { make: new Hook(), seal: new Hook(), emit: new Hook(), done: new Hook() }
    }

    run() {
        const compilation = new Compilation(this)
        // ① make：从入口出发递归解析依赖，构建模块图
        this.hooks.make.call(compilation)
        // ② seal：冻结模块图，按规则分 chunk
        this.hooks.seal.call(compilation)
        // ③ emit：渲染 chunk 为 asset
        this.hooks.emit.call(compilation)
        this.hooks.done.call(compilation, compilation.assets)
    }
}

// —— Compilation：一次编译的产物容器，Module / Chunk / Asset 都挂在它上面 ——
class Compilation {
    constructor(compiler) {
        this.compiler = compiler
        this.modules = new Map() // id -> Module
        this.chunks = [] // 一组 Module 的集合
        this.assets = {} // 最终写盘的文件
        this.dependencyGraph = new Map() // id -> 依赖的 id 列表，用来推导 chunk 边界
    }
}

// —— Module：一个源文件（经唯一「转换函数」处理后的结果）。loader 本质也是「源码→代码」的转换，这里退化成一根 transform ——
class Module {
    constructor(id, filename, code, deps) {
        this.id = id
        this.filename = filename
        this.code = code
        this.deps = deps
        this._rendered = false // 是否已生成运行时包裹代码
    }
}

// —— 解析原子依赖：把 import 变成「相对路径 → 模块 id」的映射 ——
function createResolver(entryDir) {
    return (fromFileName, request) => {
        if (!request.startsWith('.')) throw new Error(`仅支持相对依赖：${request}`)
        const sourceDir = path.dirname(fromFileName)
        // 尝试 .js / index.js 的 Node 解析规则
        for (const candidate of [path.join(sourceDir, request), path.join(sourceDir, request + '.js')]) {
            if (fs.existsSync(candidate)) return path.join(candidate)
        }
        throw new Error(`找不到模块：${request}（来自 ${fromFileName}）`)
    }
}

// —— 一个极简插件：在 emit 时把产物清单打出来（对应 webpack 篇 4.1 的 EmitListPlugin）——
class EmitListPlugin {
    apply(compiler) {
        compiler.hooks.emit.tap('EmitListPlugin', compilation => {
            console.log('\n---- 产物清单（emit 钩子）----')
            for (const [name, content] of Object.entries(compilation.assets)) {
                console.log(`  ${name.padEnd(24)} ${(content.length / 1024).toFixed(1)} KB`)
            }
        })
    }
}

// —— 转换阶段：把 ESM 转成 CJS（对应 webpack 的 loader/降级那一步；真实的 Babel/SWC 做的比这多得多）——
// 只处理本演示用到的四种写法：具名导入、默认导入、export function、export default
function transpile(code, importPathToId) {
    // import { a, b } from './x'
    code = code.replace(/^\s*import\s+\{([^}]+)\}\s+from\s+'([^']+)';?\s*$/gm, (_, names, from) => {
        return `var { ${names
            .split(',')
            .map(s => s.trim())
            .join(', ')} } = require(${importPathToId(from)});`
    })
    // import def from './x'
    code = code.replace(/^\s*import\s+(\w+)\s+from\s+'([^']+)';?\s*$/gm, (_, name, from) => {
        return `var ${name} = require(${importPathToId(from)});`
    })
    // export default <expr>
    code = code.replace(/^\s*export\s+default\s+(.+)$/gm, 'module.exports = $1')
    // export function / export const → 去掉 export 关键字
    code = code.replace(/^\s*export\s+(function|const|let|var|class)\b/gm, '$1')
    return code
}

// —— 组装：加运行时包裹，把每个模块包成 function(module, exports, require)，入口注入 require(0) ——
// webpack 产物的那套 `(() => { var modules = {...} })("runtime")` 就是这个，只被压缩/混淆得看不出原样
function renderRuntime(compilation) {
    // 模块 Map 以 id 为键，另建 filename→id 的反查表，便于把「依赖文件路径」映射成运行时的 require(id)
    const idByName = {}
    for (const [id, m] of compilation.modules) idByName[m.filename] = id
    const modulesCode = []
    for (const [id, m] of compilation.modules) {
        const depsMap = m.deps.map(d => `"${path.basename(d)}":${idByName[d]}`).join(',')
        const body = transpile(m.code, from => idByName[path.join(path.dirname(m.filename), from)])
        modulesCode.push(`${id}: function (module, exports, require) {\n${body}\n  // deps: { ${depsMap} }\n}`)
    }
    const runtime = `(function () {
  var modules = { ${modulesCode.join(',\n')} }
  var cache = {}
  function require(id) {
    if (cache[id]) return cache[id].exports
    var module = (cache[id] = { exports: {} })
    modules[id](module, module.exports, require)
    return module.exports
  }
  require(0)
})();`
    return runtime
}

function build(options) {
    const compiler = new Compiler(options)

    // 先注册内置的 make/seal/emit，再 apply 用户插件，保证用户插件的 emit 能看到已写入的 assets
    compiler.hooks.make.tap('MiniBundler', compilation => {
        const resolve = createResolver(options.context)
        // context + 入口字符串（context 是目录，入口相对它解析，不要 dirname）
        const entry =
            [options.entry, options.entry + '.js'].map(p => path.join(options.context, p)).find(fs.existsSync) ||
            path.join(options.context, options.entry)
        // 自顶向下解析入口，得到模块图
        const dfs = fileName => {
            const code = fs.readFileSync(fileName, 'utf8')
            const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' })
            const deps = []
            for (const node of ast.body) {
                if (node.type !== 'ImportDeclaration') continue
                if (node.source.value.startsWith('.')) {
                    const depFile = resolve(fileName, node.source.value)
                    deps.push(depFile)
                }
            }
            const module = new Module(compilation.modules.size, fileName, code, deps)
            compilation.modules.set(module.id, module)
            for (const dep of deps) dfs(dep)
        }
        dfs(entry)
    })

    compiler.hooks.seal.tap('MiniBundler', compilation => {
        // 本实现所有模块进一个 chunk；真实 webpack 在这里根据 splitChunks 规则切多个 chunk
        compilation.chunks = [compilation]
    })

    compiler.hooks.emit.tap('MiniBundler', compilation => {
        const content = renderRuntime(compilation)
        const outFile = path.join(options.output.path, options.output.filename)
        fs.mkdirSync(options.output.path, { recursive: true })
        fs.writeFileSync(outFile, content)
        compilation.assets[options.output.filename] = content
    })

    // 内置钩子注册完之后再 apply 用户插件，保证用户 emit 能看到产物清单
    for (const plugin of options.plugins || []) plugin.apply(compiler)

    compiler.run()
    return compiler
}

// —— 演示：两个模块互相 import + 一个 emit 插件 ——
const ROOT = __dirname
build({
    context: ROOT,
    entry: './src/entry.js',
    output: { path: path.join(ROOT, 'dist-min'), filename: 'bundle.js' },
    plugins: [new EmitListPlugin()]
})

console.log('\n产物片段（bundle.js 的运行时骨架，与 webpack 同构）：')
const out = fs.readFileSync(path.join(ROOT, 'dist-min', 'bundle.js'), 'utf8')
console.log(out.slice(0, 220) + '\n…')
