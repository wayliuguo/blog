import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { Order } from '../relations/relations.entity'
import { User } from '../users/entities/user.entity'

// 需要本地 MySQL（见 database.module.ts）；它没有被 AppModule 导入，
// 因为连不上数据库时应用会启动失败。用法本身是完整可复制的。
@Injectable()
export class OrderTransactionService {
    constructor(
        @InjectDataSource()
        private dataSource: DataSource
    ) {}

    async createOrder(userId: number, total: number) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()

        try {
            // 扣减余额
            await queryRunner.manager.decrement(User, { id: userId }, 'balance', total)
            // 创建订单
            await queryRunner.manager.save(Order, { userId, total })

            await queryRunner.commitTransaction()
        } catch (err) {
            await queryRunner.rollbackTransaction()
            throw err
        } finally {
            await queryRunner.release()
        }
    }
}
