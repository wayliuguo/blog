import { DynamicModule, Module } from '@nestjs/common'
import { ConfigService } from '../config/config.service'
import { CacheModuleOptions } from './cache.options'
import { CacheService } from './cache.service'

@Module({})
export class CacheModule {
    // forRoot：同步配置，导入时直接把参数传进来
    static forRoot(options: CacheModuleOptions): DynamicModule {
        return {
            module: CacheModule,
            providers: [
                {
                    provide: 'CACHE_OPTIONS',
                    useValue: options
                },
                CacheService
            ],
            exports: [CacheService]
        }
    }

    // forRootAsync：异步配置，从 ConfigService 里读（ConfigModule 是 @Global，所以这里能直接注入）
    static forRootAsync(): DynamicModule {
        return {
            module: CacheModule,
            providers: [
                {
                    provide: 'CACHE_OPTIONS',
                    useFactory: (config: ConfigService) => ({
                        ttl: Number(config.get('CACHE_TTL') ?? 60)
                    }),
                    inject: [ConfigService]
                },
                CacheService
            ],
            exports: [CacheService]
        }
    }
}
