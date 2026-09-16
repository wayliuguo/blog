/**
 * Redis 缓存服务
 *
 * 基于 ioredis 的通用缓存操作封装，提供 get/set/del/exists/ttl/ping/warmup 方法。
 *
 * 核心设计：JSON 自动序列化/反序列化
 * - set 时：非字符串值自动 JSON.stringify，字符串值原样存储
 * - get 时：尝试 JSON.parse 解析，若失败则返回原始字符串
 *   这样设计是为了兼容缓存值的多种来源（业务对象 / 外部写入的纯字符串）。
 *
 * 缓存键前缀：所有键自动添加 "nest-template:" 前缀，
 * 避免与其他应用共享 Redis 实例时冲突。前缀在 buildKey 中统一处理，调用方无需关心。
 */
import { Inject, Injectable, Logger } from '@nestjs/common'
import Redis from 'ioredis'

/** Redis 客户端注入令牌（供 RedisModule 使用） */
export const REDIS_CLIENT = 'REDIS_CLIENT'

/** 应用缓存键前缀，用于隔离不同应用的 Redis 键空间 */
const APP_CACHE_PREFIX = 'nest-template:'

@Injectable()
export class RedisService {
    private readonly logger = new Logger(RedisService.name)

    constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

    /** 为缓存键添加应用前缀，避免键冲突 */
    private buildKey(key: string): string {
        return `${APP_CACHE_PREFIX}${key}`
    }

    /**
     * 读取缓存值，自动反序列化 JSON
     *
     * @param key - 缓存键
     * @returns 解析后的值（JSON→对象），或原始字符串（非 JSON 数据），key 不存在时返回 null
     */
    async get<T = string>(key: string): Promise<T | null> {
        const value = await this.redis.get(this.buildKey(key))
        if (value === null) return null
        try {
            return JSON.parse(value) as T
        } catch {
            // JSON 解析失败说明 value 是普通字符串，直接返回原始值
            return value as unknown as T
        }
    }

    /**
     * 写入缓存值，自动序列化非字符串类型
     *
     * @param key - 缓存键
     * @param value - 缓存值，字符串原样存储，其他类型 JSON.stringify 后存储
     * @param ttl - 过期时间（秒），不传则永不过期
     */
    async set(key: string, value: unknown, ttl?: number): Promise<void> {
        // 字符串直接存储，避免二次序列化
        const serialized = typeof value === 'string' ? value : JSON.stringify(value)
        if (ttl !== undefined && ttl !== null) {
            // EX 选项设置过期时间（秒），利用 Redis 原生 TTL 机制
            await this.redis.set(this.buildKey(key), serialized, 'EX', ttl)
        } else {
            await this.redis.set(this.buildKey(key), serialized)
        }
    }

    /** 删除指定缓存键 */
    async del(key: string): Promise<void> {
        await this.redis.del(this.buildKey(key))
    }

    /** 检查缓存键是否存在 */
    async exists(key: string): Promise<boolean> {
        const result = await this.redis.exists(this.buildKey(key))
        return result === 1
    }

    /**
     * 获取缓存键的剩余过期时间
     * @returns 剩余秒数，-1 表示永不过期，-2 表示 key 不存在
     */
    async ttl(key: string): Promise<number> {
        return this.redis.ttl(this.buildKey(key))
    }

    /** 测试连通性（健康检查用），返回 PONG */
    async ping(): Promise<string> {
        return this.redis.ping()
    }

    /**
     * 缓存预热：批量写入一批键值。
     * 使用 pipeline 一次性提交，减少网络往返。
     *
     * @param entries - [key, value, ttl?] 三元组数组，ttl 可选
     */
    async warmup(entries: Array<[string, unknown, number?]> = []): Promise<void> {
        if (entries.length === 0) return
        const pipeline = this.redis.multi()
        for (const [key, value, ttl] of entries) {
            const serialized = typeof value === 'string' ? value : JSON.stringify(value)
            const fullKey = this.buildKey(key)
            if (ttl !== undefined && ttl !== null) {
                pipeline.set(fullKey, serialized, 'EX', ttl)
            } else {
                pipeline.set(fullKey, serialized)
            }
        }
        await pipeline.exec()
        this.logger.log(`缓存预热完成，共写入 ${entries.length} 条`)
    }
}
