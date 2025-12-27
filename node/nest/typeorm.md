## 基础概念

`TypeORM` 是一个基于 `TypeScript` 的 `ORM`（对象关系映射）框架，支持多种数据库（`MySQL`、`PostgreSQL`、`SQLite`、`MongoDB` 等）。

- **Entity（实体）**：映射到数据库表的类
- **Repository（仓库）**：用于执行实体操作的抽象层
- **Connection（连接）**：数据库连接
- **Migration（迁移）**：数据库版本控制

资料文档：

- [typeorm 中文文档](https://typeorm.bootcss.com/)
- [类类型](https://typeorm.bootcss.com/entities#%E5%88%97%E7%B1%BB%E5%9E%8B)
- [装饰器参考](https://typeorm.bootcss.com/decorator-reference)
- [EntityManager API](https://typeorm.bootcss.com/entity-manager-api)

## 数据库连接配置

```
// data-soruce.ts

import "reflect-metadata"
import { DataSource } from "typeorm"
import { User } from "./entity/User"

export const AppDataSource = new DataSource({
    type: "mysql", // 数据库类型
    host: "localhost", // 数据库主机
    port: 3306, // 数据库端口
    username: "root", // 数据库用户名
    password: "123456", // 数据库密码
    database: "practice", // 数据库名称
    synchronize: true, // 是否自动同步实体到数据库（同步创建表）
    logging: true, // 是否开启日志记录
    entities: [User], // 实体类数组
    migrations: [], // 迁移文件数组
    subscribers: [], // 订阅者类数组,比如insert、update、remove 前后可以加入一些逻辑
    poolSize: 10, // 数据库连接池大小
    connectorPackage: "mysql2", // 数据库连接器包
    extra: { // 额外的连接参数
        authPlugin: "mysql_native_password", // 适配 Docker MySQL 的认证方式
    },
})
```



## TypeORM 常用核心装饰器（按场景分类）

### 基础标识装饰器（必用）

| 装饰器                      | 作用                                           | 示例                                              |
| --------------------------- | ---------------------------------------------- | ------------------------------------------------- |
| `@Entity()`                 | 标记类为实体，对应数据库表                     | `@Entity('user')` // 显式指定表名（默认类名小写） |
| `@PrimaryGeneratedColumn()` | 主键 + 自增（MySQL 对应 `INT AUTO_INCREMENT`） | `@PrimaryGeneratedColumn()` id: number;           |
| `@PrimaryColumn()`          | 主键（非自增）                                 | `@PrimaryColumn()` cardNo: string;                |

### 字段装饰器（核心：`@Column`）

```
import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity('user') // 对应 user 表
export class User {
  @PrimaryGeneratedColumn()
  id: number; // 主键自增

  @Column() // 基础配置：默认映射为 varchar(255)
  name: string;

  @Column({ 
    name: 'age', // 字段名（默认属性名）
    type: 'int', // 数据库字段类型
    default: 18 // 默认值
  })
  userAge: number; // 属性名≠字段名时，用 name 配置
}
```

### 关联装饰器（多表关联）

| 装饰器          | 作用       | 示例                                                         |
| --------------- | ---------- | ------------------------------------------------------------ |
| `@OneToOne()`   | 一对一关联 | `@OneToOne(() => Profile, profile => profile.user)` profile: Profile; |
| `@OneToMany()`  | 一对多关联 | `@OneToMany(() => Order, order => order.user)` orders: Order[]; |
| `@ManyToOne()`  | 多对一关联 | `@ManyToOne(() => Department, dept => dept.users)` dept: Department; |
| `@ManyToMany()` | 多对多关联 | `@ManyToMany(() => Role, role => role.users)` roles: Role[]; |

### 其他高频装饰器

| `@CreateDateColumn()` | 自动记录创建时间（MySQL 对应 `datetime`） | `@CreateDateColumn()` createTime: Date;                      |
| --------------------- | ----------------------------------------- | ------------------------------------------------------------ |
| `@UpdateDateColumn()` | 自动记录更新时间                          | `@UpdateDateColumn()` updateTime: Date;                      |
| `@DeleteDateColumn()` | 软删除字段（标记删除时间，不真删数据）    | `@DeleteDateColumn()` deleteTime: Date;                      |
| `@Index()`            | 给字段加索引                              | `@Index() @Column()` phone: string;                          |
| `@Unique()`           | 唯一索引                                  | `@Unique(['phone'])` // 单个字段唯一`@Unique(['name', 'age'])` // 联合唯一 |

### `@Column` 装饰器常见配置

| 配置项              | 类型            | 作用                                  | 示例                                                         |
| ------------------- | --------------- | ------------------------------------- | ------------------------------------------------------------ |
| `type`              | string          | 指定数据库字段类型                    | `type: 'varchar'`/`'int'`/`'datetime'`/`'text'`/`'decimal'`  |
| `name`              | string          | 数据库字段名（默认等于属性名）        | `name: 'user_name'`（属性名是 userName）                     |
| `length`            | number          | 字段长度（仅对字符串类型生效）        | `length: 50`（varchar(50)）                                  |
| `nullable`          | boolean         | 是否允许为 NULL（默认 false）         | `nullable: true`                                             |
| `default`           | any             | 字段默认值                            | `default: 0`/`default: 'unknown'`/`default: () => 'CURRENT_TIMESTAMP'` |
| `comment`           | string          | 字段注释（MySQL 支持）                | `comment: '用户手机号'`                                      |
| `unsigned`          | boolean         | 是否无符号（仅数值类型生效）          | `unsigned: true`（int 无符号，只能存正数）                   |
| `precision`/`scale` | number          | 小数精度（仅 decimal 类型）           | `precision: 10, scale: 2`（decimal (10,2)，如金额）          |
| `enum`              | string[]/Object | 枚举类型（MySQL 对应 enum）           | `enum: ['male', 'female']` 或 `enum: UserGender`（枚举对象） |
| `primary`           | boolean         | 是否为主键（等价于 `@PrimaryColumn`） | `primary: true`（不推荐，优先用 `@PrimaryColumn`）           |
| `unique`            | boolean         | 是否唯一索引                          | `unique: true`（单字段唯一，多字段用 `@Unique`）             |
| `select`            | boolean         | 查询时是否默认选中该字段（默认 true） | `select: false`（敏感字段如密码，需手动指定才查询）          |

```
import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

// 定义枚举（可选）
enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}

@Entity('user')
export class User {
  // 主键自增
  @PrimaryGeneratedColumn({ comment: '用户ID' })
  id: number;

  // 字符串字段：非空、长度50、注释
  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    comment: '用户姓名'
  })
  name: string;

  // 数值字段：无符号、默认18、注释
  @Column({
    type: 'int',
    unsigned: true,
    default: 18,
    comment: '用户年龄'
  })
  age: number;

  // 小数字段：金额（10位整数+2位小数）
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0.00,
    comment: '账户余额'
  })
  balance: number;

  // 枚举字段
  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
    comment: '用户状态'
  })
  status: UserStatus;

  // 敏感字段：默认不查询
  @Column({
    type: 'varchar',
    length: 255,
    select: false, // 查询时需手动指定才返回
    comment: '用户密码'
  })
  password: string;

  // 时间字段：默认当前时间
  @Column({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    comment: '创建时间'
  })
  createTime: Date;
}
```

## 基础使用

### 初始化项目

```
npx typeorm@latest init --name typeorm-mysql-test --database mysql

cd typeorm-mysql-test
npm i mysql mysql2 reflect-metadata typeorm
npm i @types/node ts-node typescript -D
```

```
typeorm-mysql-test/
├── src/
│   ├── entity/          # 实体类目录（对应数据库表）
│   │   └── User.ts      # 默认生成的 User 实体
│   ├── migration/       # 迁移文件目录
│   ├── data-source.ts   # 数据库连接配置文件
│   └── index.ts         # 入口文件
├── package.json
└── tsconfig.json		
```

### User Entity

```
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"

@Entity()
export class User {

    @PrimaryGeneratedColumn()
    id: number

    @Column()
    firstName: string

    @Column()
    lastName: string

    @Column()
    age: number
}
```

### CRUD

如果还没有创建表，其会自动创建表。

#### save

- 未指定id，则是新增

```
import { AppDataSource } from "./data-source"
import { User } from "./entity/User"

AppDataSource.initialize().then(async () => {
    const user = new User()
    user.firstName = "Timber"
    user.lastName = "Saw"
    user.age = 25
    await AppDataSource.manager.save(user)
}).catch(error => console.log(error))
```

- 指定了id，则是修改

```
import { AppDataSource } from "./data-source"
import { User } from "./entity/User"

AppDataSource.initialize().then(async () => {
    const user = new User()
    user.id = 1
    user.firstName = "Li"
    user.lastName = "Will"
    user.age = 18
    await AppDataSource.manager.save(user)
}).catch(error => console.log(error))
```

- 批量新增

```
import { AppDataSource } from "./data-source";
import { User } from "./entity/User";

AppDataSource.initialize()
  .then(async () => {
    await AppDataSource.manager.save(User, [
      { firstName: "ccc", lastName: "ccc", age: 21 },
      { firstName: "ddd", lastName: "ddd", age: 22 },
      { firstName: "eee", lastName: "eee", age: 23 },
    ]);
  })
  .catch((error) => console.log(error));
```

- 批量修改

```
import { AppDataSource } from "./data-source";
import { User } from "./entity/User";

AppDataSource.initialize()
  .then(async () => {
    await AppDataSource.manager.save(User, [
      { id: 2, firstName: "ccc111", lastName: "ccc", age: 21 },
      { id: 3, firstName: "ddd222", lastName: "ddd", age: 22 },
      { id: 4, firstName: "eee333", lastName: "eee", age: 23 },
    ]);
  })
  .catch((error) => console.log(error));
```

#### update

```
import { AppDataSource } from "./data-source";
import { User } from "./entity/User";

AppDataSource.initialize()
  .then(async () => {
    // 更新id为1的用户的firstName为"zhang"
    await AppDataSource.manager.update(User,1, { firstName: "zhang"});
    // 更新所有firstName为"zhang"的用户的lastName为"QIAN"
    await AppDataSource.manager.update(User,{firstName: "zhang"}, { lastName: "QIAN"});
  })
  .catch((error) => console.log(error));
```

#### remove&delete

**delete 和 remove 的区别是，delete 直接传 id、而 remove 则是传入 entity 对象**

```
import { AppDataSource } from "./data-source";
import { User } from "./entity/User";

AppDataSource.initialize()
  .then(async () => {
    await AppDataSource.manager.delete(User, 1);
    await AppDataSource.manager.delete(User, [2, 3]);
  })
  .catch((error) => console.log(error));
```

```
import { AppDataSource } from "./data-source";
import { User } from "./entity/User";

AppDataSource.initialize()
  .then(async () => {
    const user = new User();
    user.id = 1;

    await AppDataSource.manager.remove(User, user);
  })
  .catch((error) => console.log(error));
```

#### find

```
import { AppDataSource } from "./data-source";
import { User } from "./entity/User";

AppDataSource.initialize()
  .then(async () => {
    const users = await AppDataSource.manager.find(User);
    console.log(users);
  })
  .catch((error) => console.log(error));
```



### getRepository

具体的方法和 `AppDataSource.manager`是一样的

```
import { AppDataSource } from "./data-source";
import { User } from "./entity/User";

AppDataSource.initialize()
  .then(async () => {
    const users = await AppDataSource.manager.getRepository(User).find();
    console.log(users);
  })
  .catch((error) => console.log(error));
```

### 常见API

[EntityManager API](https://typeorm.bootcss.com/entity-manager-api)

- save：新增或者修改 Entity，如果传入了 id 会先 select 再决定修改还新增
- update：直接修改 Entity，不会先 select
- insert：直接插入 Entity
- delete：删除 Entity，通过 id
- remove：删除 Entity，通过对象
- find：查找多条记录，可以指定 where、order by 等条件
- findBy：查找多条记录，第二个参数直接指定 where 条件，更简便一点
- findAndCount：查找多条记录，并返回总数量
- findByAndCount：根据条件查找多条记录，并返回总数量
- findOne：查找单条记录，可以指定 where、order by 等条件
- findOneBy：查找单条记录，第二个参数直接指定 where 条件，更简便一点
- findOneOrFail：查找失败会抛 EntityNotFoundError 的异常
- query：直接执行 sql 语句
- createQueryBuilder：创建复杂 sql 语句，比如 join 多个 Entity 的查询
- transaction：包裹一层事务的 sql
- getRepository：拿到对单个 Entity 操作的类，方法同 EntityManager

## 一对一映射和关联CRUD

### 一对一映射

1. 新建一个IdCard 表

   ```
   npx typeorm entity:create src/entity/IdCard
   ```

2. IdCard entity

   ```
   import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
   import { User } from "./User";
   
   @Entity({
     name: "id_card",
   })
   export class IdCard {
     @PrimaryGeneratedColumn()
     id: number;
   
     @Column({
       length: 50,
       comment: "身份证号",
     })
     cardName: string;
   
     @JoinColumn()
     @OneToOne(() => User, {
       cascade: true, // 是否级联操作(删除时级联删除关联的user)
       onDelete: "CASCADE", //  "RESTRICT" | "CASCADE" | "SET NULL" | "DEFAULT" | "NO ACTION"
       onUpdate: "CASCADE", //  "RESTRICT" | "CASCADE" | "SET NULL" | "DEFAULT" | "NO ACTION"
     })
     user: User;
   }
   ```

### CRUD

#### save

```
import { AppDataSource } from "./data-source";
import { IdCard } from "./entity/IdCard";
import { User } from "./entity/User";

AppDataSource.initialize()
  .then(async () => {
    const user = new User();
    user.firstName = "san";
    user.lastName = "zhang";
    user.age = 20;

    const idCard = new IdCard();
    idCard.cardName = "222222222222";
    idCard.user = user; // 关联user

    await AppDataSource.manager.save(user);
    await AppDataSource.manager.save(idCard);
  })
  .catch((error) => console.log(error));
```

#### find

```
import { AppDataSource } from "./data-source";
import { IdCard } from "./entity/IdCard";

AppDataSource.initialize()
  .then(async () => {
    // 查找所有IdCard
    // const ics = await AppDataSource.manager.find(IdCard);
    // 查找所有IdCard，关联User
    // const ics = await AppDataSource.manager.find(IdCard, {
    //   relations: {
    //     user: true,
    //   },
    // });
    const ics = await AppDataSource.manager
      .getRepository(IdCard)
      .createQueryBuilder("ic")
      .leftJoinAndSelect("ic.user", "u")
      .getMany();

    console.log(ics);
  })
  .catch((error) => console.log(error));
```



## 一对多映射和关联CRUD

### 一对多映射

- 主表是 department，employee 是从表
- employee 的外键 departmentId 关联了 department的 id

```
// Department.ts
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Employee } from "./Employee";

@Entity()
export class Department {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    length: 50,
  })
  name: string;

  // 第二个参数指定外键列在 employee.department
  @OneToMany(() => Employee, (employee) => employee.department)
  employees: Employee[];
}

// Employee.ts
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Department } from "./Department";

@Entity()
export class Employee {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    length: 50,
  })
  name: string;

  @ManyToOne(() => Department, {
    onDelete: 'CASCADE', // 级联删除，当部门被删除时，关联的员工也会被删除
  })
  department: Department;
}
```

### CRUD

#### save

```
import { Department } from "./entity/Department";
import { Employee } from "./entity/Employee";
import { AppDataSource } from "./data-source";

AppDataSource.initialize()
  .then(async () => {
    const e1 = new Employee();
    e1.name = "张三";

    const e2 = new Employee();
    e2.name = "李四";

    const e3 = new Employee();
    e3.name = "王五";

    const d1 = new Department();
    d1.name = "技术部";
    d1.employees = [e1, e2, e3];

    await AppDataSource.manager.save(Department, d1);
  })
  .catch((error) => console.log(error));
```

#### find

```
import { Department } from "./entity/Department";
import { AppDataSource } from "./data-source";

AppDataSource.initialize()
  .then(async () => {
    // 查找 department 表中的所有记录
    // const deps = await AppDataSource.manager.find(Department);

    // 查找 department 表中的所有记录，同时关联查询 employees 表
    // 方法1：使用 find 方法，指定 relations 参数
    // const deps = await AppDataSource.manager.find(Department, {
    //   relations: {
    //     employees: true,
    //   },
    // });
    
    // 方法2：使用 createQueryBuilder 方法，指定 leftJoinAndSelect 方法
    // const deps = await AppDataSource.manager
    //   .getRepository(Department)
    //   .createQueryBuilder("d")
    //   .leftJoinAndSelect("d.employees", "e")
    //   .getMany();
    const deps = await AppDataSource.manager
      .createQueryBuilder(Department, "d")
      .leftJoinAndSelect("d.employees", "e")
      .getMany();
    console.log(deps);
    console.log(deps.map((item) => item.employees));
  })
  .catch((error) => console.log(error));
```

## 多对多映射和关联CRUD

### 多对多映射

- `@JoinTable()`放在`Article`,负责维护中间表关系，生成的中间表（article_tags_tag）
- 多对多中的表都是主表，中间表才是从表

```
import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Tag } from "./Tag";

@Entity()
export class Article {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    length: 100,
    comment: "文章标题",
  })
  title: string;

  @Column({
    type: "text",
    comment: "文章内容",
  })
  content: string;

  @JoinTable() // 定义中间表
//   @ManyToMany(() => Tag)
  @ManyToMany(() => Tag, (tag) => tag.articles)
  tags: Tag[];
}

```

```
import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from "typeorm";
import { Article } from "./Article";

@Entity()
export class Tag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    length: 100,
  })
  name: string;

  @ManyToMany(() => Article, (article) => article.tags)
  articles: Article[];
}
```

除了会建立`article`、`tag`表，还会创建中间表`article_tags_tag`

### CRUD

#### save

```
import { AppDataSource } from "./data-source";
import { Article } from "./entity/Article";
import { Tag } from "./entity/Tag";

AppDataSource.initialize()
  .then(async () => {
    const a1 = new Article();
    a1.title = "aaaa";
    a1.content = "aaaaaaaaaa";

    const a2 = new Article();
    a2.title = "bbbbbb";
    a2.content = "bbbbbbbbbb";

    const t1 = new Tag();
    t1.name = "ttt1111";

    const t2 = new Tag();
    t2.name = "ttt2222";

    const t3 = new Tag();
    t3.name = "ttt33333";

    a1.tags = [t1, t2];
    a2.tags = [t1, t2, t3];

    const entityManager = AppDataSource.manager;

    await entityManager.save(t1);
    await entityManager.save(t2);
    await entityManager.save(t3);

    await entityManager.save(a1);
    await entityManager.save(a2);
  })
  .catch((error) => console.log(error));
```

#### find

```
import { AppDataSource } from "./data-source";
import { Article } from "./entity/Article";

AppDataSource.initialize()
  .then(async () => {
    const entityManager = AppDataSource.manager;

    // 通过relation 指定关联查询
    // const article = await entityManager.find(Article, {
    //   relations: {
    //     tags: true,
    //   },
    // });

    // 通过queryBuilder来join查询
    // const article = await entityManager
    //   .createQueryBuilder(Article, "a")
    //   .leftJoinAndSelect("a.tags", "t")
    //   .getMany();
    const article = await entityManager
      .getRepository(Article)
      .createQueryBuilder("a")
      .leftJoinAndSelect("a.tags", "t")
      .getMany();

    console.log(article);
    console.log(article.map((item) => item.tags));
  })
  .catch((error) => console.log(error));
```

## 在Nest中集成

