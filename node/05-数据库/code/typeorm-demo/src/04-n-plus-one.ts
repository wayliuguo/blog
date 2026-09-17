// 04-n-plus-one.ts：N+1 问题与它的两种解法
// N+1 = 先查 1 次拿到 N 条主记录，再为每条记录各查 1 次关联表，一共 1 + N 次往返
import { Repository } from 'typeorm'
import { User } from './01-entity'
import { Order } from './03-relations'

// ---------- 反面写法：循环里发查询 ----------
export async function loopQuery(userRepository: Repository<User>, orderRepository: Repository<Order>) {
    // 查询所有用户及其订单
    const users = await userRepository.find() // 1 次查询
    for (const user of users) {
        const orders = await orderRepository.find({
            // N 次查询
            where: { user: { id: user.id } }
        })
        // 这里只把"循环里发查询"的形态摆出来，所以没有使用 orders
        // 真正的问题在于：用户有多少个，就多发多少次 SQL
    }
    // 总共 1 + N 次查询，N 是用户数量
    return users.length
}

// ---------- 正面写法：一次查询把关联带出来 ----------
export async function joinedQuery(userRepository: Repository<User>) {
    // 使用 Relations 一次查询
    const usersWithOrders = await userRepository.find({
        relations: ['orders']
    })

    // 或使用 QueryBuilder
    const usersViaQueryBuilder = await userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.orders', 'order')
        .getMany()

    return { usersWithOrders, usersViaQueryBuilder }
}

// 说明：relations 是把关联数据用一条 SQL（JOIN）拉回来，只发 1 次查询
// QueryBuilder 更灵活：可以加 where / orderBy / 只 select 部分列，也可以配合 .getRawMany() 拿扁平结果
// 想亲眼确认查了几次，把 TypeORM 的 logging: true 打开，控制台会逐条打印 SQL
