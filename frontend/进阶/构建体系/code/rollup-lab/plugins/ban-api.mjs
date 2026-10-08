// 手写"禁用 API"门禁插件：把团队约定变成构建期的报错，而不是 CR 时的人肉提醒
//
// 规则写成数据、判定走 AST —— 正则能扫到关键字，但扫不到"这是调用还是字符串字面量"
import { parse } from 'acorn'

// 命中条件 + 提示文案；新增一条禁用项只加一个对象，不用改遍历逻辑
const RULES = [
    {
        id: 'no-direct-storage',
        test: callee => callee.object?.name === 'localStorage',
        msg: '禁止直连 localStorage：请用统一的 storage 封装（它有容量兜底与隐私模式降级）'
    },
    {
        id: 'no-console',
        test: callee => callee.object?.name === 'console' && callee.property?.name === 'log',
        msg: '生产构建不允许 console.log：请用 logger（线上可关）'
    }
]

// 极简 AST 遍历：够用就好，真实项目直接用 acorn-walk / @babel/traverse
function walk(node, visit) {
    if (!node || typeof node.type !== 'string') return
    visit(node)
    for (const key of Object.keys(node)) {
        if (key === 'loc' || key === 'start' || key === 'end') continue
        const value = node[key]
        if (Array.isArray(value)) for (const child of value) walk(child, visit)
        else if (value && typeof value.type === 'string') walk(value, visit)
    }
}

export default function banApi({ rules = RULES, fail = false } = {}) {
    return {
        name: 'ban-api',

        transform(code, id) {
            if (!id.endsWith('.js')) return null
            const ast = parse(code, { ecmaVersion: 'latest', sourceType: 'module', locations: true })
            const hits = []

            walk(ast, node => {
                if (node.type !== 'CallExpression') return
                const callee = node.callee
                if (callee.type !== 'MemberExpression') return
                for (const rule of rules) {
                    if (!rule.test(callee)) continue
                    hits.push({
                        rule: rule.id,
                        line: node.loc.start.line,
                        column: node.loc.start.column,
                        msg: rule.msg
                    })
                }
            })

            for (const h of hits) {
                const at = `${id.split(/[/\\]/).pop()}:${h.line}:${h.column}`
                // this.warn 只提示、this.error 直接中断：同一个插件换个开关就是"报告"或"门禁"
                if (fail) this.error(`[${h.rule}] ${at} ${h.msg}`)
                this.warn(`[${h.rule}] ${at} ${h.msg}`)
            }
            return null
        }
    }
}
