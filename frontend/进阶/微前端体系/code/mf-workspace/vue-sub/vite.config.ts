import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import qiankun from 'vite-plugin-qiankun'

// 子应用 dev server 要被宿主跨源加载，必须显式放行 CORS
export default defineConfig({
    plugins: [vue(), qiankun('vue-list', { useDevMode: true })],
    server: {
        port: 3031,
        headers: { 'Access-Control-Allow-Origin': '*' },
    },
})
