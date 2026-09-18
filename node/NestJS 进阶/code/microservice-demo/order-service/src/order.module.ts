import { Module } from '@nestjs/common'
import { ClientsModule, Transport } from '@nestjs/microservices'
import { OrderController } from './order.controller'
import { OrderService } from './order.service'

/**
 * 订单模块
 * 注册订单微服务的控制器与服务提供者
 * 同时通过 ClientsModule 注册 user-service 的客户端代理，
 * 以便创建订单时跨服务调用 user-service 校验用户是否存在
 */
@Module({
    imports: [
        // 注册 user-service 的 TCP 客户端，注入名 USER_SERVICE
        ClientsModule.register([
            {
                name: 'USER_SERVICE',
                transport: Transport.TCP,
                options: {
                    host: '127.0.0.1',
                    port: 3001
                }
            }
        ])
    ],
    controllers: [OrderController],
    providers: [OrderService]
})
export class OrderModule {}
