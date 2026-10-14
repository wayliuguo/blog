import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 宿主无需跨域放行自己，但要开的 dev 端口固定在 3030
export default defineConfig({
    plugins: [vue()],
    server: { port: 3030 },
})
