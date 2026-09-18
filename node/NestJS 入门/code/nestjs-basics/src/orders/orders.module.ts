import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { CacheModule } from '../cache/cache.module'
import { logger } from '../common/logger.middleware'
import { UsersModule } from '../users/users.module'
import { OrdersController } from './orders.controller'
import { OrdersService } from './orders.service'

@Module({
    imports: [UsersModule, CacheModule], // 导入其他模块
    controllers: [OrdersController], // 该模块下的控制器
    providers: [OrdersService], // 该模块下的服务/提供器
    exports: [OrdersService] // 导出给其他模块使用的提供器
})
export class OrdersModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(logger) // 直接传函数引用，不需要注册 provider
            .forRoutes('orders')
    }
}
