// 手写迷你打包器：模块图 → 依赖解析 → ESM→CJS 转换 → 运行时拼装
// 运行：npm run mini（默认入口 src/entry.js）/ npm run mini:cycle
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const acorn = require('acorn')
const MagicString = require('magic-string')

const ROOT = __dirname
const ENTRY = path.resolve(ROOT, process.argv[2] || 'src/entry.js')
const OUT_FILE = path.join(ROOT, 'dist', 'bundle.js')

const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/')

// ---------- 1. 依赖解析：把 import 里的相对路径变成磁盘上的真实文件 ----------
function resolveId(specifier, importer) {
    if (!specifier.startsWith('.')) {
        throw new Error(`只支持相对路径依赖，遇到裸模块 ${specifier}（来自 ${rel(importer)}）`)
    }
    const abs = path.resolve(path.dirname(importer), specifier)
    // 浏览器要求写全后缀，真实打包器会替我们补：./x → ./x.js → ./x/index.js
    for (const candidate of [abs, abs + '.js', path.join(abs, 'index.js')]) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate
    }
    throw new Error(`找不到模块 ${specifier}（来自 ${rel(importer)}）`)
}

// ---------- 2. 建图：DFS 收集模块，id 按发现顺序分配，入口是 0 ----------
const modules = new Map() // 绝对路径 → 模块记录

function collect(file) {
    if (modules.has(file)) return modules.get(file)

    const code = fs.readFileSync(file, 'utf8')
    const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' })
    const record = { id: modules.size, file, code, ast, deps: [] }
    // 先登记再递归：循环依赖（a → b → a）靠这一步终止
    modules.set(file, record)

    for (const node of ast.body) {
        if (!node.source) continue
        if (!/^(Import|Export)/.test(node.type)) continue
        record.deps.push({ spec: node.source.value, id: collect(resolveId(node.source.value, file)).id })
    }
    return record
}

// ---------- 3. 转换：ESM 语法 → CJS 的 require / exports ----------
function transform(record) {
    const s = new MagicString(record.code)
    const tail = [] // 需要追加到模块末尾的 exports 赋值

    for (const node of record.ast.body) {
        if (node.type === 'ImportDeclaration') {
            const id = record.deps.find((d) => d.spec === node.source.value).id
            s.overwrite(node.start, node.end, renderImport(node, id))
        } else if (node.type === 'ExportDefaultDeclaration') {
            s.overwrite(node.start, node.declaration.start, 'exports.default = ')
            s.appendLeft(node.end, ';')
        } else if (node.type === 'ExportNamedDeclaration' && node.declaration) {
            // export const a = 1  →  const a = 1（末尾再补 exports.a = a）
            s.overwrite(node.start, node.declaration.start, '')
            for (const name of declaredNames(node.declaration)) tail.push(`exports.${name} = ${name}`)
        } else if (node.type === 'ExportNamedDeclaration') {
            if (node.source) throw new Error(`暂不支持 export ... from（${rel(record.file)}）`)
            s.overwrite(node.start, node.end, '')
            for (const sp of node.specifiers) tail.push(`exports.${sp.exported.name} = ${sp.local.name}`)
        } else if (node.type === 'ExportAllDeclaration') {
            throw new Error(`暂不支持 export * from（${rel(record.file)}）`)
        }
    }

    if (tail.length) s.append('\n' + tail.join('\n'))
    return s.toString()
}

// import 的四种形式 → require 表达式
function renderImport(node, id) {
    const specs = node.specifiers
    if (specs.length === 0) return `__require(${id})` // 只为副作用

    const ns = specs.find((s) => s.type === 'ImportNamespaceSpecifier')
    if (ns) return `const ${ns.local.name} = __require(${id})`

    const def = specs.find((s) => s.type === 'ImportDefaultSpecifier')
    const named = specs
        .filter((s) => s.type === 'ImportSpecifier')
        .map((s) => (s.imported.name === s.local.name ? s.local.name : `${s.imported.name}: ${s.local.name}`))

    if (!def) return `const { ${named.join(', ')} } = __require(${id})`

    // default 与具名混用：先拿一份命名空间，再分别解构
    const tmp = `__m${id}`
    const parts = [`const ${tmp} = __require(${id})`, `const ${def.local.name} = ${tmp}.default`]
    if (named.length) parts.push(`const { ${named.join(', ')} } = ${tmp}`)
    return parts.join('; ')
}

// export const { a, b } = x 这种解构声明，要把每个名字都取出来
function declaredNames(decl) {
    if (decl.type === 'VariableDeclaration') return decl.declarations.flatMap((d) => patternNames(d.id))
    return [decl.id.name]
}

function patternNames(node) {
    if (node.type === 'Identifier') return [node.name]
    if (node.type === 'ObjectPattern') return node.properties.flatMap((p) => patternNames(p.value))
    if (node.type === 'ArrayPattern') return node.elements.filter(Boolean).flatMap(patternNames)
    return []
}

// ---------- 4. 生成：模块表 + 一个几十行的运行时 ----------
function generate(list) {
    const out = [
        '// 由 mini-bundler 生成（手写打包器，仅供理解原理，勿用于生产）',
        '(function (modules) {',
        '    const cache = {}',
        '    function __require(id) {',
        '        if (cache[id]) return cache[id].exports',
        '        const module = { exports: {} }',
        '        // 先入缓存再执行：循环依赖时对方才能拿到「未完成」的导出对象',
        '        cache[id] = module',
        '        modules[id](module, module.exports, __require)',
        '        return module.exports',
        '    }',
        '    __require(0)',
        '})({'
    ]
    for (const r of list) {
        out.push(`    // ${r.id}: ${rel(r.file)}`)
        out.push(`    ${r.id}: function (module, exports, __require) {`)
        out.push(r.output.split('\n').map((line) => (line ? '        ' + line : line)).join('\n'))
        out.push('    },')
    }
    out.push('})')
    return out.join('\n') + '\n'
}

// ---------- 主流程 ----------
collect(ENTRY)
const list = [...modules.values()]
for (const r of list) r.output = transform(r)

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true })
fs.writeFileSync(OUT_FILE, generate(list), 'utf8')

console.log('---- 1. 模块图（DFS 发现顺序，id 0 是入口）----')
for (const r of list) {
    console.log(`  ${String(r.id).padStart(2)}  ${rel(r.file).padEnd(28)} → 依赖 [${r.deps.map((d) => d.id).join(', ')}]`)
}
console.log(`  共 ${list.length} 个模块`)

console.log('\n---- 2. ESM → CJS 转换（取第一个含 import 的模块）----')
const sample = list.find((r) => /^import /m.test(r.code))
console.log(`  文件：${rel(sample.file)}`)
for (const line of sample.code.split('\n').filter((l) => /^(import|export)/.test(l))) {
    console.log('  - ' + line)
}
console.log('  =>')
for (const line of sample.output.split('\n').filter((l) => /__require\(|^exports\./.test(l))) {
    console.log('  + ' + line.trim())
}

const srcBytes = list.reduce((n, r) => n + Buffer.byteLength(r.code, 'utf8'), 0)
const outBytes = fs.statSync(OUT_FILE).size
console.log('\n---- 3. 产物 ----')
console.log(`  写出 ${rel(OUT_FILE)}：${outBytes} 字节`)
console.log(`  源码合计 ${srcBytes} 字节 → 产物是源码的 ${(outBytes / srcBytes).toFixed(2)} 倍（差额是运行时 + 包装）`)

// ---------- 5. 跑一遍：原生 ESM vs 打包产物 ----------
function run(file) {
    const r = spawnSync(process.execPath, [file], { encoding: 'utf8' })
    return { status: r.status, text: ((r.stdout || '') + (r.stderr || '')).trim() }
}

console.log('\n---- 4. 执行结果对照 ----')
const pairs = [
    [`原生 ESM：node ${rel(ENTRY)}`, run(ENTRY)],
    [`打包产物：node ${rel(OUT_FILE)}`, run(OUT_FILE)]
]
for (const [label, r] of pairs) {
    console.log(`  ${label}`)
    if (r.status === 0) {
        for (const line of r.text.split('\n')) console.log('    ' + line)
    } else {
        // 报错时只报关键那行：Node 的栈末尾是版本号，没有信息量
        const lines = r.text.split('\n').filter(Boolean)
        const reason = lines.find((l) => /^\w*Error\b/.test(l)) || lines[lines.length - 1]
        console.log(`    [退出码 ${r.status}] ${reason}`)
    }
}
if (ENTRY.includes('cycle')) {
    console.log('\n  同一个循环依赖，两种结果的差别就是「打包改变了模块语义」的证据')
}
