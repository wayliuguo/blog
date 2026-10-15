'use strict'

const { rel } = require('./root.cjs')

// ---------- 4. 生成：模块表 + 一个几十行的运行时 ----------

/**
 * 把全部模块拼装成一个自执行函数：一个模块表 + 一个精简的 __require 运行时。
 *
 * 每个模块被包进 `function (module, exports, __require)`，天然获得独立作用域；
 * 运行时最关键的几行是 cache 的写入时机（见下方生成代码里的注释）。
 *
 * @param {Array<{id:number, file:string, output:string}>} list - 全部模块，按 id 顺序排列
 * @returns {string} 最终产物代码文本（可直接用 node 运行）
 */
function generate(list) {
    const out = [
        '// 由 mini-bundler 生成（手写打包器，仅供理解原理，勿用于生产）',
        '(function (modules) {',
        '    const cache = {}                 // 已执行模块的导出缓存（保证每个模块只跑一次）',
        '    function __require(id) {',
        '        if (cache[id]) return cache[id].exports',
        '        const module = { exports: {} }',
        '        // 先入缓存再执行：循环依赖时对方才能拿到「未完成」的导出对象',
        '        cache[id] = module',
        '        modules[id](module, module.exports, __require)',
        '        return module.exports',
        '    }',
        '    __require(0)                     // 从入口（id 0，第一个被 collect 的模块）开始执行',
        '})({'
    ]
    for (const r of list) {
        out.push(`    // ${r.id}: ${rel(r.file)}`)
        out.push(`    ${r.id}: function (module, exports, __require) {`)
        out.push(
            r.output
                .split('\n')
                .map(line => (line ? '        ' + line : line))
                .join('\n')
        )
        out.push('    },')
    }
    out.push('})')
    return out.join('\n') + '\n'
}

module.exports = { generate }
