// 编译与 AST：改写 AST 再生成代码 —— 编译器的三个阶段（parse → transform → generate）
// 运行：npm run ast
const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default
const t = require('@babel/types')
const generate = require('@babel/generator').default

const code = `
function log(msg) {
  console.log('[app]', msg)
}
const n = 1
`

const ast = parser.parse(code, { sourceType: 'module' })

// transform：把所有 console.log(...) 的调用换成 void 0（模拟"生产环境去掉日志"）
let hit = 0
traverse(ast, {
    CallExpression(path) {
        const callee = path.node.callee
        const isConsoleLog =
            t.isMemberExpression(callee) &&
            t.isIdentifier(callee.object, { name: 'console' }) &&
            t.isIdentifier(callee.property, { name: 'log' })
        if (!isConsoleLog) return
        hit += 1
        path.replaceWith(t.unaryExpression('void', t.numericLiteral(0)))
    }
})

console.log('---- 命中 console.log 次数 ----')
console.log(hit)

console.log('\n---- 生成后的代码 ----')
console.log(generate(ast, { retainLines: false }).code)

console.log('\n---- 只改不生成：AST 变化不会自动回到源码 ----')
console.log('改 AST 之后是否必须 generate：', '是，AST 与源码文本是两份数据')

// 再演示一次 transform：给每个函数体第一行插入一条语句
const ast2 = parser.parse('function f() {\n  return 1\n}', { sourceType: 'module' })
traverse(ast2, {
    FunctionDeclaration(path) {
        path.get('body').unshiftContainer('body', t.expressionStatement(t.stringLiteral('entered f')))
    }
})
console.log('\n---- 插入语句后 ----')
console.log(generate(ast2).code)
