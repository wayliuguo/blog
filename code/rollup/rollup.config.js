const resolve = require('@rollup/plugin-node-resolve')
// const terser = require('@rollup/plugin-terser')

module.exports = {
    input: './app.js',
    output: {
        file: './dist/bundle.js',
        format: 'cjs' // cjs umd amd life
    },
    // plugins: [resolve(), terser()]
    plugins: [resolve()]
}
