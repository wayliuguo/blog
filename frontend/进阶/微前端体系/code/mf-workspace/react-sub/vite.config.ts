import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import qiankun from 'vite-plugin-qiankun'

export default defineConfig({
    plugins: [react(), qiankun('react-detail', { useDevMode: true })],
    server: {
        port: 3032,
        headers: { 'Access-Control-Allow-Origin': '*' },
    },
})
