import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 项目根在 app/：入口 index.html、暂存目录、SDK 由 SPA 直接 import（../../sdk/index.mjs）
export default defineConfig({
    plugins: [vue()],
    root: 'app',
    build: {
        outDir: 'dist',
        emptyOutDir: true
    },
    server: {
        port: 5173,
        // dev 形态：/collect 代理回采集端，SPA 与接收端同源，无需 CORS
        proxy: {
            '/collect': 'http://localhost:5189'
        }
    }
})