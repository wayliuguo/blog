// qk 产物构建（React 侧）：UMD 单文件 + 固定文件名，qiankun/micro-app/wujie 三方案共用。
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    // lib 构建不自动替换依赖里的 process.env.NODE_ENV；qiankun 沙箱里没有 process，
    // 必须在构建层替换掉（运行层的兜底垫片在宿主 main.ts）
    define: { 'process.env.NODE_ENV': '"production"' },
    build: {
        outDir: 'dist-qk',
        emptyOutDir: false,
        lib: {
            entry: 'src/main-qk.tsx',
            name: 'reactDetailQk',
            formats: ['umd'],
            fileName: () => 'order-detail-qk.js',
        },
    },
})
