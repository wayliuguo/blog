import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    build: {
        outDir: 'dist-wc',
        lib: {
            entry: 'src/wc-entry.tsx',
            name: 'OrderDetailElementModule',
            formats: ['iife'],
            fileName: () => 'order-detail-element.js',
        },
    },
})
