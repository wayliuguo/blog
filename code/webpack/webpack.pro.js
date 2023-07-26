const base = require('./webpack.base.js')
const webpack = require('webpack')

const merge = require('webpack-merge').merge

module.exports = merge(base, {
    mode: 'production',
    optimization: {
        usedExports: true
    },
    plugins: [
        new webpack.DllReferencePlugin({
            manifest: require(__dirname + '/vendor-manifest.json')
        })
    ]
})
