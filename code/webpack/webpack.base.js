const path = require('path')
const minicss = require('mini-css-extract-plugin')
const minimizer = require('css-minimizer-webpack-plugin')
const htmlwebpackplugin = require('html-webpack-plugin')
const bundleanlyzer = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const webpack = require('webpack')

let pluginArr = [
    new htmlwebpackplugin({
        template: './index.html',
        filename: 'index.html',
        minify: {
            // collapseWhitespace: true,
            // removeComments: true,
            // removeAttributeQuotes: true
        }
    }),
    // 注入到业务代码中,需要用JSON.stringify
    new webpack.DefinePlugin({
        baseURL: JSON.stringify('www.baidu.com')
    })
    // new bundleanlyzer()
]

function hasMiniCss() {
    if (process.env.NODE_ENV === 'production') {
        pluginArr.push(new minimizer())
        pluginArr.push(
            new minicss({
                filename: './css/test.bundle.css'
            })
        )
    }
}

hasMiniCss()

module.exports = {
    entry: './index.js',
    output: {
        // 输出文件
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].[hash:4].bundle.js'
        // publicPath: 'www.baidu.com'
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname)
        },
        extensions: ['.js', '.css', '.json']
    },
    optimization: {
        splitChunks: {
            chunks: 'all',
            minChunks: 1,
            minSize: 0,
            // 单独定义分隔规则（单独打包第三方库）
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    filename: 'vendor.js',
                    chunks: 'all',
                    minChunks: 1
                }
            }
        },
        // 运行时的代码打包成一个文件
        runtimeChunk: {
            name: 'runtime'
        }
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                // use: 'babel-loader'
                use: {
                    loader: 'babel-loader',
                    options: {
                        /* presets: [
                            [
                                '@babel/preset-env',
                                {
                                    targets: {
                                        browsers: ['>1%', 'last 2 versions', 'not ie<=8']
                                    }
                                }
                            ]
                        ] */
                    }
                }
            },
            {
                test: /\.css$/i,
                // use: ['style-loader', 'css-loader']
                use: [process.env.NODE_ENV === 'production' && minicss.loader, 'css-loader', './mycss-loader']
            },
            {
                test: /\.less/,
                use: [process.env.NODE_ENV === 'production' && minicss.loader, 'css-loader', 'less-loader']
            },
            {
                test: /\.(png|svg|jpg|jpeg|gif)$/i,
                type: 'asset',
                parser: {
                    dataUrlCondition: {
                        maxSize: 4 * 1024 // 4kb
                    }
                },
                generator: {
                    filename: './img/[name].[hash][ext]'
                }
            }
            /* {
                test: /\.(png|svg|jpg|jpeg|gif)$/i,
                loader: 'url-loader',
                options: {
                    // 小于 5 kb
                    limit: 5 * 1024,
                    name: '[name].[hash:4].[ext]'
                }
            } */
        ]
    },
    plugins: pluginArr
}
