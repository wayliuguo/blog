const path = require('path')
const minicss = require('mini-css-extract-plugin')
const minimizer = require('css-minimizer-webpack-plugin')
const htmlwebpackplugin = require('html-webpack-plugin')

module.exports = {
    mode: 'development',
    entry: './index.js',
    output: {
        // 输出文件
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].[hash:4].bundle.js'
    },
    optimization: {
        // splitChunks: {
        //     chunks: 'all',
        //     minChunks: 1,
        //     maxSize: 0
        // }
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
                use: [minicss.loader, 'css-loader', './mycss-loader']
            },
            {
                test: /\.less/,
                use: [minicss.loader, 'css-loader', 'less-loader']
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
                    filename: '[name].[hash][ext]'
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
    plugins: [
        new minicss({
            filename: 'test.bundle.css'
        }),
        new minimizer(),
        new htmlwebpackplugin({
            template: './index.html',
            filename: 'index.html',
            minify: {
                // collapseWhitespace: true,
                // removeComments: true,
                // removeAttributeQuotes: true
            }
        })
    ]
}
