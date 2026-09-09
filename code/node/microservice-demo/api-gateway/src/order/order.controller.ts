import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { firstValueFrom } from 'rxjs'

/**
 * 订单 HTTP 控制器
 * 对外暴露 RESTful 接口，内部通过 TCP 转发给 order-service
 */
@Controller('orders')
export class OrderController {
    // 注入 order-service 的客户端代理（注入名 ORDER_SERVICE）
    constructor(@Inject('ORDER_SERVICE') private readonly orderClient: ClientProxy) {}

    /**
     * GET /orders/:id
     * 获取订单信息，转发 cmd: 'get_order'
     */
    @Get(':id')
    async getOrder(@Param('id') id: string) {
        const result = await firstValueFrom(this.orderClient.send({ cmd: 'get_order' }, { id: Number(id) }))
        return result
    }

    /**
     * POST /orders
     * 创建订单，转发 cmd: 'create_order'
     * order-service 内部会进一步调用 user-service 校验用户
     */
    @Post()
    async createOrder(@Body() body: { userId: number; product: string; amount: number }) {
        const result = await firstValueFrom(this.orderClient.send({ cmd: 'create_order' }, body))
        return result
    }
}
