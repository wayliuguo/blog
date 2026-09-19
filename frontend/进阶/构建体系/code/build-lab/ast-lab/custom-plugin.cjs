// 编译与 AST：手写一个 Babel 插件（把目标函数调用替换成另一个）
// 运行：npm run ast:plugin
const babel = require('@babel/core')

// 一个真实可用的插件：把 __DEV__ 常量在编译期替换成布尔字面量
// 效果：死代码在压缩阶段被摇掉，无需运行时判断
function replaceDevFlag({ types: t }) {
    return {
        name: 'replace-dev-flag',
        visitor: {
            Identifier(path, state) {
                if (path.node.name !== '__DEV__') return
                // 不替换"被赋值的位置"（a.__DEV__ = 1 这种属性名不处理）
                if (path.parentPath.isMemberExpression() && path.parentPath.node.property === path.node) return
                const value = Boolean(state.opts.value)
                path.replaceWith(t.booleanLiteral(value))
            }
        }
    }
}

const code = `
if (__DEV__) {
  console.log('debug info')
} else {
  console.log('prod')
}
`

for (const dev of [true, false]) {
    const out = babel.transformSync(code, {
        configFile: false,
        babelrc: false,
        plugins: [[replaceDevFlag, { value: dev }]]
    })
    console.log(`---- __DEV__ = ${dev} ----`)
    console.log(out.code.trim())
    console.log()
}

console.log('---- 插件与 preset 的执行顺序 ----')
const out = babel.transformSync('const a = [1, 2].map((x) => x ** 2)', {
    configFile: false,
    babelrc: false,
    // plugins 在 presets 之前跑；plugins 按书写顺序，presets 按逆序
    plugins: [
        function first() {
            return { name: 'first', visitor: {} }
        }
    ],
    presets: [require('@babel/preset-env')]
})
console.log(out.code.trim())
