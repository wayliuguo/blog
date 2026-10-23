// ============================================================
// mini-router/shared —— 路径与 query 工具
// 对应真实包：vue-router（matcher 内部的路径规范化 / 拼接与 query 编解码，源码
// packages/vue-router/src/matcher/ 的 pathTokenizer、packages/vue-router/src/utils.ts 的
// parseQuery / stringifyQuery）
// 依赖：无；被 matcher.js 依赖（resolve / insert 的路径处理全部落在这里）
// 覆盖机制（对应《Vue Router 原理》2.1 · 2.2）：
//   normalize 路径规范化（去重复斜杠 / 去尾斜杠 / 补开头斜杠）、
//   joinPaths 父子路径拼接（嵌套路由的完整 path）、
//   parseQuery 查询串 → 对象、objectToQuery 对象 → 查询串（互为逆操作）
// ★ 建议断点：normalize（看 '/user//42/' 怎么变成 '/user/42'）、
//   joinPaths（看子路由 'notifications' 怎么拼成 '/settings/notifications'）
// ============================================================

/**
 * 把任意输入路径规范化成「以 / 开头、无重复斜杠、无尾斜杠」的标准形式。
 * 过程：String 化 → 按 / 切分 → filter(Boolean) 滤掉空段（来自重复或首尾的斜杠）
 * → 重新拼接。整条路径只有斜杠时结果就是 '/'。
 * @param {string} p 任意形式的路径，可以带重复斜杠、缺开头斜杠或带尾斜杠
 * @returns {string} 规范化后的路径，如 '/user/42'；全是空段时为 '/'
 * @example normalize('/user//42/') → '/user/42'（重复与首尾斜杠被清掉）
 * @example normalize('user/42')    → '/user/42'（没以 / 开头会补上）
 * @example normalize('/')          → '/'
 */
function normalize(p) {
    // split 产生的空字符串段（来自 // 或首尾的 /）全部丢弃，再把余下的段用 / 接回去
    const out = '/' + String(p).split('/').filter(Boolean).join('/')
    // 整条路径只有 '/' 时不再做尾斜杠处理；否则兜底去掉残留的尾斜杠
    return out === '/' ? '/' : out.replace(/\/+$/, '') || '/'
}

/**
 * 拼接父子路由的 path，得到嵌套路由的完整路径。
 * 过程：子路径以 / 开头视为「嵌套根路径」，直接规范化后使用（与真实 vue-router
 * 行为一致）；否则先拼到父路径后面再统一 normalize。
 * @param {string} parentPath 父路由的完整路径，如 '/settings'
 * @param {string} childPath 子路由配置里写的 path，如 'notifications' 或 '/abs'
 * @returns {string} 拼接并规范化后的完整路径
 * @example joinPaths('/settings', 'notifications') → '/settings/notifications'
 * @example joinPaths('/settings', '/abs')          → '/abs'（子路径以 / 开头视为嵌套根路径）
 */
function joinPaths(parentPath, childPath) {
    // 子路由以 / 开头视为嵌套根路径，否则拼接到父路径后
    return childPath.startsWith('/') ? normalize(childPath) : normalize(`${parentPath}/${childPath}`)
}

/**
 * 把 URL 的查询串（问号后面的部分）解析成普通对象。
 * 过程：交给 URLSearchParams 迭代出 [key, value] 对，逐对收进对象；
 * 入参为空（resolve 里没带 query 的常见情况）时直接返回空对象。
 * @param {string} rawQuery 查询串，如 'tab=posts&page=2'（不含开头的 ?）
 * @returns {Object<string, string>} 解析结果，如 { tab: 'posts', page: '2' }
 * @example parseQuery('tab=posts&page=2') → { tab: 'posts', page: '2' }
 * @example parseQuery('')                 → {}
 */
function parseQuery(rawQuery) {
    const query = {}
    // URLSearchParams 自动完成 %xx 解码，迭代出的 v 已是原始字符
    if (rawQuery) for (const [k, v] of new URLSearchParams(rawQuery)) query[k] = v
    return query
}

/**
 * 把 query 对象序列化成查询串，是 parseQuery 的逆操作。
 * 过程：逐对 append 进 URLSearchParams 再 toString —— 自动完成转义，
 * 中文、&、= 等特殊字符都是安全的。
 * @param {Object<string, string>} [query] query 对象，如 { tab: 'posts' }
 * @returns {string} 查询串（不含开头的 ?）；未传 / 空对象返回空串
 * @example objectToQuery({ tab: 'posts', q: 'a&b' }) → 'tab=posts&q=a%26b'
 * @example objectToQuery(undefined)                  → ''
 */
function objectToQuery(query) {
    if (!query) return ''
    const usp = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) usp.append(k, v)
    return usp.toString()
}
