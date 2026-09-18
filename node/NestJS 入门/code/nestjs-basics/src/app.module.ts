import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { AppController } from './app.controller'
import { CacheModule } from './cache/cache.module'
import { AllExceptionsFilter } from './common/all-exceptions.filter'
import { AuthGuard } from './common/auth.guard'
import { LoggerMiddleware } from './common/logger.middleware'
import { ParseIdPipe } from './common/parse-id.pipe'
import { RolesGuard } from './common/roles.guard'
import { TransformInterceptor } from './common/transform.interceptor'
import { ConfigModule } from './config/config.module'
import { ConfigService } from './config/config.service'
import { GreetingService } from './greeting/greeting.service'
import { OrdersModule } from './orders/orders.module'
import { UsersModule } from './users/users.module'

@Module({
    imports: [
        ConfigModule, // @Global 模块，Provider 在所有模块里都能注入
        CacheModule.forRoot({ ttl: 60 }), // 动态模块：把配置在导入时传进去
        UsersModule, // 业务模块
        OrdersModule // 业务模块，它自己 imports 了 UsersModule
    ],
    controllers: [AppController],
    providers: [
        GreetingService,
        // useClass：Token 是字符串 'GREETING'，Nest 会 new GreetingService() 后挂到这个 Token 上
        { provide: 'GREETING', useClass: GreetingService },
        // useFactory：需要运行时逻辑（或异步）时用，inject 声明工厂函数的依赖
        {
            provide: 'DB_CONNECTION',
            useFactory: (config: ConfigService) => ({ host: config.get('DB_HOST') }),
            inject: [ConfigService]
        },
        // 全局组件推荐用 Provider 形式注册：可以注入依赖；数组顺序就是执行顺序
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
        { provide: APP_PIPE, useClass: ParseIdPipe },
        { provide: APP_FILTER, useClass: AllExceptionsFilter }
    ]
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(LoggerMiddleware).forRoutes('*') // 对所有路由生效
    }
}
