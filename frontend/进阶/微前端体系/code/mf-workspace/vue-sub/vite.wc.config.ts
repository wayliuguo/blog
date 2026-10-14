// Web Components 产物构建：defineCustomElement 把 OrderList 组件编译成真正的自定义元素。
// lib 模式 + iife 单文件 + 固定文件名，宿主用 <script src> 动态加载。
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
    plugins: [vue()],
    build: {
        outDir: 'dist-wc',
        lib: {
            entry: 'src/wc-entry.ts',
            name: 'OrderListElementModule',
            formats: ['iife'],
            fileName: () => 'order-list-element.js',
        },
    },
})
