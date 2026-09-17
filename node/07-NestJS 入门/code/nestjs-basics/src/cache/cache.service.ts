import { Inject, Injectable } from '@nestjs/common'

@Injectable()
export class CacheService {
    private readonly store = new Map<string, { value: any; expireAt: number }>()

    constructor(
        @Inject('CACHE_OPTIONS') private readonly options: { ttl: number } // 动态模块传进来的配置
    ) {}

    set(key: string, value: any): void {
        this.store.set(key, { value, expireAt: Date.now() + this.options.ttl * 1000 })
    }

    get(key: string): any {
        const hit = this.store.get(key)
        if (!hit) return undefined
        if (hit.expireAt < Date.now()) {
            this.store.delete(key)
            return undefined
        }
        return hit.value
    }

    size(): number {
        return this.store.size
    }

    describe(): string {
        return `in-memory cache, ttl=${this.options.ttl}s, size=${this.store.size}`
    }
}
