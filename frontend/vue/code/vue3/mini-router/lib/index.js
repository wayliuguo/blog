// ============================================================
// mini-router/index —— 装配入口
// 对应真实包：vue-router 的入口（源码 packages/vue-router/src/index.ts 的导出聚合）
// 依赖：前五个文件必须先按序加载（shared → reactivity → matcher → history → router）
// 覆盖机制：把对外 API 聚合挂到 window.MiniRouter（demo 与控制台统一入口，
// 《Vue Router 原理》一.1 协作关系的可运行证明）
// ★ 建议断点：本文件无逻辑；断点请到各实现文件（见各文件头「★ 建议断点」）
// ============================================================

// ============================================================
// 聚合：对外 API 挂到 window.MiniRouter
// ============================================================
window.MiniRouter = {
    // 最小响应式（reactivity.js）：撑起 currentRoute → 视图 effect 重跑
    ref,
    effect,
    // 匹配器（matcher.js）：路径 → matched 组件链 + params/query
    createRouterMatcher,
    // history 抽象（history.js）：memory / hash / web 三模式同一套接口
    createMemoryHistory,
    createWebHashHistory,
    createWebHistory,
    // 路由器主体（router.js）：守卫流程 → 改 URL → 改 currentRoute → 视图重跑
    createRouter
}
