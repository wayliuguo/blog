/**
 * 应用根模块
 *
 * 职责：
 * 1. 加载全局配置（ConfigModule）并启用 Joi 校验
 * 2. 注册 TypeORM 数据库连接（forRootAsync）
 * 3. 注册全局 Redis 模块（@Global，提供 RedisService）
 * 4. 聚合业务模块（AuthModule / UsersModule）与 HealthController
 * 5. 注册全局过滤器 / 拦截器 / 守卫
 *
 * 全局组件注册顺序：
 * - APP_FILTER（AllExceptionsFilter）：最先注册，捕获所有层级异常并统一格式化
 * - APP_INTERCEPTOR（TransformInterceptor）：包装响应为 { code, data, message }
 * - APP_GUARD（JwtAuthGuard）：全局 JWT 认证守卫，@Public() 路由跳过
 */
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AppConfig, SecurityConfig, SwaggerConfig, validationSchema } from '~/config/configuration'
import { DatabaseConfig } from '~/config/database.config'
import { RedisConfig } from '~/config/redis.config'
import type { IDatabaseConfig } from '~/config/database.config'
import { AllExceptionsFilter } from '~/common/filters/all-exceptions.filter'
import { TransformInterceptor } from '~/common/interceptors/transform.interceptor'
import { RedisModule } from '~/shared/redis/redis.module'
import { AuthModule } from '~/modules/auth/auth.module'
import { UsersModule } from '~/modules/users/users.module'
import { HealthController } from '~/modules/health/health.controller'
import { JwtAuthGuard } from '~/modules/auth/guards/jwt-auth.guard'

@Module({
    imports: [
        // 全局配置：加载命名空间配置 + Joi 校验
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env'],
            load: [AppConfig, SecurityConfig, SwaggerConfig, DatabaseConfig, RedisConfig],
            validationSchema,
            validationOptions: { allowUnknown: true, abortEarly: false }
        }),

        // 数据库：异步工厂读取 DatabaseConfig，自动加载实体，时区固定东八区
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const cfg = configService.get<IDatabaseConfig>('database')!
                return {
                    type: 'mysql',
                    host: cfg.host,
                    port: cfg.port,
                    database: cfg.database,
                    username: cfg.username,
                    password: cfg.password,
                    // 生产环境关闭 synchronize，统一使用 migration 管理表结构
                    synchronize: false,
                    // 自动加载所有通过 TypeOrmModule.forFeature 注册的实体
                    autoLoadEntities: true,
                    timezone: '+08:00'
                }
            }
        }),

        // 全局 Redis 模块，提供 RedisService
        RedisModule,

        // 业务模块
        AuthModule,
        UsersModule
    ],
    // HealthController 直接在根模块注册，无需独立模块
    controllers: [HealthController],
    providers: [
        // 全局异常过滤器（最先）
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
        // 全局响应包装拦截器
        { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
        // 全局 JWT 认证守卫（@Public 路由跳过）
        { provide: APP_GUARD, useClass: JwtAuthGuard }
    ]
})
export class AppModule {}
