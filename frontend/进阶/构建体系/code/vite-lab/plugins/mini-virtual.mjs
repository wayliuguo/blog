// 手写虚拟模块插件：给源码提供一个"编译期才知道"的模块
// 源码里 `import { BUILD_INFO } from 'virtual:build-info'`，磁盘上并不存在这个文件
//
// 关键约定：resolveId 返回的虚拟 id 用 \0 打头，避免被后续插件当成真实路径再去磁盘找
export default function miniVirtual() {
    const VIRTUAL_ID = 'virtual:build-info'
    const RESOLVED_ID = '\0' + VIRTUAL_ID

    // configResolved 能读到最终配置；把 mode 缓存下来，load 时注入字面量
    let mode = 'production'

    return {
        name: 'mini-virtual',

        configResolved(config) {
            mode = config.mode
        },

        resolveId(source) {
            if (source === VIRTUAL_ID) return RESOLVED_ID
            return null // 返回 null = 这个模块我不管，交给链上的下一个插件
        },

        load(id) {
            if (id !== RESOLVED_ID) return null
            // 这里返回的就是"模块源码"，它会像真实文件一样被后续插件 transform
            return `export const BUILD_INFO = { name: 'vite-lab', mode: ${JSON.stringify(mode)} }\n`
        }
    }
}
