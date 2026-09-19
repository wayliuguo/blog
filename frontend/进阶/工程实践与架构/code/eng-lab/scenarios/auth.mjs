/**
 * 场景 B：RBAC 权限判定
 * 用同一份「菜单 + 按钮 + 字段」定义，跑三种角色的判定结果，
 * 并实测三件容易被忽略的事：
 *   1) 权限码通配（order:* 该不该覆盖 order:read）
 *   2) 父菜单因"子项全被剪"而消失
 *   3) 路由不可见时按钮必须一并不可见（前端权限的层级依赖）
 */
import { table, title, section } from '../harness/table.mjs'

// 权限码 = 资源:动作。后端在登录后下发"这个用户拥有哪些码"，前端不认识角色名
const GRANTS = {
    admin: ['*'],
    operator: ['order:read', 'order:write', 'order:refund', 'coupon:read', 'coupon:write', 'report:read'],
    viewer: ['order:read', 'report:read']
}

const MENU = [
    { title: '概览', path: '/dashboard' },
    {
        title: '交易',
        path: '/trade',
        perm: 'order:read',
        children: [
            { title: '订单列表', path: '/orders', perm: 'order:read' },
            { title: '订单详情', path: '/orders/:id', perm: 'order:read' },
            { title: '退款审批', path: '/orders/refund', perm: 'order:refund' }
        ]
    },
    {
        title: '营销',
        path: '/marketing',
        perm: 'coupon:read',
        children: [
            { title: '优惠券', path: '/coupons', perm: 'coupon:read' },
            { title: '券模板', path: '/coupons/edit', perm: 'coupon:write' }
        ]
    },
    {
        title: '数据',
        path: '/data',
        perm: 'report:read',
        children: [
            { title: '经营报表', path: '/reports', perm: 'report:read' },
            { title: '成本分析', path: '/reports/cost', perm: 'report:cost' }
        ]
    },
    {
        title: '系统',
        path: '/system',
        perm: 'user:manage',
        children: [
            { title: '用户管理', path: '/users', perm: 'user:manage' },
            { title: '系统设置', path: '/settings', perm: 'system:manage' }
        ]
    }
]

const BUTTONS = [
    ['/orders', 'order:write', '新建订单'],
    ['/orders', 'order:export', '导出'],
    ['/orders', 'order:bulk', '批量操作'],
    ['/orders/:id', 'order:cancel', '取消订单'],
    ['/orders/refund', 'order:refund', '审批通过'],
    ['/coupons', 'coupon:write', '新建券'],
    ['/coupons', 'coupon:disable', '停用券'],
    ['/reports', 'report:export', '导出报表'],
    ['/reports/cost', 'report:cost', '查看成本'],
    ['/users', 'user:manage', '编辑用户'],
    ['/users', 'user:resetPwd', '重置密码'],
    ['/settings', 'system:manage', '保存设置']
]

// 字段级：public 之外都要求权限码；mask 表示"有权限也脱敏"
const FIELDS = [
    { key: 'id', label: '订单号', perm: null },
    { key: 'amount', label: '金额', perm: null },
    { key: 'phone', label: '手机号', perm: null, mask: 'phone' },
    { key: 'cost', label: '成本', perm: 'report:cost' },
    { key: 'storeNo', label: '门店', perm: 'store:all' }
]

const SAMPLE = { id: 'A20260919', amount: 12800, phone: '13812345678', cost: 8600, storeNo: 'S-021' }

/** 单个权限码是否被授予集合覆盖：支持 * 与 resource:* 两种通配 */
export function can(granted, needed) {
    if (!needed) return true
    return granted.some((g) => {
        if (g === '*') return true
        if (g.endsWith(':*')) return needed.startsWith(g.slice(0, -1))
        return g === needed
    })
}

/** 菜单过滤：叶子先过滤，父节点因"子项全被剪"而一起消失 */
function filterMenu(nodes, granted) {
    const out = []
    for (const node of nodes) {
        if (!can(granted, node.perm)) continue
        if (!node.children) {
            out.push({ ...node })
            continue
        }
        const kids = filterMenu(node.children, granted)
        if (kids.length === 0) continue // 父节点有权限、但没有任何可见子项 → 整枝剪掉
        out.push({ ...node, children: kids })
    }
    return out
}

const leafPaths = (nodes, out = []) => {
    for (const n of nodes) {
        if (n.children) leafPaths(n.children, out)
        else out.push(n.path)
    }
    return out
}

function renderTree(nodes, depth = 0) {
    return nodes
        .map((n) => {
            const line = '  '.repeat(depth) + (depth ? '└─ ' : '') + n.title + '  ' + n.path
            return n.children ? line + '\n' + renderTree(n.children, depth + 1) : line
        })
        .join('\n')
}

export default async function run() {
    const roles = Object.keys(GRANTS)
    console.log(title('权限模型'))
    console.log('权限码 = 资源:动作，由后端下发；前端只在菜单/路由/按钮/字段四处判定，不认识角色名。')
    console.log(
        table(
            ['角色', '持有权限码', '码数量'],
            roles.map((r) => [r, GRANTS[r].join(', '), GRANTS[r].length])
        )
    )

    console.log(section('通配符匹配的边界（实测 can() 的判定结果）'))
    const probes = [
        ['admin', 'order:read'],
        ['admin', 'system:manage'],
        ['operator', 'order:write'],
        ['operator', 'order:bulk'],
        ['operator', 'report:cost'],
        ['viewer', 'order:write'],
        ['viewer', 'order:read']
    ]
    console.log(
        table(
            ['角色', '校验的权限码', '判定'],
            probes.map(([r, p]) => [r, p, can(GRANTS[r], p) ? '通过' : '拦截'])
        )
    )
    console.log('注意 operator 对 order:bulk 是拦截的 —— 它持有 order:read/write/refund 三个具体码，')
    console.log('但没有 order:* 通配，所以"权限码写具体值"会漏掉新增的动作码。反过来，')
    console.log('admin 的 * 能过任何校验，代价是这类账号一旦泄露就没有边界。')

    console.log(section('菜单树：按角色过滤后的实际结果'))
    for (const role of roles) {
        const tree = filterMenu(MENU, GRANTS[role])
        const paths = leafPaths(tree)
        console.log(`\n[${role}] 可见叶子 ${paths.length} / ${leafPaths(MENU).length}`)
        console.log(renderTree(tree))
    }
    const operatorTree = filterMenu(MENU, GRANTS.operator)
    const operatorPaths = leafPaths(operatorTree)
    console.log('\n实测到的三点：')
    console.log(
        `- operator 的「数据」组从 ${MENU.find((n) => n.title === '数据').children.length} 个子项掉到 ` +
            `${operatorTree.find((n) => n.title === '数据').children.length} 个：有 report:read 的「经营报表」留下，` +
            '需要 report:cost 的「成本分析」被剪掉，父节点因为还有可见子项而保留'
    )
    console.log(
        '- viewer 的「系统」「营销」两组整枝消失：父节点权限不足时直接剪掉，不在子项上再逐个判断'
    )
    console.log(`- operator 可见路径：${operatorPaths.join('、')}`)

    console.log(section('按钮级判定：路由不可见时按钮必须一并不可见'))
    const visible = {}
    for (const role of roles) visible[role] = new Set(leafPaths(filterMenu(MENU, GRANTS[role])))
    console.log(
        table(
            ['所在路由', '按钮', '权限码', ...roles],
            BUTTONS.map(([route, code, label]) => [
                route,
                label,
                code,
                ...roles.map((role) => {
                    if (!visible[role].has(route)) return '路由不可见'
                    return can(GRANTS[role], code) ? '显示' : '隐藏'
                })
            ])
        )
    )
    const routeBlind = BUTTONS.filter(([route]) => !visible.viewer.has(route) || !visible.operator.has(route))
    console.log(`\n共 ${BUTTONS.length} 个按钮，其中 ${routeBlind.length} 个会因为"所在路由本身就进不去"而被前置拦住，`)
    console.log('这就是为什么按钮级权限不能只看权限码：路由层才是第一道闸。')

    console.log(section('字段级：同一份数据，三种角色看到的形态'))
    console.log(
        table(
            ['字段', '要求权限', ...roles],
            FIELDS.map((f) => [
                f.label,
                f.perm || '—',
                ...roles.map((role) => {
                    if (!can(GRANTS[role], f.perm)) return '不下发'
                    const raw = String(SAMPLE[f.key])
                    if (f.mask === 'phone') return raw.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
                    return raw
                })
            ])
        )
    )
    console.log('关键推论：脱敏是"下发前的服务端行为"，不是"前端拿到明文再遮起来"——')
    console.log('前者抓包也拿不到，后者只是视觉处理。前端字段判定只用于决定"要不要渲染这一列"。')

    console.log(section('读法'))
    console.log('- 前端权限只做体验收敛，真正的边界在后端接口鉴权：前端拦住的是菜单，不是数据')
    console.log('- 权限码集中定义并生成常量，视图里只写常量，避免散落的字符串拼错后静默失效')
    console.log('- 权限变更后要能让菜单重新派生：把权限集合放进响应式 store，路由表由它计算而来')
}
