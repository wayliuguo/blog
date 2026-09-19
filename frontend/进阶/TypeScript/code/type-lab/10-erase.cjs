/**
 * 类型只存在于编译期：把 11-erase-demo.ts 编译成 JS，看类型信息去哪了
 *
 * 运行：npm run erase
 */
const fs = require('fs')
const path = require('path')
const { loadTypeScript } = require('./load-ts.cjs')
const { ts, version } = loadTypeScript()

const input = path.join(__dirname, '11-erase-demo.ts')
const source = fs.readFileSync(input, 'utf8')

console.log(`---- 输入（${path.basename(input)}） ----`)
console.log(source.trim())

const output = ts.transpileModule(source, {
    compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS
    }
})

console.log('---- 编译产物 ----')
console.log(output.outputText.trim())

const left = ['interface User', ': User', ': string', ': Color'].filter((s) =>
    output.outputText.includes(s)
)
console.log(`---- 结论（typescript ${version}） ----`)
console.log('类型注解与 interface 是否出现在产物里：', left.length === 0 ? '否，已被擦除' : '是')
console.log(
    'enum 是否留下运行时代码：',
    output.outputText.includes('Color') ? '是（enum 是少数会生成对象的类型语法）' : '否'
)
