// webpack 深入：一份能跑通所有演示的多入口主配置
// 覆盖 entry(函数多入口) / output / loader / 官方+自定义插件 / splitChunks / runtimeChunk / cache / 断点
// 一份配置用环境变量区分"观测哪个场景"，各自产到同一 dist（下次构建 clean 覆盖）
//
// 场景开关（优先取 webpack-cli 的 --env，其次读 process.env）：
//   （默认）        npm run webpack          → src 多入口（main+pageB）+ txt loader + 拆包（第二/三/四/五/十节）
//   --env prod     npm run webpack:prod      → 常见生产插件组（Html/MiniCss/Terser/Copy），走 prod-app（四节 / 十节）
//   --env drop     npm run webpack:drop      → 挂载 Drop 插件剔除 test/mock，走 pit-app（十二节）
//   --env minihtml npm run webpack:minihtml  → 用 MiniHtmlWebpackPlugin 替代官方 Html，走 spa-app（十一节）
//   --env debug    npm run webpack:debug     → 挂载 DebugProbePlugin，在主干各阶段写 debugger（九节 / 十节断点）
//   --env spa 或 APP=spa-app                 → 入口目录切到 spa-app（多入口模板的可选入口目录）
//   WP_MIN_SIZE / WP_CACHE 仍供 split.cjs / cache.cjs 复用；WEBPACK_DEBUG=1 等价 --env debug
const path = require('node:path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')
const MiniHtmlWebpackPlugin = require('./mini-html-plugin.cjs')
const DropTestAndMockPlugin = require('./drop-test-mock-plugin.cjs')
const DropAssetsPlugin = require('./drop-assets-plugin.cjs')
const { EmitListPlugin, WriteManifestPlugin } = require('./emit-list-plugin.cjs')

const ROOT = __dirname
const usePersistentCache = process.env.WP_CACHE === '1'

// 一个专门在主干钩子上写 debugger 的探针：配合 node --inspect-brk / VS Code 落到每个阶段
class DebugProbePlugin {
    apply(compiler) {
        compiler.hooks.beforeRun.tap('DebugProbe', () => {
            debugger // ① 编译开始前
        })
        compiler.hooks.compile.tap('DebugProbe', params => {
            debugger // ② 即将编译：entry 已由函数解析出来
        })
        compiler.hooks.make.tapAsync('DebugProbe', (compilation, callback) => {
            debugger // ④ 从一个 entry 递归建图
            callback()
        })
        compiler.hooks.finishMake.tapAsync('DebugProbe', (compilation, callback) => {
            debugger // ⑤ 模块图已成、还没分 chunk
            callback()
        })
        compiler.hooks.thisCompilation.tap('DebugProbe', compilation => {
            compilation.hooks.seal.tap('DebugProbe', () => {
                debugger // ⑥ seal：按 splitChunks 分 chunk
            })
            compilation.hooks.processAssets.tap(
                { name: 'DebugProbe', stage: webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT },
                assets => {
                    debugger // ⑦ Object.keys(assets) 就是最终产物清单
                }
            )
        })
        compiler.hooks.emit.tap('DebugProbe', compilation => {
            debugger // ⑧ 写盘前最后窗口
        })
        compiler.hooks.done.tap('DebugProbe', stats => {
            debugger // ⑨ stats 总结本次构建全部结论
        })
    }
}

/** @param {Record<string, any>} env webpack-cli 的 --env（对象）；直接 require 时传 {} 由 process.env 决定 */
module.exports = (env = {}) => {
    const flag = k => env[k] === true || env[k] === '1' || process.env[k] === '1' || process.env[k] === 'true'
    const isProd = flag('prod') || process.env.WP_PROD === '1'
    const isDrop = flag('drop')
    const isMiniHtml = flag('minihtml')
    const isDebug = flag('debug') || process.env.WEBPACK_DEBUG === '1'

    // 入口目录：默认 src 多入口；prod → prod-app；drop → pit-app；minihtml/spa → spa-app
    let srcDir = 'src'
    if (isProd) srcDir = 'prod-app'
    if (isMiniHtml || env.spa || process.env.APP === 'spa-app') srcDir = 'spa-app'
    if (isDrop) srcDir = 'pit-app'

    const cssRule = { test: /\.css$/, use: [MiniCssExtractPlugin.loader, 'css-loader'] }
    const plugins = [
        new EmitListPlugin(),
        new WriteManifestPlugin({ out: 'build-manifest.json' }),
        new webpack.DefinePlugin({ __DEV__: JSON.stringify(false) })
    ]

    // 官方插件组：Html / MiniCss / Terser / Copy，等价旧 webpack.prod.config.cjs 的"常见生产插件配置"
    if (isProd) {
        plugins.push(
            new HtmlWebpackPlugin({ title: 'prod demo' }),
            new MiniCssExtractPlugin({ filename: '[name].[contenthash:8].css' }),
            new CopyPlugin({
                patterns: [{ from: path.join(ROOT, `${srcDir}/static`), to: 'static', noErrorOnMissing: true }]
            })
        )
    }
    // 十一节：用迷你版 MiniHtmlWebpackPlugin 替代官方 HtmlWebpackPlugin
    if (isMiniHtml) {
        plugins.push(
            new MiniCssExtractPlugin({ filename: 'css/[name].[contenthash:8].css' }),
            new MiniHtmlWebpackPlugin({ filename: 'index.html' })
        )
    }
    // 十二节：剔除 test/mock 模块 + 剔除指定产物
    if (isDrop) {
        plugins.push(
            new DropTestAndMockPlugin({ pattern: /\.(test|spec|mock)\.js$/ }),
            new DropAssetsPlugin({ ignore: [/\.map$/, /LICENSE/] })
        )
    }
    // 九节 / 十节断点：默认不挂，只有观测调试场景时写 debugger
    if (isDebug) {
        plugins.push(new DebugProbePlugin())
        // 调试务必关缓存，否则 buildModule 系列因命中缓存而不触发
        env.DEBUG_DISABLE_CACHE = true
    }

    return {
        mode: 'production',
        // 功能入口：构建期动态返回多入口（app+pageB 共享 shared/heavy，演示 common chunk）；用 --env/APP 切入口目录
        entry: () => {
            if (srcDir === 'src') {
                return Promise.resolve({
                    main: path.join(ROOT, 'src/index.js'),
                    pageB: path.join(ROOT, 'src/pageB.js')
                })
            }
            if (srcDir === 'prod-app') {
                return Promise.resolve({ app: path.join(ROOT, 'prod-app/app.js') })
            }
            // spa-app / pit-app 的入口在各自 src 子目录
            return Promise.resolve({ app: path.join(ROOT, srcDir, 'src/index.js') })
        },
        output: {
            path: path.join(ROOT, 'dist'),
            filename: '[name].[contenthash:8].js',
            chunkFilename: '[name].[contenthash:8].chunk.js',
            publicPath: '/',
            clean: true
        },
        resolve: {
            extensions: ['.js', '.json']
        },
        module: {
            rules: [
                {
                    // 自定义扩展名走我们自己的 loader，不需要额外安装 css-loader
                    test: /\.txt$/,
                    use: [{ loader: path.join(ROOT, 'txt-loader.cjs'), options: { exportName: 'text', verbose: true } }]
                },
                // CSS 经 css-loader 解析，再交给 MiniCssExtractPlugin 抽成独立文件
                ...(isProd || isMiniHtml ? [cssRule] : [])
            ]
        },
        optimization: {
            minimize: isProd,
            minimizer: isProd
                ? [new TerserPlugin({ extractComments: false, terserOptions: { format: { comments: false } } })]
                : undefined,
            runtimeChunk: 'single',
            splitChunks: {
                chunks: 'all',
                // 默认有体积下限（20KB），小模块不会被抽出来；用环境变量做对照
                minSize: Number(process.env.WP_MIN_SIZE ?? 20000),
                // cacheGroups：按规则拆包分 chunk。vendors / common 的差异主要看三处：
                // 1. test（命中范围）：vendors 只处理 node_modules，common 面向业务代码
                //    ——"被引用两次以上"是 common 用 minChunks:2 管的；vendors 不设 minChunks
                //    （默认 1），只要命中 node_modules 且体积过 minSize(默认20KB) 就抽进 vendors。
                // 2. priority（优先级，越大越先被选中）：vendors=10 > common=5，
                //    node_modules 模块永远优先归 vendors，不会被业务 common 抢走。
                // 3. reuseExistingChunk：模块若已在某个命中的 chunk 中，直接复用而非再拆一次。
                cacheGroups: {
                    vendor: {
                        test: /node_modules/,
                        name: 'vendors',
                        priority: 10,
                        reuseExistingChunk: true
                    },
                    common: {
                        minChunks: 2,
                        name: 'common',
                        priority: 5,
                        reuseExistingChunk: true
                    }
                }
            }
        },
        plugins,
        cache:
            isDebug || !usePersistentCache
                ? false
                : {
                      type: 'filesystem',
                      cacheDirectory: path.join(ROOT, '.wp-cache'),
                      name: 'demo'
                  },
        performance: { hints: false },
        stats: isDrop
            ? { chunks: true, modules: true, moduleTrace: true, colors: false }
            : { chunks: true, modules: false, colors: false }
    }
}
