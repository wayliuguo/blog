// 手写压缩插件：把每个 chunk 的代码过一遍 terser，再覆盖回去
//
// 挂在 renderChunk —— chunk 代码已生成、还没算 hash、还没写盘，是改代码的正确时机
// （删文件、改文件名要放到 generateBundle，那是动产物结构的窗口）
import { minify } from 'terser'

export default function miniTerser(options = {}) {
    const kb = n => (n / 1024).toFixed(2)

    return {
        name: 'mini-terser',

        async renderChunk(code, chunk) {
            const result = await minify(code, { format: { comments: false }, ...options })
            if (result.error) throw result.error
            // Rolldown 在 renderChunk 阶段给的是占位文件名（真实文件名要等 generateBundle）
            const label = chunk.name || chunk.fileName
            console.log(`  [mini-terser] ${label}: ${kb(code.length)} KB → ${kb(result.code.length)} KB`)
            return { code: result.code, map: null }
        }
    }
}
