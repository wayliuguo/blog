/**
 * 配置工具箱：env / envNumber / envBoolean / registerAs / loadConfigs
 *
 * 解决的问题：`process.env.X` 的类型永远是 string | undefined，
 * 默认值、类型转换、命名空间分组这些事每次都要手写一遍。
 * 这里把它们收成 30 行左右的小工具，配置读取就自带转换与默认值。
 */
const dotenv = require('dotenv')

/** 读取字符串，不存在返回默认值 */
function env(key, defaultValue = '') {
    const value = process.env[key]
    return value === undefined ? defaultValue : value
}

/** 读取数字，非法值立刻 throw，避免带病启动 */
function envNumber(key, defaultValue = 0) {
    const value = process.env[key]
    if (value === undefined) return defaultValue
    const num = Number(value)
    if (Number.isNaN(num)) throw new Error(`${key} is not a number`)
    return num
}

/** 读取布尔，true/1/yes（不分大小写）为真，其余为假 */
function envBoolean(key, defaultValue = false) {
    const value = process.env[key]
    if (value === undefined) return defaultValue
    return ['true', '1', 'yes'].includes(value.toLowerCase())
}

/**
 * 注册一个配置命名空间
 * @param {string} token 命名空间标识，读取时用它当 key（如 'app' / 'redis'）
 * @param {Function} factory 返回配置对象；在这里面读环境变量，就能一次转型、一次给默认值
 */
function registerAs(token, factory) {
    return { token, config: factory() }
}

/**
 * 批量装载所有命名空间，等价于 ConfigModule.forRoot({ load: [...] })
 * @returns {Record<string, object>} 如 { app: {...}, smtp: {...} }
 */
function loadConfigs(configs) {
    const out = {}
    for (const { token, config } of configs) out[token] = config
    return out
}

module.exports = { env, envNumber, envBoolean, registerAs, loadConfigs, dotenv }
