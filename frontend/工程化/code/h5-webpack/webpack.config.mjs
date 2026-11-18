import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import webpack from 'webpack'
import { VueLoaderPlugin } from 'vue-loader'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import CompressionPlugin from 'compression-webpack-plugin'
import TerserPlugin from 'terser-webpack-plugin'
import AutoImport from 'unplugin-auto-import/webpack'
import Components from 'unplugin-vue-components/webpack'
import { VantResolver } from 'unplugin-vue-components/resolvers'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 后端真实地址：devServer 代理转发，浏览器只看到同源的 /api
const API_TARGET = 'https://api.show-track.top'

/**
 * 自己读 .env 文件：webpack 不像 Vite 自带 env 加载。
 * 优先级 .env < .env.<mode> < .env.local，只取 VITE_ 前缀。
 */
function loadEnvFiles(mode) {
    const result = {}
    for (const file of ['.env', `.env.${mode}`, '.env.local']) {
        const full = path.resolve(__dirname, file)
        if (!fs.existsSync(full)) continue
        for (const rawLine of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
            const line = rawLine.trim()
            if (!line || line.startsWith('#')) continue
            const index = line.indexOf('=')
            if (index === -1) continue
            const key = line.slice(0, index).trim()
            if (!key.startsWith('VITE_')) continue
            result[key] = line.slice(index + 1).trim()
        }
    }
    return result
}

export default (env, argv) => {
    const mode = argv.mode || 'development'
    const isProd = mode === 'production'
    const fileEnv = loadEnvFiles(mode)
    // 命令行 / CI 注入的真实 token 优先于 .env.local
    const apiToken = process.env.VITE_API_TOKEN ?? fileEnv.VITE_API_TOKEN ?? ''

    return {
        mode,
        entry: './src/main.ts',
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: 'assets/[name].[contenthash:8].js',
            chunkFilename: 'assets/[name].[contenthash:8].js',
            publicPath: '/',
            clean: true
        },
        resolve: {
            // .mjs 必须显式列出：Vant 的 ESM 产物是 .mjs，目录入口是 index.mjs
            extensions: ['.mjs', '.ts', '.js', '.vue', '.json'],
            alias: {
                '@': path.resolve(__dirname, 'src')
            }
        },
        module: {
            rules: [
                { test: /\.vue$/, loader: 'vue-loader' },
                // 只转译不查类型（transpileOnly），类型检查交给 vue-tsc，与 Vite 的分工一致
                {
                    test: /\.ts$/,
                    loader: 'ts-loader',
                    options: { transpileOnly: true, appendTsSuffixTo: [/\.vue$/] }
                },
                { test: /\.css$/, use: [MiniCssExtractPlugin.loader, 'css-loader'] },
                {
                    test: /\.(png|jpe?g|gif|svg|webp)$/i,
                    type: 'asset',
                    parser: { dataUrlCondition: { maxSize: 4096 } }
                }
            ]
        },
        plugins: [
            new VueLoaderPlugin(),
            AutoImport({
                imports: ['vue', 'vue-router', 'pinia'],
                dts: 'src/auto-imports.d.ts'
            }),
            Components({
                resolvers: [VantResolver()],
                dts: 'src/components.d.ts'
            }),
            new HtmlWebpackPlugin({ template: 'public/index.html' }),
            new MiniCssExtractPlugin({
                filename: 'assets/[name].[contenthash:8].css',
                // 按需引入的 Vant 组件样式来自不同 chunk，顺序告警无实际影响
                ignoreOrder: true
            }),
            // 环境变量的编译期替换：与 Vite 的 import.meta.env 是同一种机制
            new webpack.DefinePlugin({
                __ENV__: JSON.stringify({
                    VITE_APP_TITLE: fileEnv.VITE_APP_TITLE || '赴演记 H5',
                    VITE_API_BASE: fileEnv.VITE_API_BASE || '/api',
                    VITE_ASSET_BASE: fileEnv.VITE_ASSET_BASE || 'https://api.show-track.top',
                    VITE_API_TOKEN: apiToken,
                    DEV: !isProd
                }),
                __VUE_OPTIONS_API__: JSON.stringify(true),
                __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
                __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false)
            }),
            ...(isProd
                ? [
                      new CompressionPlugin({
                          filename: '[path][base].gz',
                          algorithm: 'gzip',
                          test: /\.(js|css)$/,
                          threshold: 1024
                      })
                  ]
                : [])
        ],
        optimization: {
            runtimeChunk: 'single',
            splitChunks: {
                cacheGroups: {
                    vant: { test: /[\\/]node_modules[\\/]vant[\\/]/, name: 'vant', chunks: 'all', priority: 30 },
                    axios: { test: /[\\/]node_modules[\\/]axios[\\/]/, name: 'axios', chunks: 'all', priority: 20 },
                    vue: {
                        test: /[\\/]node_modules[\\/](vue|@vue|pinia|vue-router)[\\/]/,
                        name: 'vue',
                        chunks: 'all',
                        priority: 10
                    },
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendor',
                        chunks: 'all',
                        priority: 1,
                        reuseExistingChunk: true
                    }
                }
            },
            minimizer: [
                new TerserPlugin({
                    terserOptions: {
                        compress: { drop_console: true, drop_debugger: true }
                    }
                })
            ]
        },
        devtool: isProd ? false : 'eval-cheap-module-source-map',
        devServer: {
            port: 5185,
            hot: true,
            historyApiFallback: true,
            client: { overlay: true },
            proxy: [
                {
                    context: ['/api'],
                    target: API_TARGET,
                    changeOrigin: true
                }
            ]
        },
        performance: { hints: false },
        stats: 'minimal'
    }
}
