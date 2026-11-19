import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { VantResolver } from 'unplugin-vue-components/resolvers'
import compression from 'vite-plugin-compression'

// 后端真实地址：dev / preview 由 Vite 代理转发，浏览器只看到同源的 /api
const API_TARGET = 'https://api.show-track.top'
const proxy = {
    '/api': {
        target: API_TARGET,
        changeOrigin: true
    }
}

export default defineConfig(({ mode }) => ({
    plugins: [
        vue(),
        // Vue / Router / Pinia 的 API 免 import
        AutoImport({
            imports: ['vue', 'vue-router', 'pinia'],
            dts: 'src/auto-imports.d.ts'
        }),
        // 模板里写 <van-button> 即可；样式随组件按需注入
        Components({
            resolvers: [VantResolver()],
            dts: 'src/components.d.ts'
        }),
        // 产物另存一份 .gz，由 Nginx 直接送出
        compression({ threshold: 1024, ext: '.gz', deleteOriginFile: false })
    ],

    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },

    // 只有 VITE_ 前缀的变量会进入客户端产物
    envPrefix: ['VITE_'],

    server: { proxy },
    preview: { proxy },

    // 生产构建去掉日志与断点
    esbuild: { drop: mode === 'production' ? ['console', 'debugger'] : [] },

    build: {
        target: 'es2020',
        outDir: 'dist',
        emptyOutDir: true,
        assetsInlineLimit: 4096,
        cssCodeSplit: true,
        sourcemap: false,
        rollupOptions: {
            output: {
                entryFileNames: 'assets/[name].[hash:8].js',
                chunkFileNames: 'assets/[name].[hash:8].js',
                assetFileNames: 'assets/[name].[hash:8][extname]',
                // 三方依赖按来源分组：任一业务改动都不会打乱它们的 hash
                manualChunks(id) {
                    if (!id.includes('node_modules')) return null
                    if (id.includes('node_modules/vant')) return 'vant'
                    if (id.includes('node_modules/axios')) return 'axios'
                    if (
                        id.includes('node_modules/vue') ||
                        id.includes('node_modules/@vue') ||
                        id.includes('node_modules/pinia')
                    ) {
                        return 'vue'
                    }
                    return 'vendor'
                }
            }
        }
    }
}))
