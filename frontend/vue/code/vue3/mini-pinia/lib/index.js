// ============================================================
// mini-pinia/index —— 聚合入口
// 对应真实包：pinia 的包入口（src/index.ts：把 createPinia / defineStore /
// storeToRefs 等对外 API 一起导出）+ 应用激活约定（先 createPinia + setActivePinia，
// 真实 Vue 应用里对应 app.use(createPinia())，之后组件内 useStore 才可用）
// 依赖：前两个文件必须先按序加载（reactivity.js → pinia.js）
// 职责：把两层的对外 API 聚合挂到 window.MiniPinia（demo 与控制台的统一入口）
// ============================================================

window.MiniPinia = {
    // 响应式层（reactivity.js，对应 @vue/reactivity）
    reactive,
    ref,
    computed,
    effect,
    isRef,
    // store 层（pinia.js，对应 pinia 包）
    createPinia,
    setActivePinia,
    defineStore,
    storeToRefs
}
