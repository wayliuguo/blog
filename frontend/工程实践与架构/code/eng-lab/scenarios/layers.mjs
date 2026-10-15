/**
 * 场景 A：依赖分层扫描
 * 拿 fixtures/shop 这个示例业务目录，静态解析 import，算出
 *   1) 层与层之间的依赖矩阵   2) 违反分层规约的边   3) 改动的影响面
 * 全部是"读文件 + 算图"，没有 DOM，所以能直接当 CLI 跑。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { table, title, section } from '../harness/table.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SHOP = path.join(HERE, '..', 'fixtures', 'shop')

// 层级：数字越小越底层。规约是"上层可以依赖下层，下层不能回头依赖上层"
const LAYERS = ['shared', 'utils', 'api', 'store', 'hooks', 'views']

// 视图层不允许直连的能力层：发请求、写存储都要走 api，视图只认业务函数
const VIEW_FORBIDDEN = ['utils/http.js', 'utils/storage.js']

/** 递归收集 .js 文件，返回相对 shop 的 posix 路径 */
function collect(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) collect(full, out)
        else if (entry.name.endsWith('.js')) out.push(path.relative(SHOP, full).split(path.sep).join('/'))
    }
    return out.sort()
}

/** 从源码里抠出所有 import 的目标，把相对路径解析成相对 shop 的路径 */
function importsOf(file) {
    const src = fs.readFileSync(path.join(SHOP, file), 'utf8')
    const re = /import\s+(?:[\s\S]*?)\s*from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]/g
    const out = []
    let m
    while ((m = re.exec(src))) {
        const spec = m[1] || m[2]
        if (!spec || !spec.startsWith('.')) continue // 只分析项目内部依赖
        out.push(path.posix.normalize(path.posix.join(path.posix.dirname(file), spec)))
    }
    return out
}

const layerOf = file => file.split('/')[0]
const domainOf = file => {
    const parts = file.split('/')
    return parts[0] === 'views' && parts.length > 2 ? parts[1] : null
}

export default async function run() {
    const files = collect(SHOP)
    const edges = []
    for (const f of files) for (const t of importsOf(f)) edges.push([f, t])

    console.log(title('扫描范围'))
    console.log(`示例目录：fixtures/shop（${files.length} 个文件、${edges.length} 条内部 import）`)
    console.log('规约：上层可依赖下层，下层不得回头依赖上层；视图只通过 api 拿数据；')
    console.log('      领域之间不互相引用内部文件；文件之间不允许成环。')

    // —— 1. 依赖矩阵
    const matrix = {}
    for (const [f, t] of edges) {
        const a = layerOf(f)
        const b = layerOf(t)
        matrix[a] = matrix[a] || {}
        matrix[a][b] = (matrix[a][b] || 0) + 1
    }
    console.log(section('层间依赖矩阵（行 = 引用方，列 = 被引用方，数字 = import 条数）'))
    console.log(
        table(
            ['from \\ to', ...LAYERS, '出度'],
            LAYERS.map(a => {
                const row = LAYERS.map(b => matrix[a]?.[b] ?? '')
                const sum = LAYERS.reduce((n, b) => n + (matrix[a]?.[b] ?? 0), 0)
                return [a, ...row, sum]
            })
        )
    )
    const up = LAYERS.flatMap(a =>
        LAYERS.filter(b => LAYERS.indexOf(b) > LAYERS.indexOf(a)).map(b => [a, b, matrix[a]?.[b] ?? 0])
    ).filter(r => r[2] > 0)
    console.log(
        '\n右上角应当全空——那里是"下层引用上层"。实际非空的位置：' +
            (up.length ? up.map(([a, b, n]) => `${a}→${b}(${n})`).join('、') : '无')
    )

    // —— 2. 违规扫描
    const violations = []
    for (const [f, t] of edges) {
        const fromLayer = layerOf(f)
        const toLayer = layerOf(t)
        if (LAYERS.indexOf(toLayer) > LAYERS.indexOf(fromLayer)) {
            violations.push(['反向依赖', f, t, `${toLayer} 是下层，不该被 ${fromLayer} 引用`])
        }
        if (fromLayer === 'views' && VIEW_FORBIDDEN.includes(t)) {
            violations.push(['绕过接口层', f, t, '视图直接发请求/写存储，契约变更会漏改'])
        }
        const fa = domainOf(f)
        const fb = domainOf(t)
        if (fa && fb && fa !== fb) {
            violations.push(['跨领域引用', f, t, `${fa} 直接引用了 ${fb} 的内部文件`])
        }
    }

    // 文件级环：DFS 三色标记，把同一条环上的文件串起来
    const graph = {}
    for (const [f, t] of edges) (graph[f] = graph[f] || []).push(t)
    const color = {}
    const stack = []
    const cycles = []
    const seenCycle = new Set()
    function dfs(node, chain) {
        color[node] = 1
        chain.push(node)
        for (const next of graph[node] || []) {
            if (color[next] === 1) {
                const cycle = chain.slice(chain.indexOf(next)).concat(next)
                const key = [...cycle].sort().join('|')
                if (!seenCycle.has(key)) {
                    seenCycle.add(key)
                    cycles.push(cycle)
                }
            } else if (color[next] === undefined) {
                dfs(next, chain)
            }
        }
        chain.pop()
        color[node] = 2
    }
    for (const f of files) if (color[f] === undefined) dfs(f, [])
    for (const c of cycles) {
        violations.push(['循环依赖', c[0], c[1], `${c.length - 1} 个文件成环：${c.join(' → ')}`])
    }

    console.log(section(`违规清单（共 ${violations.length} 条，按规则分类）`))
    console.log(table(['规则', '位置', '指向', '判定'], violations))
    console.log(
        section('四条规则的判定依据') +
            '\n- 反向依赖：层的序号倒挂。工具层认识"当前登录用户"，意味着它再也不能被别处复用'
    )
    console.log('- 绕过接口层：视图里有 fetch 细节。后端契约一变，改的不是一处 api 而是每处视图')
    console.log('- 跨领域引用：两个领域互相知道对方内部结构，任一领域重构都会波及另一个')
    console.log('- 循环依赖：模块系统能跑，但初始化顺序不确定，被环包住的模块无法单独测试')

    // —— 3. 影响面
    const fanIn = {}
    for (const [f, t] of edges) (fanIn[t] = fanIn[t] || new Set()).add(f)
    const top = Object.entries(fanIn)
        .map(([f, set]) => [f, set.size])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    console.log(section('被依赖最多的文件（直接扇入）'))
    console.log(
        table(
            ['文件', '直接被引用', '所在层'],
            top.map(([f, n]) => [f, n, layerOf(f)])
        )
    )

    /** 传递闭包：改了这个文件，哪些文件会受影响 */
    function affected(target) {
        const reverse = {}
        for (const [f, t] of edges) (reverse[t] = reverse[t] || []).push(f)
        const seen = new Set()
        const queue = [target]
        while (queue.length) {
            const cur = queue.shift()
            for (const up of reverse[cur] || []) {
                if (seen.has(up)) continue
                seen.add(up)
                queue.push(up)
            }
        }
        return [...seen].sort()
    }

    console.log(section('影响面：改动一个文件会波及多少文件'))
    console.log(
        table(
            ['改动的文件', '直接引用', '传递波及', '占全量'],
            ['shared/constants.js', 'shared/format.js', 'utils/http.js', 'hooks/useToast.js'].map(f => {
                const list = affected(f)
                return [
                    f,
                    (fanIn[f] || new Set()).size,
                    list.length,
                    `${Math.round((list.length / files.length) * 100)}%`
                ]
            })
        )
    )
    const leaf = affected('shared/format.js')
    console.log(`\n改动 shared/format.js 波及的 ${leaf.length} 个文件：\n  ` + leaf.join('\n  '))
    console.log('\n读法：越靠下的层扇入越大、影响面越广 —— shared/constants.js 一改波及 16 个文件，')
    console.log('      所以底层改动必须有测试兜底；而 hooks/useToast.js 自己不依赖任何项目文件，')
    console.log('      波及面也最小，这类"叶子模块"才是能放手重构的。')
}
