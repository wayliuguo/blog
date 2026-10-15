// webpack 生产配置：单入口 + 手写 loader + 手写 plugin + 代码分割 + 压缩
//
// 两个命令共用这一份配置，差别只在于「有没有被 dev-server 包一层」：
//   npm run build    → webpack        （webpack-cli 注入 env.WEBPACK_BUILD）
//   npm run preview  → webpack serve  （webpack-cli 注入 env.WEBPACK_SERVE）
// 所以不需要任何自定义环境变量，也不需要第二份配置文件。
'use strict'
const path = require('node:path')
const webpack = require('webpack')
const { VueLoaderPlugin } = require('vue-loader')
const MiniHtmlPlugin = require('./plugins/mini-html-plugin.cjs')
const MiniCssExtractPlugin = require('./plugins/mini-css-extract-plugin.cjs')
const MiniTerserPlugin = require('./plugins/mini-terser-plugin.cjs')

const ROOT = __dirname

/** @param {Record<string, any>} env webpack-cli 注入的环境对象 */
module.exports = (env = {}) => {
    // webpack serve 时由 webpack-cli 自动注入；本模块唯一的 serve 场景就是预览
    const isServe = env.WEBPACK_SERVE === true

    const config = {
        mode: 'production',

        // 单入口：生产应用最常见的形态
        entry: { main: path.join(ROOT, 'src/index.js') },

        output: {
            path: path.join(ROOT, 'dist'),
            // 内容变了文件名才变 → CDN 长缓存
            filename: '[name].[contenthash:8].js',
            chunkFilename: '[name].[contenthash:8].chunk.js',
            // asset 模块（本 demo 里的 svg）走这里
            assetModuleFilename: 'assets/[name].[contenthash:8][ext]',
            publicPath: '/',
            clean: true
        },

        resolve: { extensions: ['.js', '.json', '.vue'] },

        module: {
            rules: [
                // 官方 vue-loader 编译 .vue 单文件组件（template / script / style 三块分流）
                { test: /\.vue$/, loader: 'vue-loader' },
                {
                    // 生产链路：css-loader 产出 CSS 字符串，extract-css-loader 登记，插件汇总成独立文件
                    test: /\.css$/,
                    use: [path.join(ROOT, 'loaders/extract-css-loader.cjs'), path.join(ROOT, 'loaders/css-loader.cjs')]
                },
                // webpack 5 内置的 asset module，用来配合 css-loader 的 url() 改写
                { test: /\.svg$/, type: 'asset/resource' }
            ]
        },

        optimization: {
            minimize: true,
            // 用我们手写的压缩插件顶掉 webpack 默认的 TerserPlugin
            minimizer: [new MiniTerserPlugin()],
            // 运行时单独成文件：业务 chunk 的 hash 不因运行时变化而全部失效
            runtimeChunk: 'single',
            splitChunks: {
                chunks: 'all',
                // 默认体积下限 20KB，小模块不会被抽出来
                minSize: 20000,
                cacheGroups: {
                    // 按范围切：命中 node_modules 就抽进 vendors，与「被引用几次」无关
                    vendor: {
                        test: /node_modules/,
                        name: 'vendors',
                        priority: 10,
                        reuseExistingChunk: true
                    },
                    // 按次数切：业务模块被两个以上 chunk 复用才抽
                    common: {
                        minChunks: 2,
                        name: 'common',
                        priority: 5,
                        reuseExistingChunk: true
                    }
                }
            }
        },

        plugins: [
            // Vue 的 esm-bundler 产物把这三个开关留给构建方定义；
            // 定成字面量，Options API / devtools 的死代码才能被压缩器摇掉（Vite 是自动做的）
            new webpack.DefinePlugin({
                __VUE_OPTIONS_API__: false,
                __VUE_PROD_DEVTOOLS__: false,
                __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false
            }),
            // VueLoaderPlugin 会把上面 .css 规则克隆到 .vue 的 <style> 请求上，
            // 所以 SFC 里的样式同样走我们手写的 css-loader / extract-css-loader
            new VueLoaderPlugin(),
            // 顺序即注册顺序；真正的先后由各自的 processAssets stage 决定
            new MiniCssExtractPlugin({ filename: '[name].[contenthash:8].css' }),
            new MiniHtmlPlugin({ filename: 'index.html', title: 'webpack 生产构建 demo' })
        ],

        performance: { hints: false },
        stats: { chunks: true, modules: false, colors: false }
    }

    // 只有 npm run preview 才挂 dev-server
    if (isServe) {
        config.devServer = {
            port: 5180,
            open: true,
            hot: false,
            // 不注入 dev-server 客户端。否则它会往 entry 里塞一段 node_modules 里的代码，
            // 被 splitChunks 抽成 vendors chunk，预览到的就不是纯生产产物了
            client: false,
            // 预览的是真实产物：既写盘也服务，和 npm run build 的输出一致
            devMiddleware: { writeToDisk: true },
            static: { directory: path.join(ROOT, 'dist'), watch: false }
        }
    }

    return config
}
