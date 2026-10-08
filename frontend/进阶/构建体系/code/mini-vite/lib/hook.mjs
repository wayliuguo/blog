// 极简 tapable：Vite 的插件钩子底层就是「先注册、后触发」。
//
// 真实 tapable 分 AsyncSeriesHook / AsyncSeriesBailHook / AsyncSeriesWaterfallHook 等，
// 差别只在「怎么调用」。本文件把这四种调用约定各给一个方法，插件容器按钩子语义挑一个用：
//   call    —— 依次 await，忽略返回值            （AsyncSeriesHook：buildStart / buildEnd / closeBundle …）
//   first   —— 依次 await，第一个非空结果即返回    （AsyncSeriesBailHook：resolveId / load）
//   pipe    —— 依次 await，上一个的返回值喂给下一个（AsyncSeriesWaterfallHook：transform / renderChunk）
//   collect —— 依次 await，收齐所有非空返回值      （configureServer 要收各插件返回的 post hook）
//
// 两个要点：
//   1. 全是 async —— Vite 的钩子几乎都能返回 Promise，必须 await 完一个再跑下一个；
//   2. 顺序 = 注册顺序 —— 排序不在这里做，容器负责 apply 过滤与 enforce / order 排序。
//
// 对应真实 Vite 的 getSortedPluginHooks（src/node/server/pluginContainer.ts）。
export class Hook {
    constructor() {
        this.taps = []
    }

    /** 注册一个 handler；name 只用于报错定位，真实 tapable 用它做去重 */
    tap(name, fn) {
        this.taps.push({ name, fn })
    }

    async call(...args) {
        for (const t of this.taps) await t.fn(...args)
    }

    async first(...args) {
        for (const t of this.taps) {
            const result = await t.fn(...args)
            if (result != null) return result
        }
        return null
    }

    async pipe(seed, ...rest) {
        let current = seed
        for (const t of this.taps) {
            const result = await t.fn(current, ...rest)
            if (result != null) current = result
        }
        return current
    }

    async collect(...args) {
        const out = []
        for (const t of this.taps) {
            const result = await t.fn(...args)
            if (result != null) out.push(result)
        }
        return out
    }
}
