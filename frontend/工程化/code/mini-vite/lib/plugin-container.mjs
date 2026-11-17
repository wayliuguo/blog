// 插件容器：Vite 插件机制真正落地的地方。
//
// 它回答三个问题（对应文档 §3.3 的排序三层）：
//   1. 哪些插件参与本次运行？ —— apply 过滤（serve / build）
//   2. 同一个钩子上谁先谁后？ —— enforce 跨插件排序，order 同钩子内排序
//   3. 钩子怎么被调用？       —— 从插件的对象/函数钩子收集成有序 Hook，按语义选调用约定
//
// 对应真实 Vite 的 PluginContainer（src/node/server/pluginContainer.ts）。
// 简化处（注释里标注）：config 返回的 partial config 只做浅合并；插件上下文只给 pluginName + 日志方法。
import { Hook } from './hook.mjs'

// 配置类钩子：在 apply 过滤之前跑（漏写 apply 的插件，config 仍会被调用）
const CONFIG_HOOKS = ['config', 'configResolved']

// 运行类钩子：按「调用约定」分三组
const CALL_HOOKS = ['buildStart', 'buildEnd', 'closeBundle', 'generateBundle']
const FIRST_HOOKS = ['resolveId', 'load']
const PIPE_HOOKS = ['transform', 'renderChunk', 'transformIndexHtml']

const RUN_HOOKS = [...CALL_HOOKS, ...FIRST_HOOKS, ...PIPE_HOOKS]
const ALL_HOOKS = [...CONFIG_HOOKS, ...RUN_HOOKS]

const TIER = { pre: 0, normal: 1, post: 2 }

/** 取出插件上某个钩子的 handler 与它的 order；对象钩子写成 { handler, order } */
function hookEntry(plugin, name) {
    const raw = plugin[name]
    if (!raw) return null
    if (typeof raw === 'function') return { fn: raw, order: 'normal' }
    if (typeof raw === 'object' && typeof raw.handler === 'function') {
        return { fn: raw.handler, order: raw.order || 'normal' }
    }
    return null
}

/** apply 过滤：'serve' / 'build' / 函数 / 不写（两端都参与） */
function applyMatches(plugin, command, mode) {
    const apply = plugin.apply
    if (!apply) return true
    if (typeof apply === 'function') return apply({ command, mode }, { command, mode })
    return apply === command
}

/**
 * @param {Array} rawPlugins - 用户插件（未过滤、未排序）
 * @param {{command:'serve'|'build', mode?:string, root:string}} options
 */
export function createPluginContainer(rawPlugins, options) {
    const { command, root, mode = 'production' } = options

    /** 每个钩子被触发的次数，供 §十 的钩子触发次数表使用 */
    const hookCalls = Object.fromEntries(ALL_HOOKS.map(h => [h, 0]))

    const context = plugin => ({
        pluginName: plugin.name,
        warn: msg => console.warn(`[${plugin.name}] ${msg}`),
        info: msg => console.log(`[${plugin.name}] ${msg}`)
    })

    // ---- 1. config：在 apply 过滤之前跑（漏写 apply 的插件，config 仍会被调用）----
    // 真实 Vite 这里做 deep merge；本实现简化为浅合并
    let config = { root, mode }
    hookCalls.config = 1
    for (const plugin of rawPlugins) {
        const entry = hookEntry(plugin, 'config')
        if (!entry) continue
        const partial = entry.fn.call(context(plugin), config, { command, mode })
        if (partial) config = { ...config, ...partial }
    }
    config.command = command

    // ---- 2. configResolved：拿到最终 config ----
    hookCalls.configResolved = 1
    for (const plugin of rawPlugins) {
        const entry = hookEntry(plugin, 'configResolved')
        if (entry) entry.fn.call(context(plugin), config)
    }

    // ---- 3. apply 过滤 ----
    const activePlugins = rawPlugins.filter(p => applyMatches(p, command, mode))

    // ---- 4. 每个钩子收集成一个有序 Hook ----
    //    排序：主键 enforce（跨插件），次键 order（同一钩子内），末键注册顺序（稳定）
    /** @type {Record<string, Hook>} */
    const hooks = {}
    for (const name of RUN_HOOKS) {
        const entries = []
        activePlugins.forEach((plugin, index) => {
            const entry = hookEntry(plugin, name)
            if (!entry) return
            entries.push({
                plugin,
                fn: entry.fn,
                tier: TIER[plugin.enforce] ?? TIER.normal,
                order: TIER[entry.order] ?? TIER.normal,
                index
            })
        })
        entries.sort((a, b) => a.tier - b.tier || a.order - b.order || a.index - b.index)

        const hook = new Hook()
        for (const e of entries) {
            const ctx = context(e.plugin)
            hook.tap(e.plugin.name, (...args) => e.fn.apply(ctx, args))
        }
        hooks[name] = hook
    }

    // transformIndexHtml 额外支持"返回标签数组"，在容器这一层归一成字符串
    const rawIndexHtml = hooks.transformIndexHtml
    hooks.transformIndexHtml = new Hook()
    for (const t of rawIndexHtml.taps) {
        hooks.transformIndexHtml.tap(t.name, async (html, ctx) => {
            const result = await t.fn(html, ctx)
            if (typeof result === 'string') return result
            if (Array.isArray(result)) {
                const tags = result.map(tag => (typeof tag === 'string' ? tag : tag.children)).join('\n    ')
                return html.replace('</head>', `    ${tags}\n  </head>`)
            }
            return null
        })
    }

    const count = name => {
        hookCalls[name] += 1
    }

    return {
        config,
        hookCalls,
        /** 经过 apply 过滤 + enforce 排序后的插件表 */
        plugins: activePlugins,

        async buildStart(options) {
            count('buildStart')
            await hooks.buildStart.call(options)
        },

        async buildEnd(error) {
            count('buildEnd')
            await hooks.buildEnd.call(error)
        },

        async closeBundle() {
            count('closeBundle')
            await hooks.closeBundle.call()
        },

        async generateBundle(options, bundle) {
            count('generateBundle')
            await hooks.generateBundle.call(options, bundle)
        },

        /** 解析说明符：第一个返回结果的插件赢 */
        async resolveId(source, importer) {
            count('resolveId')
            const result = await hooks.resolveId.first(source, importer)
            if (result == null) return null
            return typeof result === 'string' ? result : result.id
        },

        /** 加载模块内容：第一个返回代码的插件赢 */
        async load(id) {
            count('load')
            const result = await hooks.load.first(id)
            if (result == null) return null
            return typeof result === 'string' ? result : result.code
        },

        /** 转换：code 依次流经所有插件 */
        async transform(code, id) {
            count('transform')
            return hooks.transform.pipe(code, id)
        },

        /** 改 chunk 代码：code 依次流经所有插件 */
        async renderChunk(code, chunk, renderOptions) {
            count('renderChunk')
            return hooks.renderChunk.pipe(code, chunk, renderOptions)
        },

        /** 处理 HTML：字符串流经所有插件，数组归一成注入 <head> */
        async transformIndexHtml(html, ctx) {
            count('transformIndexHtml')
            return hooks.transformIndexHtml.pipe(html, ctx)
        }
    }
}

export { CONFIG_HOOKS, RUN_HOOKS, CALL_HOOKS, FIRST_HOOKS, PIPE_HOOKS }
