/**
 * webpack 没有 import.meta.env：
 * 环境变量由 webpack.DefinePlugin 以 __ENV__ 的形式在编译期替换。
 */
declare const __ENV__: {
    VITE_APP_TITLE: string
    VITE_API_BASE: string
    VITE_ASSET_BASE: string
    VITE_API_TOKEN: string
    DEV: boolean
}
