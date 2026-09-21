// webpack 深入：一份「常见生产插件」配置，用来实测这些插件到底注册了哪些钩子
// 单独一份配置是为了不污染 webpack.config.cjs 那套 demo（那边已有正文引用的产物数字）
// 运行：npm run webpack:hooks -- --prod
const path = require('node:path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')

const ROOT = __dirname

/** @type {import('webpack').Configuration} */
module.exports = {
    mode: 'production',
    devtool: false,
    entry: { app: path.join(ROOT, 'prod-app/app.js') },
    output: {
        path: path.join(ROOT, 'dist-prod'),
        filename: '[name].[contenthash:8].js',
        clean: true
    },
    module: {
        rules: [
            // CSS 必须经 css-loader 解析，MiniCssExtractPlugin 只负责把结果抽成独立文件
            { test: /\.css$/, use: [MiniCssExtractPlugin.loader, 'css-loader'] }
        ]
    },
    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin()]
    },
    plugins: [
        new HtmlWebpackPlugin({ title: 'prod demo' }),
        new MiniCssExtractPlugin({ filename: '[name].[contenthash:8].css' }),
        new CopyPlugin({ patterns: [{ from: path.join(ROOT, 'prod-app/static'), to: 'static' }] })
    ],
    performance: { hints: false },
    stats: { colors: false }
}
