// 路由匹配器：routes 配置 → 扁平 record 表（路径正则 + matched 链），只回答一个问题：
// 「这个路径对应哪些组件、参数是什么」。嵌套路由的 matched 链在这里成形。
function compilePath(path) {
    // '/user/:id' → { regex: /^\/user\/([^/]+)\/?$/, keys: ['id'] }
    // 不支持重复参数、通配符与可选段（见 README 省略清单）
    const keys = []
    const pattern = path.replace(/\/:([^/]+)/g, (_, key) => {
        keys.push(key)
        return '/([^/]+)'
    })
    return { regex: new RegExp(`^${pattern}\\/?$`), keys }
}

function normalize(p) {
    const out = '/' + String(p).split('/').filter(Boolean).join('/')
    return out === '/' ? '/' : out.replace(/\/+$/, '') || '/'
}

function joinPaths(parentPath, childPath) {
    // 子路由以 / 开头视为嵌套根路径，否则拼接到父路径后
    return childPath.startsWith('/') ? normalize(childPath) : normalize(`${parentPath}/${childPath}`)
}

function parseQuery(rawQuery) {
    const query = {}
    if (rawQuery) for (const [k, v] of new URLSearchParams(rawQuery)) query[k] = v
    return query
}

function createRouterMatcher(routes) {
    const records = new Map() // path → record

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
                matched: [...parentMatched, null], // 占位，下一行补上自身
            }
            record.matched[record.matched.length - 1] = record
            records.set(path, record)
            if (route.children?.length) insert(route.children, path, record.matched)
        }
    }
    insert(routes)

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
            matched: record ? record.matched : [], // 未匹配 → 空链，RouterView 渲染为空
        }
    }

    // 动态路由：运行时追加（权限路由的底层机制）
    function addRoute(route) {
        insert([route])
    }

    return { resolve, addRoute, getPaths: () => [...records.keys()] }
}

function objectToQuery(query) {
    if (!query) return ''
    const usp = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) usp.append(k, v)
    return usp.toString()
}

module.exports = { createRouterMatcher, normalize, compilePath }
