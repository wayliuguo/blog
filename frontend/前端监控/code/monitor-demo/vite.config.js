import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
    base: '/', // history 路由：/product/1 下相对路径会解析错，必须用绝对 base
    plugins: [vue()],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        // 两个入口：演示商城 + 白屏验证页
        rollupOptions: {
            input: {
                main: fileURLToPath(new URL('./index.html', import.meta.url)),
                blank: fileURLToPath(new URL('./blank.html', import.meta.url))
            }
        }
    }
})
