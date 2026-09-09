/**
 * Redis 缓存配置
 *
 * 通过 registerAs 注册为命名空间 'redis'，
 * 用于缓存、Token 黑名单、Refresh Token 存储等场景。
 * 默认连接本地 6379 端口的 db 0。
 */
import { ConfigType, registerAs } from '@nestjs/config'

import { env, envNumber } from './configuration'

/** registerAs 注册 token，对应命名空间 'redis' */
export const redisRegToken = 'redis'

export const RedisConfig = registerAs(redisRegToken, () => ({
    /** Redis 服务器地址 */
    host: env('REDIS_HOST', '127.0.0.1'),
    /** Redis 端口 */
    port: envNumber('REDIS_PORT', 6379),
    /** Redis 密码（无密码时为空字符串） */
    password: env('REDIS_PASS', ''),
    /** Redis 数据库编号，默认 0 */
    db: 0
}))

/** 从 RedisConfig 推断出的配置类型 */
export type IRedisConfig = ConfigType<typeof RedisConfig>
