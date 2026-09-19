const config = {
    name: 'mini-bundler',
    version: '1.0.0'
}

export default config

// 具名导出别名：打包器要把它翻译成 exports.defaultConfig = config
export { config as defaultConfig }
