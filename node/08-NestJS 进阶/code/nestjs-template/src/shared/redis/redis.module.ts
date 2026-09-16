/**
 * Redis 全局模块
 *
 * 提供基于 ioredis 的 Redis 客户端连接和 RedisService。
 *
 * - lazyConnect: true 延迟连接，避免 Redis 不可用时阻塞应用启动
 * - 密码为空字符串时传 undefined，避免 ioredis 将其视为有效密码
 * - 模块标记为 @Global()，使 RedisService 在全应用范围可注入，无需逐模块导入
 * - 模块销毁时（onModuleDestroy）自动断开连接，释放资源
 */
import { Global, Inject, Logger, Module, OnModuleDestroy } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

import { IRedisConfig } from '~/config/redis.config'
import { REDIS_CLIENT, RedisService } from './redis.service'

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: REDIS_CLIENT,
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const cfg = configService.get<IRedisConfig>('redis')!
                const logger = new Logger('RedisModule')
                // 密码脱敏输出，避免敏感信息泄露到日志
                logger.log(
                    `Redis config: host=${cfg.host}, port=${cfg.port}, password=${
                        cfg.password ? '***' : '(empty)'
                    }, db=${cfg.db}`
                )

                return new Redis({
                    host: cfg.host,
                    port: cfg.port,
                    // 密码为空字符串时传 undefined，避免 ioredis 将其视为有效密码
                    password: cfg.password || undefined,
                    db: cfg.db,
                    // 延迟连接：应用启动时不立即建立连接，首次使用时才连接
                    lazyConnect: true
                })
            }
        },
        RedisService
    ],
    exports: [RedisService]
})
export class RedisModule implements OnModuleDestroy {
    constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

    /** 模块销毁时优雅关闭 Redis 连接，等待正在执行的命令完成 */
    async onModuleDestroy() {
        await this.redis.quit()
    }
}
