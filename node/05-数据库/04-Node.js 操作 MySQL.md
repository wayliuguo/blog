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

配套脚本 `mysql-demo/src/db.js` 里的连接池是这样建的——账号密码等敏感信息交给 `.env`，并在池之上封装了一个只取行的 `query()` 便捷函数：

> 摘自 `./code/mysql-demo/src/db.js`（运行：`npm run crud`）

```javascript
require('dotenv').config()
const mysql = require('mysql2/promise')
// …
const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mysql_demo',
    charset: 'utf8mb4', // 与库表一致，防止中文/emoji 乱码
    waitForConnections: true, // 连接不够时排队，而不是直接报错
    connectionLimit: 10,
    queueLimit: 0
})
// …
async function query(sql, params) {
    const [rows] = await pool.query(sql, params)
    return rows
}
```

> 使用连接池而不是单连接：连接池可以复用连接，避免频繁创建/销毁连接。

### 参数化查询（防止 SQL 注入）

配套脚本 `01-crud.js` 里每一条 SQL 都走 `?` 占位符——值交给驱动去转义，绝不把变量拼进 SQL 字符串：

> 摘自 `./code/mysql-demo/src/01-crud.js`（运行：`npm run crud`）

```javascript
// 1. 查询：条件 + 排序 + 限制，这是日常最高频的读操作
console.log('=== 1. 条件查询：status = 1 的前 5 个用户 ===')
const users = await query('SELECT id, username, email, balance FROM users WHERE status = 1 ORDER BY id LIMIT 5')
// …
const [upd] = await pool.query('UPDATE users SET balance = balance + 100 WHERE id = ?', [ins.insertId])
```

反面写法是把变量直接拼进 SQL 字符串（`'SELECT * FROM users WHERE id = ' + userId`）——一旦 `userId` 来自用户输入，就等于留了一条现成的注入通道；而用 `?` 占位符时，值只会被当作数据、不会被当作 SQL。

## TypeORM 入门

TypeORM 是 NestJS 官方推荐的 ORM（对象关系映射）框架，让开发者用类和装饰器来操作数据库，而不需要写 SQL。

> TypeORM 部分（Entity / Repository / 关系映射 / N+1 / QueryRunner）的配套工程是仓库里的 `node/05-数据库/code/typeorm-demo`（typeorm 0.3 + @nestjs/typeorm 10，写法与 `node/07-NestJS 入门/code/nestjs-basics` 一致）。它需要连上 MySQL 才有输出，**本机没有 MySQL 服务，因此下面各段均未实跑**；装饰器与类型写法已用 `npm run typecheck`（`tsc --noEmit`）验证通过。

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

下面这段逐字摘自 `typeorm-demo`，`@Entity` 指定表名、`@PrimaryGeneratedColumn` 指定自增主键，其余都是普通列：

> 摘自 `./code/typeorm-demo/src/01-entity.ts`（运行：`npm run typecheck`）

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

    @Column({ type: 'int', default: 0 })
    balance: number  // 订单事务里要扣的就是这一列，没有它 decrement 会直接落空
}
```

（本机无 MySQL 服务，以上脚本未实跑）

### Repository 模式

> 摘自 `./code/typeorm-demo/src/02-users.service.ts`（运行：`npm run typecheck`）

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

拆开看两个容易混的点：`create()` 只把普通对象变成实体实例（**不落库**），`save()` 才真的写库；`findOneBy({ id })` 找不到时返回 `null`，需要报错得自己判空。

（本机无 MySQL 服务，以上脚本未实跑）

### 实体关系

关系写在装饰器上，**外键列由 `@JoinColumn({ name: 'user_id' })` 指定**；`@OneToMany` 那一侧是虚拟字段，库里并没有这一列：

> 摘自 `./code/typeorm-demo/src/03-relations.ts`（运行：`npm run typecheck`）

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

    // 外键列显式声明出来，事务里 save(Order, { userId, total }) 才有地方落
    @Column({ name: 'user_id' })
    userId: number

    // 多对一：多个订单属于同一个用户
    @ManyToOne(() => User, user => user.orders)
    @JoinColumn({ name: 'user_id' })  // 指定外键列名，不写的话默认叫 userId
    user: User
}
```

（本机无 MySQL 服务，以上脚本未实跑）

## N+1 查询问题

### 问题描述

N+1 的"1"是先查主表拿到 N 条记录，"N"是循环里为每条记录再查一次关联表——用户越多，SQL 越多：

> 摘自 `./code/typeorm-demo/src/04-n-plus-one.ts`（运行：`npm run typecheck`）

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

（本机无 MySQL 服务，以上脚本未实跑）

### 解决方案

两种写法都能压成 1 次查询：`relations` 最省事，QueryBuilder 更灵活（能继续加筛选、排序、只取部分列）：

> 摘自 `./code/typeorm-demo/src/04-n-plus-one.ts`（运行：`npm run typecheck`）

```typescript
// 使用 Relations 一次查询
const usersWithOrders = await userRepository.find({
    relations: ['orders']
})

// 或使用 QueryBuilder
const usersViaQueryBuilder = await userRepository
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.orders', 'order')
    .getMany()
```

（本机无 MySQL 服务，以上脚本未实跑）

## 事务与 QueryRunner

QueryRunner 是"手动挡"：连接、开事务、提交/回滚、释放都要自己来——好处是同一个事务里的操作都走它自己的 manager。

> 摘自 `./code/typeorm-demo/src/05-order-transaction.service.ts`（运行：`npm run typecheck`）

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

（本机无 MySQL 服务，以上脚本未实跑）

## 小结

- **mysql2 连接与查询**
  - **连接池**：`createPool` 复用连接，`connectionLimit: 10` 控上限、`queueLimit: 0` 不限队列、`waitForConnections: true` 没空闲连接就排队，比每次新建单连接省下大量握手开销
  - **参数化查询防注入**：用 `?` 占位符传参（`pool.query('... WHERE id = ?', [userId])`），绝不把变量拼进 SQL 字符串
- **TypeORM 的 ORM 建模**
  - **ORM 的定位**：把数据库表映射成带装饰器的 Entity 类，用 Repository 方法操作数据而不手写 SQL
  - **核心装饰器**：`@Entity('users')` 对应表、`@PrimaryGeneratedColumn()` 自增主键、`@Column({ length: 50 })` / `{ default: 0 }` 定列、`@Column({ unique: true })` 加约束
  - **实体关系映射**：`@OneToMany` 与 `@ManyToOne` 配合 `@JoinColumn({ name: 'user_id' })` 表达一对多
- **关联查询与 N+1 问题**
  - **N+1 问题**：循环里逐个查关联表会变成 1+N 次查询，N 是用户数量
  - **解决办法**：用 `relations: ['orders']` 一次带出，或用 QueryBuilder 的 `.leftJoinAndSelect('user.orders', 'order').getMany()` 压成一次
- **QueryRunner 事务**
  - **流程**：`createQueryRunner()` → `connect()` → `startTransaction()` → 业务操作（`manager.decrement` / `manager.save`）→ `commitTransaction()`，出错 `rollbackTransaction()`，`finally` 里必须 `release()`

---

## 配套代码

本篇的可运行示例在仓库 `node/05-数据库/code/mysql-demo`。

| 文件 | 演示什么 |
| --- | --- |
| `./code/mysql-demo/src/db.js` | mysql2 连接池封装（账号密码走 `.env`）与 `query()` 便捷函数 |
| `./code/mysql-demo/src/01-crud.js` | 参数化查询：SELECT / INSERT / UPDATE / DELETE |
| `./code/mysql-demo/src/02-join.js` | INNER / LEFT JOIN 与关联聚合 |
| `./code/typeorm-demo/src/01-entity.ts` | TypeORM Entity 定义与列选项（`@Entity` / `@PrimaryGeneratedColumn` / `@Column`） |
| `./code/typeorm-demo/src/02-users.service.ts` | Repository 模式：注入 `Repository<User>` 并封装 find / create+save / update / delete |
| `./code/typeorm-demo/src/03-relations.ts` | `@OneToMany` / `@ManyToOne` 与 `@JoinColumn({ name: 'user_id' })` 外键列 |
| `./code/typeorm-demo/src/04-n-plus-one.ts` | N+1 的反面写法（循环里查询）与两种正面写法（`relations` / QueryBuilder） |
| `./code/typeorm-demo/src/05-order-transaction.service.ts` | QueryRunner 事务：扣余额 + 建订单的 commit / rollback / release |
| `./code/typeorm-demo/src/data-source.ts` | `DataSource` 配置：`.env` 读账号、`synchronize: false`、`logging` 观察 SQL |

运行方式见 `mysql-demo/README.md`；TypeORM 部分见 `typeorm-demo/README.md`（`npm run typecheck` 校验装饰器与类型，`npx ts-node src/data-source.ts` 需要本地 MySQL）。

---

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[MySQL 高级实战](./03-MySQL%20高级实战)
- 下一篇：[MongoDB 入门](./05-MongoDB%20入门)