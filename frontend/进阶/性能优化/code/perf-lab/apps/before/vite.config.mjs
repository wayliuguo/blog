import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const LAB = resolve(here, '../..') // perf-lab 根：两个工程与共享源码都在这里
const SHARED = resolve(LAB, 'shared')

/**
 * 「优化前」工程：一个独立的 vite + vue 项目
 *   入口 raw.html：CSS 外链（阻塞渲染）+ #app 空壳
 *   入口 main.js：四个视图静态 import，全部打进主 bundle
 * 业务源码不放在这个工程里，而是从 ../../shared/ 用 @lab 别名引入 —— 两个工程跑同一份组件，
 * 差异只剩本目录里的 html + main.js，「优化前 vs 优化后」才是干净的单变量对照。
 * memory.html 是内存实验的独立页（要单独开 --enable-precise-memory-info），挂在这个工程里顺带构建。
 */
export default defineConfig({
    root: here,
    // 相对 base：产物用相对路径引用资源，可被任意静态服务器或直接打开
    base: './',
    // app.css 与 lab.js 两版共用，指向 shared/public
    publicDir: resolve(SHARED, 'public'),
    resolve: { alias: { '@lab': SHARED } },
    plugins: [vue()],
    server: { port: 5187, fs: { allow: [LAB] } },
    build: {
        // 产物落在 perf-lab 根：dist-before / dist-after 两套分别独立构建
        outDir: resolve(LAB, 'dist-before'),
        emptyOutDir: true,
        rollupOptions: {
            input: {
                raw: resolve(here, 'raw.html'),
                memory: resolve(here, 'memory.html')
            }
        }
    }
})
