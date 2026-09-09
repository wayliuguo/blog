/**
 * 健康检查控制器 — 检查数据库与 Redis 连通性。
 *
 * 标记为 @Public()（无需 JWT 认证），供 Kubernetes、负载均衡器、监控系统调用。
 *
 * 不依赖 @nestjs/terminus，直接通过 TypeORM DataSource 执行 SELECT 1、
 * 通过 RedisService 执行 PING，返回各组件状态与延迟。
 *
 * 该控制器在 AppModule 的 controllers 数组中直接注册（无需独立模块）。
 */
import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { DataSource } from 'typeorm'

import { Public } from '~/modules/auth/decorators/public.decorator'
import { RedisService } from '~/shared/redis/redis.service'

/** 单项健康检查结果 */
interface CheckResult {
    status: 'up' | 'down'
    latencyMs?: number
    error?: string
}

@ApiTags('Health - 健康检查')
@Controller('health')
export class HealthController {
    constructor(
        private readonly dataSource: DataSource,
        private readonly redisService: RedisService
    ) {}

    /**
     * 健康检查 — 数据库执行 SELECT 1，Redis 执行 PING。
     * @returns { status: 'ok' | 'error', details: { database, redis } }
     */
    @Public()
    @Get()
    @ApiOperation({ summary: '健康检查（数据库 + Redis）' })
    async check() {
        const details: Record<string, CheckResult> = {}

        // 数据库检查：执行 SELECT 1
        const dbStart = Date.now()
        try {
            await this.dataSource.query('SELECT 1')
            details.database = { status: 'up', latencyMs: Date.now() - dbStart }
        } catch (err) {
            details.database = {
                status: 'down',
                error: (err as Error).message
            }
        }

        // Redis 检查：执行 PING，期望返回 PONG
        const redisStart = Date.now()
        try {
            const pong = await this.redisService.ping()
            details.redis = {
                status: pong === 'PONG' ? 'up' : 'down',
                latencyMs: Date.now() - redisStart
            }
        } catch (err) {
            details.redis = { status: 'down', error: (err as Error).message }
        }

        const allUp = Object.values(details).every(v => v.status === 'up')
        return {
            status: allUp ? 'ok' : 'error',
            details
        }
    }
}
