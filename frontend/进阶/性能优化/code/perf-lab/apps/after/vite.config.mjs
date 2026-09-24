import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const LAB = resolve(here, '../..') // perf-lab 根：两个工程与共享源码都在这里
const SHARED = resolve(LAB, 'shared')

/**
 * 「优化后」工程：一个独立的 vite + vue 项目
 *   入口 index.html：首屏关键 CSS 内联 + HTML 里的骨架屏 + 全量 CSS 异步
 *   入口 main.js：() => import('@lab/views/X.vue')，rollup 把四个视图拆成独立 chunk
 * 业务源码同样来自 ../../shared/（@lab 别名），与 before 工程是同一份文件。
 * 两个工程各自独立构建，绝不合在一次构建里 —— 多入口一起构建时 rollup 会把共用模块提到
 * 公共 chunk，before 那份就不再是「一个 bundle 全量包含」的干净基线。
 */
export default defineConfig({
    root: here,
    base: './',
    publicDir: resolve(SHARED, 'public'),
    resolve: { alias: { '@lab': SHARED } },
    plugins: [vue()],
    server: { port: 5193, fs: { allow: [LAB] } },
    build: {
        outDir: resolve(LAB, 'dist-after'),
        emptyOutDir: true,
        rollupOptions: {
            input: { optimized: resolve(here, 'index.html') }
        }
    }
})
