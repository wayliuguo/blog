/**
 * 数据库连接配置
 *
 * 通过 registerAs 注册为命名空间 'database'，
 * 支持 MySQL 连接，配置项包括主机、端口、数据库名、用户名、密码。
 *
 * 注意：生产环境应关闭 synchronize，统一使用 TypeORM migration 管理表结构变更。
 */
import { ConfigType, registerAs } from '@nestjs/config'

import { env, envNumber } from './configuration'

/** registerAs 注册 token，对应命名空间 'database' */
export const dbRegToken = 'database'

export const DatabaseConfig = registerAs(dbRegToken, () => ({
    /** 数据库主机地址 */
    host: env('DB_HOST', '127.0.0.1'),
    /** 数据库端口 */
    port: envNumber('DB_PORT', 3306),
    /** 数据库名 */
    database: env('DB_NAME', 'myapp'),
    /** 数据库用户名 */
    username: env('DB_USER', 'root'),
    /** 数据库密码 */
    password: env('DB_PASS', 'root')
}))

/** 从 DatabaseConfig 推断出的配置类型 */
export type IDatabaseConfig = ConfigType<typeof DatabaseConfig>
