// 01-entity.ts：一张表 ↔ 一个带装饰器的类
// @Entity('users') 指定表名，@PrimaryGeneratedColumn 指定自增主键，@Column 的选项最终变成建表 DDL
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity('users') // 对应数据库的 users 表
export class User {
    @PrimaryGeneratedColumn() // 自增主键
    id: number

    @Column({ length: 50 })
    name: string

    @Column({ default: 0 })
    age: number

    @Column({ unique: true })
    email: string

    @Column({ type: 'int', default: 0 })
    balance: number // 订单事务里要扣的就是这一列，没有它 decrement 会直接落空
}

// 说明：类的字段名就是列名；length / default / unique 这些选项会被 TypeORM 翻译成列定义
// 字段类型靠 emitDecoratorMetadata 反射拿到（number → int、string → varchar、Date → datetime）
// synchronize: true 时 TypeORM 会对比实体与真实表结构并自动改表——生产环境必须关掉，改用 migration
