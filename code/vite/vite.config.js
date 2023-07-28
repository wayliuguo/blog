import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
    esbuild: {
        jsxFactory: 'h',
        jsxFragment: 'Fragment',
        jsxInject: "import {h} from 'vue'"
    },
    resolve: {
        extensions: ['.js', '.ts', '.css'],
        alias: {
            '@': __dirname
        }
    },
    build: {
        // 转 base64
        assetsInlineLimit: 1024 * 1,
        rollupOptions: {
            /* manualChunks: {
                vendor: ['vue', 'axios']
            } */
            manualChunks: id => {
                if (id.includes('node_modules')) {
                    return 'vendor'
                }
            },
            output: {
                entryFileNames: 'bundle.js',
                chunkFileNames: '[name].chunks.js'
            }
        }
    },
    server: {
        port: 8080,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                rewrite: path => {
                    console.log(path)
                    return path
                    // return path.replace(/^\/api/, '')
                }
            }
        }
    },
    plugins: [vue()]
})
