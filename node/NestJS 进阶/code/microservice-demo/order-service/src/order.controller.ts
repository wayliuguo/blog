import { Controller } from '@nestjs/common'
import { MessagePattern } from '@nestjs/microservices'
import { OrderService } from './order.service'

/**
 * 订单微服务控制器
 * 通过 @MessagePattern 暴露消息处理方法，供网关或其他微服务通过 TCP 调用
 */
@Controller()
export class OrderController {
    constructor(private readonly orderService: OrderService) {}

    /**
     * 获取订单信息
     * 匹配 cmd: 'get_order'，入参为 { id }
     */
    @MessagePattern({ cmd: 'get_order' })
    getOrder(data: { id: number }) {
        return this.orderService.getOrder(data.id)
    }

    /**
     * 创建订单
     * 匹配 cmd: 'create_order'，入参为 { userId, product, amount }
     * 内部会调用 user-service 校验用户是否存在
     */
    @MessagePattern({ cmd: 'create_order' })
    async createOrder(data: { userId: number; product: string; amount: number }) {
        return this.orderService.createOrder(data.userId, data.product, data.amount)
    }
}
