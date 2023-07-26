const base = require('./webpack.base.js')

const merge = require('webpack-merge').merge

module.exports = merge(base, {
    mode: 'development',
    devtool: 'source-map',
    devServer: {
        port: 1000,
        hot: true,
        proxy: {
            '/': {
                target: 'http://localhost:3000'
            }
        }
    }
})
