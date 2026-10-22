import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
    base: '/', // history 路由：/product/1 下相对路径会解析错，必须用绝对 base
    plugins: [vue()],
    build: {
        outDir: 'dist',
        emptyOutDir: true
    }
})
