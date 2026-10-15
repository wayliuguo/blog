import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

/**
 * 「优化前」项目：一个完全标准的 vite + vue 生产工程，没有任何为对比做的特殊配置
 *   入口 index.html：空壳，样式与视图全部经 src/main.js 进依赖图
 *   构建产物：vite 把 CSS 抽成 assets/index-*.css 并注入 <link>（阻塞首屏），
 *             五个视图全部打进主 bundle（没有路由级 chunk）
 * 源码就在本目录 src/ 下，不与 after 项目共享任何文件 —— 两个项目的差异就是各层的优化本身。
 * 各自独立构建，绝不合在一次构建里：多入口合建时 rollup 会把共用模块提到公共 chunk，
 * before 这份就不再是「一个 bundle 全量包含」的干净基线。
 * memory.html 是内存实验的独立页（要单独开 --enable-precise-memory-info）。
 */
export default defineConfig({
    root: here,
    // 相对 base：产物用相对路径引用资源，可被任意静态服务器或直接打开
    base: './',
    publicDir: resolve(here, 'public'),
    plugins: [vue()],
    server: { port: 5187 },
    build: {
        outDir: resolve(here, '../../dist-before'),
        emptyOutDir: true,
        rollupOptions: {
            input: {
                index: resolve(here, 'index.html'),
                memory: resolve(here, 'memory.html')
            }
        }
    }
})
