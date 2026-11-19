// 「间谍插件」：把 Vite / Rollup 每个钩子被调用时的参数打印出来，然后原样放行，不影响构建。
// 目的：配合 .vscode/launch.json 断点调试，看清各钩子在什么时机、带着什么参数被调用。
//
// 开关（默认关闭，不污染普通构建输出）：
//   DEBUG_VITE=1    → 打印每个钩子的调用与参数（transform 只打 id 和源码长度）
//   DEBUG_VITE=all  → transform 连源码全文一起打
// 用法：PowerShell 里 $env:DEBUG_VITE='1'; npm run build
//       或在 VSCode 调试面板跑「调试 vite build」（launch.json 已注入该变量）
'use strict'
import util from 'node:util'

// 字符串截断显示；对象用 util.inspect 限深，防止 resolved config 这类巨型对象刷屏
const show = (v, depth = 1) => {
    if (typeof v === 'string') {
        return v.length > 100 ? `"${v.slice(0, 100)}…"(${v.length} 字符)` : `"${v}"`
    }
    return util.inspect(v, { depth, colors: false, maxArrayLength: 5, breakLength: 110 })
}

export default function debugLogPlugin(options = {}) {
    const enabled = options.enabled ?? process.env.DEBUG_VITE !== undefined
    const verbose = process.env.DEBUG_VITE === 'all'

    if (!enabled) {
        return { name: 'debug-log' }
    }

    const log = (hook, args) => {
        console.log(`  [debug] ${hook}(${args.map(a => show(a, a && a.bundle ? 0 : 1)).join(', ')})`)
    }

    return {
        name: 'debug-log',

        // ---------- 构建前：配置阶段 ----------

        // options(inputOptions)：Rollup 收到用户配置，还没解析成完整输入。返回 null 表示不改
        options(inputOptions) {
            log('options', [inputOptions])
            return null
        },

        // config(userConfig, configEnv)：Vite 层的配置钩子。configEnv = { mode, command }
        config(userConfig, configEnv) {
            log('config', [{ ...configEnv, userConfigKeys: Object.keys(userConfig) }])
            return null
        },

        // configResolved(resolved)：配置已定稿（此处只能读，改了也不生效）
        configResolved(resolved) {
            log('configResolved', [
                {
                    root: resolved.root,
                    base: resolved.base,
                    mode: resolved.mode,
                    command: resolved.command,
                    plugins: resolved.plugins.map(p => p.name)
                }
            ])
        },

        // configureServer(server)：dev server 创建后（build 时不会触发）
        configureServer(server) {
            log('configureServer', [`dev server 已创建（middleware: ${server.middlewares ? '已挂载' : '无'}）`])
        },

        // ---------- dev / build 共用：转换管线 ----------

        // transformIndexHtml(html, ctx)：HTML 入口被读取时
        transformIndexHtml(html, ctx) {
            log('transformIndexHtml', [{ path: ctx.path, filename: ctx.filename }, html])
            return html
        },

        // buildStart(inputOptions)：构建开始（每个 build/dev 会话一次）
        buildStart(inputOptions) {
            log('buildStart', [inputOptions])
        },

        // resolveId(source, importer, opts)：每个 import 的「路径解析」阶段。
        // source = 导入说明符（'vue' / './style.css'），importer = 谁发的起这个请求
        resolveId(source, importer, opts) {
            log('resolveId', [source, importer, opts?.isEntry ? '(entry)' : ''])
            return null
        },

        // load(id)：解析成功后「读文件」。返回 null 表示交给默认 loader 读
        load(id) {
            log('load', [id])
            return null
        },

        // transform(code, id)：每个模块的「转译」阶段（vue / css / ts 都从这里过）
        transform(code, id) {
            if (verbose) {
                log('transform', [id, code])
            } else {
                log('transform', [id, `${code.length} 字符`])
            }
            return null
        },

        // moduleParsed(moduleInfo)：模块解析完成，能拿到导入/导出信息
        moduleParsed(moduleInfo) {
            log('moduleParsed', [{ id: moduleInfo.id, importedIds: moduleInfo.importedIds }])
        },

        // ---------- 构建后：产物阶段 ----------

        // buildEnd(error)：模块图建完（error 非 null 表示前面有失败）
        buildEnd(error) {
            log('buildEnd', [error || '成功'])
        },

        // generateBundle(options, bundle, isWrite)：产物已生成、未写盘。
        // bundle 的 key 就是文件名，value 是 chunk / asset 对象
        generateBundle(options, bundle, isWrite) {
            log('generateBundle', [{ isWrite, files: Object.keys(bundle) }])
        },

        // writeBundle(options, bundle)：写盘完成
        writeBundle(options, bundle) {
            log('writeBundle', [{ files: Object.keys(bundle) }])
        },

        // closeBundle()：整个构建收尾（适合做清理、上报）
        closeBundle() {
            log('closeBundle', [])
        }
    }
}
