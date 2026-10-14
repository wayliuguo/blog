// qk 产物构建：UMD 单文件 + 固定文件名，qiankun/micro-app/wujie 三方案共用。
// emptyOutDir:false 保留手写的 index.html（qiankun 的 import-html-entry 以它为 entry）。
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
    plugins: [vue()],
    // lib 构建不自动替换依赖里的 process.env.NODE_ENV；qiankun 沙箱里没有 process，
    // 必须在构建层替换掉（运行层的兜底垫片在宿主 main.ts）
    define: { 'process.env.NODE_ENV': '"production"' },
    build: {
        outDir: 'dist-qk',
        emptyOutDir: false,
        lib: {
            entry: 'src/main-qk.ts',
            name: 'vueListQk',
            formats: ['umd'],
            fileName: () => 'vue-list-qk.js',
        },
    },
})
