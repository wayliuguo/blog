import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

/**
 * 构建期优化插件：把 vite 注入产物 html 的 <link rel="stylesheet"> 改写成异步加载。
 * 原理：media="print" 的样式表匹配媒体查询失败，浏览器只下载不应用、不阻塞渲染；
 * onload 里改回 media="all" 生效；preload 提高下载优先级，noscript 兜底无 JS 场景。
 * 首屏要的样式已经内联在 index.html 的 <style> 里（关键 CSS），所以异步期间骨架屏不是裸的。
 * 对应 before 项目：那边没有这个插件，构建出的 <link rel="stylesheet"> 原样阻塞首屏。
 */
function htmlAsyncCss() {
    return {
        name: 'lab-html-async-css',
        enforce: 'post',
        apply: 'build',
        generateBundle(_, bundle) {
            for (const file of Object.values(bundle)) {
                if (file.type === 'asset' && file.fileName.endsWith('.html')) {
                    file.source = String(file.source).replace(
                        /<link rel="stylesheet"([^>]*href="[^"]+"[^>]*)>/g,
                        (m, attrs) =>
                            `<link rel="preload" as="style"${attrs}>` +
                            `<link rel="stylesheet"${attrs} media="print" onload="this.media='all'">` +
                            `<noscript><link rel="stylesheet"${attrs}></noscript>`
                    )
                }
            }
        }
    }
}

/**
 * 「优化后」项目：一个真实生产配置的 vite + vue 工程，优化全部落在源码写法与构建配置上
 *   入口 index.html：关键 CSS 内联 + HTML 里的骨架屏；全量 CSS 经 src/main.js 进依赖图，
 *                    由上面的 htmlAsyncCss 插件在构建期改写成异步
 *   入口 src/main.js：() => import('./views/X.vue')，rollup 把五个视图拆成独立 chunk
 * 源码就在本目录 src/ 下，不与 before 项目共享任何文件 —— 两个项目的差异就是各层的优化本身。
 * 各自独立构建，绝不合在一次构建里：多入口合建时 rollup 会把共用模块提到公共 chunk，
 * before 那份就不再是「一个 bundle 全量包含」的干净基线。
 */
export default defineConfig({
    root: here,
    base: './',
    publicDir: resolve(here, 'public'),
    plugins: [vue(), htmlAsyncCss()],
    server: { port: 5193 },
    build: {
        outDir: resolve(here, '../../dist-after'),
        emptyOutDir: true,
        rollupOptions: {
            input: {
                index: resolve(here, 'index.html'),
                memory: resolve(here, 'memory.html')
            }
        }
    }
})
