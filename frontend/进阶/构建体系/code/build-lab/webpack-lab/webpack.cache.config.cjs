// webpack 深入：给缓存对照用的独立配置（入口由 WP_SRC 指定，避免 loader 干扰）
const path = require('node:path')

const ROOT = __dirname
const srcDir = process.env.WP_SRC || path.join(ROOT, 'src')
const usePersistentCache = process.env.WP_CACHE === '1'

module.exports = {
    mode: 'production',
    entry: path.join(srcDir, 'index.js'),
    module: {
        rules: [
            {
                test: /\.txt$/,
                use: [{ loader: path.join(ROOT, 'txt-loader.cjs'), options: { exportName: 'text' } }]
            }
        ]
    },
    output: {
        path: path.join(ROOT, 'dist-cache'),
        filename: 'out.js',
        clean: true
    },
    optimization: { minimize: false },
    cache: usePersistentCache
        ? {
              type: 'filesystem',
              cacheDirectory: path.join(ROOT, '.wp-cache'),
              name: 'bench'
          }
        : false,
    performance: { hints: false },
    stats: 'errors-only'
}
