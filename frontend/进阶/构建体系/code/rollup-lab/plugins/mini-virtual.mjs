// 手写虚拟模块插件：提供一个磁盘上不存在的模块
//
// 关键约定：resolveId 返回的虚拟 id 用 \0 打头，避免被后续插件当成真实路径再去磁盘找
import { readFileSync } from 'node:fs'

const VIRTUAL_ID = 'virtual:build-info'
const RESOLVED_ID = '\0' + VIRTUAL_ID

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

export default function miniVirtual() {
    return {
        name: 'mini-virtual',

        resolveId(source) {
            if (source === VIRTUAL_ID) return RESOLVED_ID
            return null // 返回 null = 这个模块我不管，交给链上的下一个插件
        },

        load(id) {
            if (id !== RESOLVED_ID) return null
            // 这里返回的就是"模块源码"，它会像真实文件一样被后续插件 transform
            return `export const BUILD_INFO = ${JSON.stringify({ name: pkg.name, version: pkg.version })}\n`
        }
    }
}