/**
 * 把 demos/ 下的 WXML / WXSS 跑一遍，产出结构化结果
 * —— `npm run render` 的终端输出与 `npm start` 的预览页共用这一份结果，避免两处逻辑走偏。
 *
 * 这些规则真机上由微信的 WXML / WXSS 编译器实现，本机的 Node 只是把同一套规则跑出来，
 * 让「写法 → 产物」可对照、可复现。
 */
const fs = require('fs')
const path = require('path')
const { compile } = require('./wxml')
const wxss = require('./wxss')

const DEMOS = path.join(__dirname, '..', 'demos')

const read = name => fs.readFileSync(path.join(DEMOS, name), 'utf8')
const load = name => require(path.join(DEMOS, name))
const attempt = fn => {
    try {
        return { output: fn(), error: null }
    } catch (e) {
        return { output: null, error: `${e.name}: ${e.message}` }
    }
}

/** 编译一次，返回 { source, output, warnings, error } */
function caseOf(wxml, data) {
    const source = read(wxml)
    const result = attempt(() => compile(read(wxml), data))
    return {
        label: null,
        source,
        output: result.output ? result.output.html : null,
        warnings: result.output ? result.output.warnings : [],
        error: result.error
    }
}

const RPX_VALUES = [690, 28, 16, 2]
const RPX_WIDTH = 375

function run() {
    return [
        {
            id: 'list',
            title: 'wx:for / wx:key / {{ }} 表达式 / wx:if + wx:else',
            files: ['demos/list.wxml', 'demos/list.js', 'demos/list.wxss'],
            cases: [caseOf('list.wxml', load('list.js'))]
        },
        {
            id: 'cond',
            title: 'hidden 与 wx:if / wx:elif / wx:else：同一份模板换三组数据',
            files: ['demos/cond.wxml', 'demos/cond.js'],
            cases: [
                { label: 'visible=true, loading=false', data: { visible: true, loading: false } },
                { label: 'visible=false, loading=true', data: { visible: false, loading: true } },
                { label: 'visible=false, loading=false', data: { visible: false, loading: false } }
            ].map(c => Object.assign(caseOf('cond.wxml', c.data), { label: c.label }))
        },
        {
            id: 'nokey',
            title: 'wx:for 没写 wx:key：编译期警告',
            files: ['demos/nokey.wxml', 'demos/nokey.js'],
            cases: [caseOf('nokey.wxml', load('nokey.js'))]
        },
        {
            id: 'bad-key',
            title: 'wx:key 用错了：基本类型数组该写 *this',
            files: ['demos/bad-key.wxml', 'demos/bad-key.js'],
            cases: [caseOf('bad-key.wxml', load('bad-key.js'))]
        },
        {
            id: 'bad-expr',
            title: '把语句写进 {{ }}：编译期报错',
            files: ['demos/bad-expr.wxml', 'demos/bad-expr.js'],
            cases: [caseOf('bad-expr.wxml', load('bad-expr.js'))]
        },
        {
            id: 'bad-for',
            title: 'wx:for 的值不是数组：编译期报错',
            files: ['demos/bad-for.wxml', 'demos/bad-for.js'],
            cases: [caseOf('bad-for.wxml', load('bad-for.js'))]
        },
        {
            id: 'rpx',
            title: 'rpx → px：750rpx 恒等于屏幕宽度',
            files: ['demos/rpx.wxss'],
            table: Object.assign(wxss.table(RPX_VALUES), {
                converted: wxss.convertRpx(read('rpx.wxss'), RPX_WIDTH),
                width: RPX_WIDTH
            }),
            cases: []
        },
        {
            id: 'selector',
            title: '选择器是否在 WXSS 支持清单内',
            files: ['demos/rpx.wxss'],
            selectors: wxss.checkSelectors(read('rpx.wxss')),
            cases: []
        }
    ]
}

module.exports = { run }
