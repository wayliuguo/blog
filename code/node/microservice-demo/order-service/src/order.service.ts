import { Injectable, Inject } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { firstValueFrom } from 'rxjs'

/**
 * 订单服务
 * 使用内存数组模拟数据存储
 * 创建订单时会通过 TCP 调用 user-service 校验用户是否存在
 */
@Injectable()
export class OrderService {
    // 注入 user-service 的客户端代理（注入名 USER_SERVICE）
    constructor(@Inject('USER_SERVICE') private readonly userClient: ClientProxy) {}

    // 内存模拟的订单数据
    private orders: Array<{
        id: number
        userId: number
        product: string
        amount: number
    }> = [
        { id: 1, userId: 1, product: '商品A', amount: 100 },
        { id: 2, userId: 2, product: '商品B', amount: 200 }
    ]

    // 自增 ID 计数器
    private nextId = 3

    /**
     * 根据 ID 获取订单
     */
    getOrder(id: number) {
        const order = this.orders.find(o => o.id === id)
        if (!order) {
            return { success: false, message: '订单不存在' }
        }
        return { success: true, data: order }
    }

    /**
     * 创建订单
     * 先调用 user-service 校验用户，校验通过后再创建订单
     */
    async createOrder(userId: number, product: string, amount: number) {
        // 通过 TCP 调用 user-service 的 get_user 接口校验用户
        const userResult: { success: boolean; message?: string; data?: any } = await firstValueFrom(
            this.userClient.send({ cmd: 'get_user' }, { id: userId })
        )

        // 用户不存在则拒绝创建订单
        if (!userResult.success) {
            return { success: false, message: '用户不存在，无法创建订单' }
        }

        // 用户校验通过，创建订单
        const order = { id: this.nextId++, userId, product, amount }
        this.orders.push(order)
        return { success: true, data: order }
    }
}
