// webpack 深入：一份能跑通的配置，覆盖 entry / output / loader / plugin / splitChunks / cache
// 运行：npm run webpack
const path = require('node:path')
const webpack = require('webpack')
const { EmitListPlugin, WriteManifestPlugin } = require('./emit-list-plugin.cjs')

const ROOT = __dirname
const usePersistentCache = process.env.WP_CACHE === '1'

/** @type {import('webpack').Configuration} */
module.exports = {
    mode: 'production',
    // 关掉压缩，方便观察 tree-shaking 之外的产物结构
    optimization: {
        minimize: false,
        splitChunks: {
            chunks: 'all',
            // 默认有体积下限（20KB），小模块不会被抽出来；用环境变量做对照
            minSize: Number(process.env.WP_MIN_SIZE ?? 20000),
            // cacheGroups：按规则拆包分 chunk。vendors / common 的差异主要看三处：
            // 1. test（命中范围）：vendors 只处理 node_modules，common 面向业务代码
            //    ——“被引用两次以上”是 common 用 minChunks:2 管的；vendors 不设 minChunks
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
    entry: {
        main: path.join(ROOT, 'src/index.js'),
        // 两个入口共享 shared / heavy，用来演示 common chunk 的抽取条件
        pageB: path.join(ROOT, 'src/pageB.js')
    },
    output: {
        path: path.join(ROOT, 'dist'),
        filename: '[name].[contenthash:8].js',
        chunkFilename: '[name].[contenthash:8].chunk.js',
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
            }
        ]
    },
    plugins: [
        new EmitListPlugin(),
        new WriteManifestPlugin({ out: 'build-manifest.json' }),
        // 编译期常量：配合压缩器做死代码删除
        new webpack.DefinePlugin({
            __DEV__: JSON.stringify(false)
        })
    ],
    cache: usePersistentCache
        ? {
              type: 'filesystem',
              cacheDirectory: path.join(ROOT, '.wp-cache'),
              name: 'demo'
          }
        : false,
    performance: { hints: false },
    stats: { chunks: true, modules: false, colors: false }
}
