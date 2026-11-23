# Node.js 操作 MySQL

《Node.js 后端知识体系》「Node.js 操作 MySQL」篇的配套代码。

一句话定位：分两半——**mysql2 原生驱动**（连接池 / 参数化查询 / 连接池观测）+ **TypeORM**（Entity / Repository / 关系映射 / N+1 / QueryRunner）。每个文件就是正文某一段的逐字出处。

> 与 `node/NestJS 入门/code/nestjs-basics` 的关系：那个工程讲"NestJS 怎么把 TypeORM 接进依赖注入"，
> 这里只挑数据库这一篇要用到的知识点，两者互补；本工程沿用同一套写法与依赖版本（typeorm 0.3 + @nestjs/typeorm 10）。

---

## 环境要求

- Node.js 18+
- MySQL 8.0+（`npm run crud` 与 `src/data-source.ts` 的 `main()` 会真连库；其余文件都是结构定义与用法示范）
- 建表：直接用 TypeORM 的 `synchronize: true` 临时建，或把 `MySQL 基础/sql/schema.sql` 拿来建库

---

## 跑起来

```bash
cp .env.example .env      # 填真实账号密码
npm install
npm run crud              # mysql2：连接池 + 参数化查询（需先建库建表造数，见 MySQL 基础/sql）
npm run pool              # mysql2：连接池参数、计数与容量估算（不连库也能跑）
npm run typecheck         # tsc --noEmit：装饰器配置对了，类型就能过
npx ts-node src/data-source.ts   # 连上库会打印 users 条数；连不上会报 ECONNREFUSED
```

想亲眼看到 N+1 多发了几条 SQL：`src/data-source.ts` 里的 `logging` 已打开 `query`，调
`src/n-plus-one.ts` 的两个函数对比控制台打印的 SQL 条数即可。

---

## 文件清单

| 文件 | 演示什么 | 正文对应小节 |
| --- | --- | --- |
| `src/db.js` | mysql2 连接池封装（账号密码走 `.env`）与 `query()` 便捷函数 | 使用 mysql2 连接数据库 · 创建连接池 |
| `src/crud.js` | 参数化查询：`?` 占位符防注入，SELECT / INSERT / UPDATE / DELETE | 使用 mysql2 连接数据库 · 参数化查询 |
| `src/pool-stats.js` | 连接池核心参数、实际生效配置回读、计数与容量估算（不连库也能跑） | 使用 mysql2 连接数据库 · 创建连接池（观测） |
| `src/entity.ts` | `@Entity('users')` / `@PrimaryGeneratedColumn()` / `@Column({ length, default, unique })` | TypeORM 入门 · Entity 定义 |
| `src/users.service.ts` | Repository 模式：`@InjectRepository(User)` 注入，`find` / `findOneBy` / `create`+`save` / `update` / `delete` | TypeORM 入门 · Repository 模式 |
| `src/relations.ts` | `@OneToMany` + `@ManyToOne` + `@JoinColumn({ name: 'user_id' })`，外键列与关系字段并存 | TypeORM 入门 · 实体关系 |
| `src/n-plus-one.ts` | N+1 的反面写法（循环里 `find`）与两种正面写法（`relations` / `QueryBuilder`） | N+1 查询问题（问题描述 / 解决方案） |
| `src/order-transaction.service.ts` | QueryRunner 事务：`connect` → `startTransaction` → `manager.decrement` / `manager.save` → `commit` / `rollback` / `release` | 事务与 QueryRunner |
| `src/data-source.ts` | `DataSource` 配置：`.env` 读账号、`synchronize: false`、`logging: ['error','query']` | 事务与 QueryRunner（配合观察 SQL） |

---

## 预期输出

- 前置：`cp .env.example .env` 填密码并 `npm install`；`npm run crud` 还需先用 `MySQL 基础/sql` 建库建表造数。
- `npm run crud` 打印增删改查四段结果（插入 `affectedRows=1`、拿到 `insertId`），文末解释 `affectedRows` 含义。
- `npm run pool` 不连库也能跑：打印实际生效的连接配置（`acquireTimeout` 会被 mysql2 忽略）、连接数估算公式与池计数（懒加载，此刻为 0）。
- `npm run typecheck`：无输出即通过（`experimentalDecorators` + `emitDecoratorMetadata` 必须开，否则装饰器直接报错）。
- `npx ts-node src/data-source.ts`：连上库时打印 `users 条数 = N`；
  未启动 MySQL 时打印 `连接失败：connect ECONNREFUSED 127.0.0.1:3306` 并以 1 退出。
- 其余文件是"结构定义 + 用法模板"，被应用引用后才有输出；单独运行没有意义，这也是正文里它们只能作代码示例的原因。
