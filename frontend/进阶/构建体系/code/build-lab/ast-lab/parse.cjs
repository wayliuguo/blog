// 编译与 AST：把一段源码解析成 AST，看清"节点"长什么样
// 运行：npm run ast
const { parse } = require('@babel/parser')

const code = `
const x = 1
function add(a, b = 2) {
  return a + b + x
}
export default add
`

const ast = parse(code, { sourceType: 'module' })

console.log('---- 程序结构 ----')
console.log('根节点类型:', ast.program.body.length ? ast.program.body.map(n => n.type).join(', ') : '(空)')

console.log('\n---- 第一个语句的节点（去掉 loc 后）----')
const first = ast.program.body[0]
console.log(JSON.stringify(first, (k, v) => (k === 'loc' || k === 'start' || k === 'end' ? undefined : v), 2))

console.log('\n---- 遍历：收集所有 Identifier ----')
const names = []
const walk = node => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) return node.forEach(walk)
    if (node.type === 'Identifier' && !names.includes(node.name)) names.push(node.name)
    for (const key of Object.keys(node)) {
        if (key === 'loc') continue
        walk(node[key])
    }
}
walk(ast)
console.log(names.join(', '))

console.log('\n---- 语法版本差异：同样一段代码，不同 ecmaVersion 下的结果 ----')
const legacy = 'const f = (a = 1) => a ?? 0'
try {
    const a2 = parse(legacy, { sourceType: 'module', ecmaVersion: 2020 })
    console.log('ecmaVersion 2020:', a2.program.body[0].type, '解析成功')
} catch (e) {
    console.log('ecmaVersion 2020 失败:', e.message)
}
