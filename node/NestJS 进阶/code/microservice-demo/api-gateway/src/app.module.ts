import { Module } from '@nestjs/common'
import { ClientsModule, Transport } from '@nestjs/microservices'
import { UserController } from './user/user.controller'
import { OrderController } from './order/order.controller'

/**
 * 网关模块
 * 通过 ClientsModule 注册两个微服务的 TCP 客户端代理，
 * 网关收到 HTTP 请求后，使用这些代理通过 TCP 转发给对应微服务
 */
@Module({
    imports: [
        ClientsModule.register([
            // 用户微服务客户端（注入名 USER_SERVICE，端口 3001）
            {
                name: 'USER_SERVICE',
                transport: Transport.TCP,
                options: {
                    host: '127.0.0.1',
                    port: 3001
                }
            },
            // 订单微服务客户端（注入名 ORDER_SERVICE，端口 3002）
            {
                name: 'ORDER_SERVICE',
                transport: Transport.TCP,
                options: {
                    host: '127.0.0.1',
                    port: 3002
                }
            }
        ])
    ],
    controllers: [UserController, OrderController]
})
export class AppModule {}
