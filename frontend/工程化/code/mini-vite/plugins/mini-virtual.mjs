// 虚拟模块：不落盘、由插件在内存里提供内容。
// 对应真实的 vite-plugin-virtual 一类插件。
//
// 演示三个钩子：
//   config / configResolved —— Vite 专有，配置阶段（此时还没有模块图）
//   resolveId / load        —— 通用（Rollup 兼容），负责认领与提供内容
const VIRTUAL_ID = '\0virtual:build-info'

export function miniVirtual() {
    let mode = 'unknown'

    return {
        name: 'mini-virtual',

        config(config, env) {
            console.log(`  [mini-virtual] config：command=${env.command} mode=${env.mode}`)
            return null // 只观察，不改配置
        },

        configResolved(config) {
            mode = config.mode
            console.log(`  [mini-virtual] configResolved：缓存 mode=${mode}`)
        },

        resolveId(source) {
            return source === 'virtual:build-info' ? VIRTUAL_ID : null
        },

        load(id) {
            if (id !== VIRTUAL_ID) return null
            return `export const mode = ${JSON.stringify(mode)}\nexport const builtBy = 'mini-vite'\n`
        }
    }
}
