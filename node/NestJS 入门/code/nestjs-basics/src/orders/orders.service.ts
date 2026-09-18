import { Inject, Injectable } from '@nestjs/common'
import { UsersService } from '../users/users.service'

export interface OrderItem {
    id: number
    userId: number
    total: number
}

@Injectable()
export class OrdersService {
    private readonly orders: OrderItem[] = []

    constructor(
        private readonly usersService: UsersService, // NestJS 自动注入
        @Inject('CONFIG') private readonly config: { port: number } // 通过 token 注入
    ) {}

    findAll(): OrderItem[] {
        return this.orders
    }

    create(userId: number, total: number): OrderItem {
        const order: OrderItem = { id: Date.now(), userId, total }
        this.orders.push(order)
        return order
    }

    stats(): object {
        return {
            orders: this.orders.length,
            users: this.usersService.findAll().length, // 复用 UsersModule 导出的 UsersService
            port: this.config.port
        }
    }
}
