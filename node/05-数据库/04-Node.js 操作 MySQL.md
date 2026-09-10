# Node.js 操作 MySQL

> 承上：[MySQL 基础](./01-MySQL%20基础) —— 先懂 SQL 与表结构，才能用 Node 正确地连接、查询与建模
> 启下：[MongoDB 入门](./05-MongoDB%20入门) —— 用 Mongoose 定义 Schema 完成文档增删改查，并说清嵌入与引用两种关系建模的取舍

---

## 使用 mysql2 连接数据库

`mysql2` 是 Node.js 连接 MySQL 最流行的库之一，支持 Promise。

### 安装

```bash
npm install mysql2
```

### 创建连接池

```javascript
const mysql = require('mysql2/promise')

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'myapp',
    waitForConnections: true,
    connectionLimit: 10,  // 连接池最大连接数
    queueLimit: 0
})

// 使用
async function getUsers() {
    const [rows] = await pool.query('SELECT * FROM users WHERE age > ?', [18])
    return rows
}
```

> 使用连接池而不是单连接：连接池可以复用连接，避免频繁创建/销毁连接。

### 参数化查询（防止 SQL 注入）

```javascript
// 正确：使用 ? 占位符
const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId])

// 错误：字符串拼接（SQL 注入风险！）
const [rows] = await pool.query(`SELECT * FROM users WHERE id = ${userId}`)
```

## TypeORM 入门

TypeORM 是 NestJS 官方推荐的 ORM（对象关系映射）框架，让开发者用类和装饰器来操作数据库，而不需要写 SQL。

### 什么是 ORM

```
数据库表 users                      TypeORM Entity
┌────┬──────┬──────┐              @Entity()
│ id │ name │ age  │     →        class User {
└────┴──────┴──────┘                  @PrimaryGeneratedColumn()
                                      id: number
                                      @Column()
                                      name: string
                                      @Column()
                                      age: number
                                  }
```

### Entity 定义

```typescript
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity('users')  // 对应数据库的 users 表
export class User {
    @PrimaryGeneratedColumn()  // 自增主键
    id: number

    @Column({ length: 50 })
    name: string

    @Column({ default: 0 })
    age: number

    @Column({ unique: true })
    email: string
}
```

### Repository 模式

```typescript
// 在 Service 中注入 Repository
@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>
    ) {}

    async findAll(): Promise<User[]> {
        return this.userRepository.find()
    }

    async findById(id: number): Promise<User> {
        return this.userRepository.findOneBy({ id })
    }

    async create(data: Partial<User>): Promise<User> {
        const user = this.userRepository.create(data)
        return this.userRepository.save(user)
    }

    async update(id: number, data: Partial<User>): Promise<void> {
        await this.userRepository.update(id, data)
    }

    async delete(id: number): Promise<void> {
        await this.userRepository.delete(id)
    }
}
```

### 实体关系

```typescript
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

    // 多对一：多个订单属于同一个用户
    @ManyToOne(() => User, user => user.orders)
    @JoinColumn({ name: 'user_id' })
    user: User
}
```

## N+1 查询问题

### 问题描述

```typescript
// 查询所有用户及其订单
const users = await userRepository.find()  // 1 次查询
for (const user of users) {
    const orders = await orderRepository.find({  // N 次查询
        where: { user: { id: user.id } }
    })
}
// 总共 1 + N 次查询，N 是用户数量
```

### 解决方案

```typescript
// 使用 Relations 一次查询
const users = await userRepository.find({
    relations: ['orders']
})

// 或使用 QueryBuilder
const users = await userRepository
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.orders', 'order')
    .getMany()
```

## 事务与 QueryRunner

```typescript
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
```

---

## 面试题

### Q1: 什么是 N+1 查询问题，如何解决？

N+1 查询指先查 N 条数据，再循环查每条数据的关联数据，导致 1+N 次查询。解决方法：使用 TypeORM 的 `relations` 或 `QueryBuilder` 的 `leftJoinAndSelect` 一次查出所有数据。

### Q2: ORM 和直接写 SQL 的优缺点？

ORM 优点：开发效率高、类型安全、数据库无关；缺点：复杂查询性能差、黑盒不易调试。直接写 SQL 优点：性能可控、可以优化；缺点：代码量大、易出 SQL 注入。实际项目中一般混合使用。

---

## 配套代码

本篇的可运行示例在仓库 `code/node/mysql-demo`。

| 文件 | 演示什么 |
| --- | --- |
| `db.js` | mysql2 连接池封装 |
| `01-crud.js` | 参数化查询 |
| `02-join.js` | INNER / LEFT JOIN |

运行方式见 `mysql-demo/README.md`。

---

## 参考

- 上一篇：[MySQL 高级实战](./03-MySQL%20高级实战)
- 下一篇：[MongoDB 入门](./05-MongoDB%20入门)