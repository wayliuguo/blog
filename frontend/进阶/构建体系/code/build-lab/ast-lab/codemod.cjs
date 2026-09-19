// 编译与 AST：codemod —— 用脚本批量改代码（大仓库重构的正确姿势）
// 运行：npm run ast:codemod
const fs = require('node:fs')
const path = require('node:path')
const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default
const t = require('@babel/types')
const generate = require('@babel/generator').default

const SAMPLE = `
import React from 'react'
const a = React.createElement('div', null, 'hi')
const b = React.createElement('span', { id: 'x' })
`

// 目标：React.createElement(...) -> jsx 之外我们做个更朴素的替换：
// 把 React.createElement 换成 h（很多库的 codemod 就是这种形态）
function transform(src) {
    const ast = parser.parse(src, {
        sourceType: 'module',
        plugins: ['jsx']
    })
    let count = 0
    traverse(ast, {
        MemberExpression(p) {
            const node = p.node
            if (t.isIdentifier(node.object, { name: 'React' }) && t.isIdentifier(node.property, { name: 'createElement' })) {
                count += 1
                p.replaceWith(t.identifier('h'))
            }
        }
    })
    const output = generate(ast, { jsescOption: { minimal: true } }).code
    return { output, count }
}

const { output, count } = transform(SAMPLE)

console.log('---- 改写前 ----')
console.log(SAMPLE.trim())
console.log('\n---- 改写后 ----')
console.log(output)
console.log('\n替换处数:', count)

console.log('\n---- 为什么 codemod 不能靠正则 ----')
const tricky = "const s = 'React.createElement(\"div\")'  // 字符串里长得一模一样"
const re = /React\.createElement/g
console.log('正则替换会误伤字符串:', tricky.replace(re, 'h'))
const { output: safe } = transform(tricky)
console.log('AST 替换不动字符串:', safe)
