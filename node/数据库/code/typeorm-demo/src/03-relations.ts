// 03-relations.ts：一对多 / 多对一——关系写在装饰器上，数据库里落成外键列
// @OneToMany 那一侧是"虚拟字段"（库里没有这一列），真正的外键列由 @Column 或 @JoinColumn 建出来
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm'

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    // 一对多：一个用户有多个订单
    @OneToMany(() => Order, order => order.user)
    orders: Order[]
}

@Entity()
export class Order {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    total: number

    // 外键列显式声明出来，事务里 save(Order, { userId, total }) 才有地方落
    @Column({ name: 'user_id' })
    userId: number

    // 多对一：多个订单属于同一个用户
    @ManyToOne(() => User, user => user.orders)
    @JoinColumn({ name: 'user_id' }) // 指定外键列名，不写的话默认叫 userId
    user: User
}

// 说明：@OneToMany 是"反向"声明，删掉它数据库结构完全不变，只是查询时少了 user.orders 这个属性
// 想一次把两边都查出来，就在 find 里带 relations（见 04-n-plus-one.ts 的正面写法）
