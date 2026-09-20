// 一个 CommonJS 模块：Rollup 眼里这就是"给一个叫 module 的变量赋值"
function greet(name) {
    return 'hi ' + name
}

module.exports = { greet }
