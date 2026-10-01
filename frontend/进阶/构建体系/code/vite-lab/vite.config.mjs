// Vite 生产配置：单入口 + 手写插件 + 代码分割 + 压缩
//
// 两个命令共用这一份配置：
//   npm run build    → vite build            （写盘到 dist/）
//   npm run preview  → vite build && vite preview（构建 + 本地预览真实产物）
// 不需要第二份配置文件，也不需要自定义环境变量。
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import miniVirtual from './plugins/mini-virtual.mjs'
import miniDrop from './plugins/mini-drop.mjs'
import miniHtml from './plugins/mini-html.mjs'
import miniTerser from './plugins/mini-terser.mjs'
import miniSizeGate from './plugins/mini-size-gate.mjs'

const DIR = import.meta.dirname

export default defineConfig({
    root: DIR,

    // 环境变量前缀：只有 VITE_ 开头的才会暴露给客户端代码
    envPrefix: 'VITE_',

    define: {
        // 编译期常量，与 webpack DefinePlugin 等价
        __BUILD_TIME__: JSON.stringify(new Date().toISOString())
    },

    plugins: [
        // 官方 @vitejs/plugin-vue 编译 .vue 单文件组件；它也是唯一一个非手写插件
        vue(),
        // 顺序即注册顺序；真正的先后由各自的 enforce / order 决定
        miniVirtual(),
        miniDrop(),
        miniHtml({ nonce: 'lab-nonce' })
    ],

    // 依赖预构建：把 CJS / 碎片化依赖预先转成 ESM 并合并
    optimizeDeps: {
        include: ['magic-string']
    },

    build: {
        outDir: 'dist',
        emptyOutDir: true,
        // 关掉内置压缩，改用我们手写的 miniTerser（与 webpack 篇同构）
        minify: false,
        // 资源内联阈值：小于它的资源内联进 JS
        assetsInlineLimit: 4096,
        // CSS 单独成文件，不走运行时注入
        cssCodeSplit: true,

        rollupOptions: {
            output: {
                // 内容变了文件名才变 → CDN 长缓存
                entryFileNames: 'assets/[name].[hash:8].js',
                chunkFileNames: 'assets/[name].[hash:8].chunk.js',
                assetFileNames: 'assets/[name].[hash:8][extname]',
                // 手动分组：把 node_modules 依赖单独打一个 chunk
                manualChunks(id) {
                    if (id.includes('node_modules')) return 'vendor'
                    return null
                }
            },
            // 挂在 output 上的手写插件：压缩在前、称重在后的顺序即依赖关系
            plugins: [
                miniTerser(),
                miniSizeGate({ limitKb: 60, manifest: 'build-manifest.json' })
            ]
        }
    }
})