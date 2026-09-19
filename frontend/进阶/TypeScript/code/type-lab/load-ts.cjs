/**
 * 共用：定位 typescript 编译器
 *
 * 本 lab 不自带依赖，从 code 目录逐级向上找 node_modules/typescript（仓库根已装）。
 * 找不到时给出明确的安装提示，而不是抛一堆 require 栈。
 */
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
    throw new Error(
        '未找到 typescript。请在仓库根目录执行：npm i -D typescript（或 npm i typescript@5）'
    )
}

module.exports = { loadTypeScript }
