// 05-order-transaction.service.ts：事务与 QueryRunner
// QueryRunner 是"手动挡"：连接、开事务、提交、回滚、释放都要自己来，好处是同一个事务里的操作都走它
import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { User } from './01-entity'
import { Order } from './03-relations'

@Injectable()
export class OrderService {
    constructor(
        @InjectDataSource()
        private dataSource: DataSource
    ) {}

    async createOrder(userId: number, total: number) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()

        try {
            // 扣减用户余额
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

// 说明：manager 是绑定在这个 queryRunner 上的实体管理器，业务操作必须都走它，
//       混用 dataSource.manager 就会跑到事务外面去，回滚时那部分改动收不回来
// finally 里的 release() 不能省：连接不还给连接池，池子很快就被占满（和 mysql2 的 conn.release() 一个道理）
