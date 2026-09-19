// Vite：一份覆盖 dev / build 的配置，含自定义插件与构建期常量
import { defineConfig } from 'vite'
import { transformCounter } from './counter-plugin.mjs'

const DIR = import.meta.dirname

export default defineConfig({
    root: DIR,
    // 环境变量前缀：只有 VITE_ 开头的才会暴露给客户端代码
    envPrefix: 'VITE_',
    define: {
        // 编译期常量，与 webpack DefinePlugin 等价
        __BUILD_TIME__: JSON.stringify(new Date().toISOString())
    },
    plugins: [transformCounter()],
    // 依赖预构建：把 CJS / 碎片化依赖预先转成 ESM 并合并
    optimizeDeps: {
        include: ['magic-string']
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        // 产物统计用：关掉压缩便于观察
        minify: false,
        rollupOptions: {
            output: {
                // 手动分组：把 node_modules 依赖单独打一个 chunk
                // 注意：Vite 8 起生产构建走 Rolldown，manualChunks 只接受函数形式
                manualChunks(id) {
                    if (id.includes('magic-string')) return 'vendor'
                    return null
                }
            }
        }
    }
})
