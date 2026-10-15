// 模块定位与读取：说明符 → id。
//
// 对应真实 Vite 的两个内置插件：
//   createResolvePlugin    ↔ vite:resolve        （说明符 → 绝对路径 / 虚拟 id）
//   createFsPlugin         ↔ vite:load-fallback  （插件都不认时，从磁盘读）
// 真实 Vite 把它们拆成两个插件，这里放在同一文件里，因为二者共同回答"模块在哪、内容是什么"。
import fs from 'node:fs'
import path from 'node:path'

/** 虚拟模块前缀：社区约定，\0 开头的 id 不落盘 */
export const VIRTUAL_PREFIX = '\0'
/** 裸导入占位 id 前缀：真实 Vite 走依赖预构建，这里用虚拟模块顶替 */
const DEPS_PREFIX = '\0deps:'

/** 说明符解析插件：负责"模块在哪" */
export function createResolvePlugin({ root }) {
    return {
        name: 'mini:resolve',
        enforce: 'pre',
        resolveId(source, importer) {
            // 虚拟模块：由提供它的插件自己认领
            if (source.startsWith(VIRTUAL_PREFIX)) return source
            // 带协议前缀的说明符（virtual:xxx / node:fs …）不是文件路径，让给别的插件；
            // 但 Windows 盘符（C:\…）要放行，否则绝对路径会被误判
            if (!/^[a-zA-Z]:[\\/]/.test(source) && /^[a-zA-Z][\w+.-]*:/.test(source)) return null
            if (path.isAbsolute(source)) return source
            if (source.startsWith('.')) {
                const base = importer ? path.dirname(importer) : root
                return path.resolve(base, source)
            }
            // 裸导入：真实 Vite 会预构建进 node_modules/.vite/deps，
            // 这里只留一个虚拟占位 id，内容由本插件的 load 提供
            return `${DEPS_PREFIX}${source}`
        },
        load(id) {
            if (!id.startsWith(DEPS_PREFIX)) return null
            const name = id.slice(DEPS_PREFIX.length)
            return [
                `// 裸导入 ${name} 的占位模块（真实 Vite 走依赖预构建）`,
                `export function greet() { return 'hello from ${name}' }`,
                ''
            ].join('\n')
        }
    }
}

/** 读取兜底插件：负责"内容是什么"——插件都不认时从磁盘读 */
export function createFsPlugin() {
    return {
        name: 'mini:load-fallback',
        load(id) {
            // 虚拟模块不落盘，交给前面的插件
            if (id.startsWith(VIRTUAL_PREFIX)) return null
            if (!fs.existsSync(id)) return null
            return fs.readFileSync(id, 'utf-8')
        }
    }
}
