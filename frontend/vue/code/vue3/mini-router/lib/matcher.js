// ============================================================
// mini-router/matcher —— 路由匹配器：路径 → matched 组件链 + params/query
// 对应真实包：vue-router 的 matcher（源码 packages/vue-router/src/matcher/index.ts 的
// createRouterMatcher + pathParser）
// 依赖：shared.js（normalize / joinPaths / parseQuery / objectToQuery）；被 router.js 依赖
// 覆盖机制（对应《Vue Router 原理》二、matcher）：
//   compilePath 动态段编译（:id → 捕获组正则 + 参数名表）、
//   insert 嵌套路由扁平化（matched 链成形，子路由 = 父链 + 自身）、
//   resolve 精确表优先 / 正则回退 + params / query 解析、
//   addRoute 运行时追加（权限路由的底层机制）
// ★ 建议断点：compilePath（看 :id 怎么变正则）、insert（看 matched 链怎么一层层长出来）、
//   resolve（看精确表未命中后怎么逐条跑正则把捕获组填进 params）
// ============================================================

/**
 * 把路由路径里的动态段编译成正则与参数名表。
 * 过程：用正则逐个把 '/:xxx' 段替换成捕获组 '/([^/]+)'，同时把参数名按出现顺序
 * 收进 keys；最后包上 ^...$ 并允许一个可选的尾斜杠。
 * 不支持重复参数、通配符（/:pathMatch(.*)*）与可选段（教学省略）。
 * @param {string} path 路由配置里的路径，可含动态段，如 '/user/:id'
 * @returns {{ regex: RegExp, keys: string[] }} 匹配正则与参数名表（顺序与捕获组一一对应）
 * @example compilePath('/user/:id') → { regex: /^\/user\/([^/]+)\/?$/, keys: ['id'] }
 * @example compilePath('/')         → { regex: /^\/\/?$/, keys: [] }
 */
function compilePath(path) {
    // '/user/:id' → { regex: /^\/user\/([^/]+)\/?$/, keys: ['id'] }
    // 不支持重复参数、通配符与可选段（见 README 省略清单）
    const keys = []
    // /\/:([^/]+)/ 逐个匹配「斜杠 + 冒号参数名」，捕获组 1 是参数名本身
    const pattern = path.replace(/\/:([^/]+)/g, (_, key) => {
        keys.push(key)
        // 替换成捕获组：一个动态段 = 一段不以 / 开头的字符
        return '/([^/]+)'
    })
    return { regex: new RegExp(`^${pattern}\\/?$`), keys }
}

/**
 * 创建路由匹配器：把嵌套的 routes 配置扁平化成 path → record 的 Map，并提供解析入口。
 * 过程：先 insert 一遍建表；resolve 先查精确表、未命中再逐条跑正则回退；
 * addRoute 支持运行时往表里追加（权限路由按角色「补登记」）。
 * @param {Array<{ path: string, name?: string, component: *, meta?: object, beforeEnter?: Function, children?: Array }>} routes 嵌套路由配置表
 * @returns {{ resolve: Function, addRoute: Function, getPaths: Function }} 匹配器接口（getPaths 返回全部已登记路径）
 * @example createRouterMatcher([{ path: '/user/:id', component: User }]).resolve('/user/42')
 *          → { path: '/user/42', params: { id: '42' }, name: undefined, matched: [userRecord] }
 */
function createRouterMatcher(routes) {
    const records = new Map() // path → record

    /**
     * 递归扁平化：把任意深度的 routeList 登记进 records，同时给每条 record 挂上
     * matched 链（祖先 record + 自身）——嵌套 RouterView 按 depth 取组件就靠它。
     * @param {Array} routeList 当前层的路由配置（顶层传 routes，子层传 route.children）
     * @param {string} [parentPath=''] 父级的完整路径，顶层为空串
     * @param {Array} [parentMatched=[]] 父级的 matched 链，顶层为空数组
     * @returns {void}
     * @example insert([{ path: '/settings', children: [{ path: 'notifications' }] }])
     *          → records 里出现 '/settings'（matched = [settings]）与 '/settings/notifications'（matched = [settings, notifications]）
     */
    function insert(routeList, parentPath = '', parentMatched = []) {
        for (const route of routeList) {
            const path = joinPaths(parentPath, route.path)
            const { regex, keys } = compilePath(path)
            const record = {
                path,
                regex,
                keys,
                component: route.component,
                name: route.name,
                meta: route.meta || {},
                beforeEnter: route.beforeEnter,
                matched: [...parentMatched, null] // 占位，下一行补上自身
            }
            record.matched[record.matched.length - 1] = record
            records.set(path, record)
            if (route.children?.length) insert(route.children, path, record.matched)
        }
    }
    insert(routes)

    /**
     * 解析：任意形式的「目标地址」→ 完整路由对象（含 params / query / matched 链）。
     * 过程：拆出裸路径与查询串 → 先查精确表（静态路由一步命中）→ 未命中再逐条跑
     * 正则，把捕获组按 keys 顺序 decodeURIComponent 后填进 params。
     * @param {string|{ path: string, query?: object }} to 地址字符串（可带 ?query）或 { path, query } 对象
     * @returns {{ path: string, fullPath: string, params: Object<string, string>, query: Object<string, string>, name: (string|undefined), meta: object, matched: Array }}
     *   完整路由对象；未匹配任何 record 时 matched 为空数组（RouterView 渲染为空）
     * @example resolve('/user/42?tab=posts') → { path: '/user/42', fullPath: '/user/42?tab=posts', params: { id: '42' }, query: { tab: 'posts' }, name: 'user', matched: [userRecord] }
     * @example resolve('/nope') → { matched: [], ... }（空链）
     */
    function resolve(to) {
        // to 可以是「/user/42?tab=posts」字符串，也可以是 { path, query } 对象
        let rawPath = typeof to === 'string' ? to : to.path
        let rawQuery = typeof to === 'string' ? to.split('?')[1] : objectToQuery(to.query)
        rawPath = rawPath.split('?')[0]

        const exact = records.get(normalize(rawPath))
        let record = exact
        let params = {}
        if (!record) {
            // 精确表未命中 → 逐条正则，捕获动态段参数
            for (const r of records.values()) {
                const m = normalize(rawPath).match(r.regex)
                if (m) {
                    record = r
                    r.keys.forEach((key, i) => (params[key] = decodeURIComponent(m[i + 1])))
                    break
                }
            }
        }

        return {
            path: normalize(rawPath),
            fullPath: normalize(rawPath) + (rawQuery ? `?${rawQuery}` : ''),
            params,
            query: parseQuery(rawQuery),
            name: record?.name,
            meta: record?.meta || {},
            matched: record ? record.matched : [] // 未匹配 → 空链，RouterView 渲染为空
        }
    }

    /**
     * 动态路由：运行时往 record 表里追加一条（权限路由的底层机制）。
     * @param {{ path: string, name?: string, component: *, children?: Array }} route 单条路由配置（可带 children）
     * @returns {void}
     * @example addRoute({ path: '/docs/:slug', component: Docs }) 后 resolve('/docs/mini-router').params → { slug: 'mini-router' }
     */
    // 动态路由：运行时追加（权限路由的底层机制）
    function addRoute(route) {
        insert([route])
    }

    return { resolve, addRoute, getPaths: () => [...records.keys()] }
}
