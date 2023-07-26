const webpack = require('webpack')

module.exports = {
    mode: 'production',
    entry: {
        // 把axios单独打包
        vendor: ['axios']
    },
    output: {
        path: __dirname + '/dist',
        filename: '[name].dll.js',
        library: '[name]_library'
    },
    plugins: [
        new webpack.DllPlugin({
            // 这里会输出一个json文件
            path: __dirname + '/[name]-manifest.json',
            name: '[name]_library',
            context: __dirname
        })
    ]
}
