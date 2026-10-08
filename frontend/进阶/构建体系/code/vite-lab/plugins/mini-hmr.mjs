// 手写 HMR 插件：dev 期观察一次文件改动会波及多少模块
//
// apply: 'serve' —— 只在 dev 加载，build 里没有"热更新"这回事
// hotUpdate 的 ctx 带 environment（Vite 6 起的新写法）；旧名 handleHotUpdate 仍然可用
// 对应真实插件：各类 HMR 增强插件；只想"看"模块图可以用 vite-plugin-inspect
//
// 返回值决定这次热更新发给谁：
//   不返回       → 交给 Vite 默认逻辑自己算 HMR 边界（本插件就选这条）
//   返回 []      → 吞掉这次更新，改用 server.ws.send() 自己通知前端
//   返回 modules → 只把这次更新限定在这几个模块
//
// 注意：ctx.modules 是"已经被更早的插件过滤过"的结果，不是原始候选集。
// 实测 @vitejs/plugin-vue（插件名 vite:vue，仍走旧的 handleHotUpdate）会按"改了哪个块"收窄：
//   改 HelloCard.vue 的 <template> → 自身模块 1 个
//   只改 SFC 块外的注释            → 自身模块 0 个
export default function miniHmr(options = {}) {
    const watched = options.watched || /[/\\]src[/\\]/

    return {
        name: 'mini-hmr',
        apply: 'serve',

        hotUpdate(ctx) {
            const { type, file, modules } = ctx
            if (!watched.test(file)) return

            // modules 是"这个文件自身对应的模块"；importers 是"谁引用了它"——逆着模块图往上查
            const importers = new Set()
            for (const mod of modules) {
                for (const imp of mod.importers) importers.add(imp.url)
            }

            const names = [...importers].map(u => u.split('/').pop())
            console.log(
                `  [mini-hmr] ${type} ${file.split(/[/\\]/).pop()}：自身模块 ${modules.length} 个，` +
                    `被 ${importers.size} 个模块引用${names.length ? `（${names.join(', ')}）` : ''}`
            )
        }
    }
}
