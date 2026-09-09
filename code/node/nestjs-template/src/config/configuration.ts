/**
 * 应用配置与环境变量工具
 *
 * 聚合内容：
 * 1. 环境变量读取工具函数 env / envNumber / envBoolean 及环境判断 isDev
 * 2. 应用配置 AppConfig（registerAs 命名空间 'app'）
 * 3. 安全配置 SecurityConfig（命名空间 'security'，JWT 密钥与过期时间）
 * 4. Swagger 配置 SwaggerConfig（命名空间 'swagger'）
 * 5. Joi 环境变量校验 schema（供 ConfigModule.forRoot 的 validationSchema 使用）
 *
 * 使用 @nestjs/config 的 registerAs 注册命名空间配置，
 * 通过 ConfigService.get('app' | 'security' | 'swagger') 获取对应配置对象。
 */
import { ConfigType, registerAs } from '@nestjs/config'
import * as Joi from 'joi'

/** 是否为开发环境（NODE_ENV === 'development'） */
export const isDev = process.env.NODE_ENV === 'development'

/** 环境变量支持的基础类型 */
type BaseType = boolean | number | string | undefined | null

/**
 * 通用环境变量读取格式化函数
 *
 * @param key - 环境变量名
 * @param defaultValue - 默认值（环境变量不存在时返回）
 * @param callback - 可选的格式化回调，将字符串转为目标类型
 * @returns 格式化后的值或默认值
 */
function formatValue<T extends BaseType = string>(key: string, defaultValue: T, callback?: (value: string) => T): T {
    const value: string | undefined = process.env[key]
    // 环境变量不存在时返回默认值
    if (typeof value === 'undefined') return defaultValue
    // 无格式化回调时直接返回原始字符串
    if (!callback) return value as unknown as T
    return callback(value)
}

/** 读取字符串类型环境变量 */
export function env(key: string, defaultValue: string = ''): string {
    return formatValue(key, defaultValue)
}

/** 读取数字类型环境变量，无法转为数字时抛出错误 */
export function envNumber(key: string, defaultValue: number = 0): number {
    return formatValue(key, defaultValue, value => {
        const num = Number(value)
        if (isNaN(num)) {
            throw new Error(`${key} environment variable is not a number`)
        }
        return num
    })
}

/** 读取布尔类型环境变量，支持 true/1/yes（不区分大小写）为真值 */
export function envBoolean(key: string, defaultValue: boolean = false): boolean {
    return formatValue(key, defaultValue, value => ['true', '1', 'yes'].includes(value.toLowerCase()))
}

// ====== 应用核心配置 ======
/** registerAs 注册 token，对应命名空间 'app' */
export const appRegToken = 'app'

export const AppConfig = registerAs(appRegToken, () => ({
    /** 服务监听端口 */
    port: envNumber('PORT', 3000)
}))

/** 从 AppConfig 推断出的配置类型 */
export type IAppConfig = ConfigType<typeof AppConfig>

// ====== 安全（JWT）配置 ======
/** registerAs 注册 token，对应命名空间 'security' */
export const securityRegToken = 'security'

export const SecurityConfig = registerAs(securityRegToken, () => {
    const jwtSecret = env('JWT_SECRET')
    // 启动时校验：JWT 密钥必须通过环境变量配置，不允许使用默认值
    if (!jwtSecret) {
        throw new Error('JWT_SECRET 环境变量未配置，请检查 .env 文件。生产环境必须使用强随机密钥。')
    }
    return {
        /** JWT Access Token 签名密钥 */
        jwtSecret,
        /** Access Token 过期时间，默认 2h */
        jwtExpires: env('JWT_EXPIRES', '2h'),
        /** Refresh Token 过期时间（秒），默认 604800 = 7d */
        refreshExpires: 604800
    }
})

/** 从 SecurityConfig 推断出的配置类型 */
export type ISecurityConfig = ConfigType<typeof SecurityConfig>

// ====== Swagger 配置 ======
/** registerAs 注册 token，对应命名空间 'swagger' */
export const swaggerRegToken = 'swagger'

export const SwaggerConfig = registerAs(swaggerRegToken, () => ({
    /** 是否启用 Swagger 文档（开发环境默认开启） */
    enable: isDev,
    /** Swagger UI 访问路径 */
    path: 'api-docs'
}))

/** 从 SwaggerConfig 推断出的配置类型 */
export type ISwaggerConfig = ConfigType<typeof SwaggerConfig>

/**
 * Joi 环境变量校验 schema
 *
 * 由 ConfigModule.forRoot 的 validationSchema 使用，在应用启动前校验所有环境变量。
 * allowUnknown: true 允许未声明的环境变量存在；abortEarly: false 一次性报告所有错误。
 */
export const validationSchema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
    PORT: Joi.number().default(3000),

    // 数据库
    DB_HOST: Joi.string().default('127.0.0.1'),
    DB_PORT: Joi.number().default(3306),
    DB_NAME: Joi.string().default('myapp'),
    DB_USER: Joi.string().default('root'),
    DB_PASS: Joi.string().allow('').default(''),

    // Redis
    REDIS_HOST: Joi.string().default('127.0.0.1'),
    REDIS_PORT: Joi.number().default(6379),
    REDIS_PASS: Joi.string().allow('').default(''),

    // JWT 安全
    JWT_SECRET: Joi.string().required(),
    JWT_EXPIRES: Joi.string().default('2h')
}).unknown(true)

/** 配置聚合默认导出，供 ConfigModule.forRoot({ load }) 批量加载 */
export default [AppConfig, SecurityConfig, SwaggerConfig]
