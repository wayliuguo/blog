## 两种登录状态保存方式

两种状态登录保存方式：

- 服务端存储的 session + cookie
- 客户端存储的 token

### 服务端存储的 session + cookie

#### 核心原理

- **Session**：服务器为每个登录用户创建的「身份凭证」，存储在服务器端（内存 / 数据库 / Redis），包含用户 ID、登录状态、过期时间等信息，有唯一的 `sessionId`；

- **Cookie**：浏览器端存储的小文本，服务器通过 `Set-Cookie` 响应头，将用户的 `sessionId` 写入浏览器 Cookie；
- **登录流程**：用户登录 → 服务器创建 Session 并生成 `sessionId` → 把 `sessionId` 写入用户 Cookie → 后续请求时浏览器自动携带 `sessionId` Cookie → 服务器通过 `sessionId` 找到对应的 Session，验证用户身份。

#### CSRF

##### 典型场景

以「用户登录电商网站后被 CSRF 攻击」为例：

1. 用户登录 `shop.com`，浏览器保存登录 Cookie；

2. 攻击者诱导用户点击恶意链接 `evil.com/attack`，该页面包含一段隐藏代码：

   ```
   <!-- 恶意页面的隐藏表单，自动提交转账请求到 shop.com -->
   <form action="https://shop.com/api/transfer" method="POST">
     <input type="hidden" name="toAccount" value="attacker123">
     <input type="hidden" name="amount" value="1000">
   </form>
   <script>document.forms[0].submit();</script>
   ```

3. 用户浏览器会自动向 `shop.com` 发送 POST 请求，且携带 `shop.com` 的登录 Cookie；

4. `shop.com` 验证 Cookie 有效，误以为是用户主动转账，执行转账操作。

##### 解决方案

- 服务器为每个用户会话生成一个**唯一的、随机的 CSRF Token**；
- 前端发起请求时，必须携带这个 Token（如放在请求头、表单隐藏字段）；
- 服务器收到请求时，验证 Token 是否有效（是否与用户会话中的 Token 一致）；
- 攻击者无法获取用户的 Token，因此无法构造合法请求。

##### 缺点

1. 如果是多台服务器，需要做分布式session

   - 一种是 session 复制，也就是通过一种机制在各台机器自动复制 session，并且每次修改都同步下。这个有对应的框架来做，比如 java 的 spring-session。
   - 一种方案是把 session 保存在 redis，这样每台服务器都去那里查，只要一台服务器登录了，其他的服务器也就能查到 session，这样就不需要复制了。

2. 跨域

   cookie 为了安全，是做了 domain 的限制的，设置 cookie 的时候会指定一个 domain，只有这个 domain 的请求才会带上这个 cookie。不同的domain，例如有多级域名，则需要设置为顶级域名

### 客户端存储 token

#### jwt 结构

JWT 由 **Header（头部）、Payload（载荷）、Signature（签名）** 三部分组成，用 `.` 分隔，例如：

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwiaWQiOjEsImV4cCI6MTczNTY4OTYwMH0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

##### 1. Header（头部）

- 包含加密算法和 Token 类型，Base64 编码（可解码，非加密）；
- 示例：`{ "alg": "HS256", "typ": "JWT" }`（HS256 是对称加密算法）。

##### 2. Payload（载荷）

- 存储用户身份信息（如 ID、用户名）和过期时间，Base64 编码（可解码，**不要存敏感信息**）；
- 内置字段（推荐使用）：
  - `exp`：过期时间（时间戳，必填，防止 Token 永久有效）；
  - `iss`：签发者；
  - `sub`：主题（用户 ID）。
- 示例：`{ "id": 1, "username": "admin", "exp": 1735689600 }`。

##### 3. Signature（签名）

- 服务器用「Header 指定的算法 + 密钥」对 Header+Payload 加密，生成签名；

- 核心作用：防止 Token 被篡改（一旦篡改，签名验证失败）；

- 计算公式（HS256 算法）：

  ```plaintext
  HMACSHA256(
    base64UrlEncode(Header) + "." + base64UrlEncode(Payload),
    服务器密钥（如 "your-secret-key"）
  )
  ```

#### 流程

![img](66-5.png)

#### 优缺点

1. 优点
   - **无状态**：服务器无需存储 Token，高并发 / 分布式部署更友好；
   - **跨域友好**：Token 放在请求头，突破 Cookie 同源策略限制；
   - **多端兼容**：适配 Web/APP/ 小程序（统一用 Token 验证）；
   - **轻量高效**：字符串格式，传输 / 解析成本低。
2. 缺点
   - **无法主动作废**：Token 签发后，服务器无法主动销毁（除非存黑名单，失去无状态优势）；
   - **Payload 可解码**：不能存敏感信息，仅能存非敏感身份标识；
   - **过期时间固定**：无法动态调整（需刷新 Token 机制补充）；
   - **签名密钥风险**：密钥泄露会导致 Token 被伪造，需定期更换。

## nest 里实现 session 和 jwt

### nest 里实现session

1. 依赖安装

   ```
   npm install express-session @types/express-session
   ```

2. 启用中间件

   ```、
   import { NestFactory } from '@nestjs/core';
   import { AppModule } from './app.module';
   import * as session from 'express-session';
   
   async function bootstrap() {
     const app = await NestFactory.create(AppModule);
   
     app.use(
       session({
         secret: 'secret_str_123456', // 密钥
         resave: false, // 不重新保存会话
         saveUninitialized: false, // 不保存未初始化的会话
       }),
     );
   
     await app.listen(3000);
   }
   bootstrap();
   ```

3. 在 controller 注入 session对象

   ```
   import { Controller, Get, Session } from '@nestjs/common';
   import { AppService } from './app.service';
   import session from 'express-session';
   
   @Controller()
   export class AppController {
     constructor(private readonly appService: AppService) {}
   
     @Get('session')
     getSession(@Session() session): string {
       session.count = session.count ? session.count + 1 : 1;
       return session.count
     }
   }
   ```

4. 测试

   - Request Header 
     - cookie connect.sid=s%3A4QPeTHPpUpOOUseOevlICk0FybsqPg_d.eODpjIc1I5AcRfwPhHZitHo9WoKzu%2B8ArCUu4ccWCVI
   - response 返回数字字段值

### nest 里实现 jwt

- app.module.ts

  ```
  import { Module } from '@nestjs/common';
  import { AppController } from './app.controller';
  import { AppService } from './app.service';
  import { JwtModule } from '@nestjs/jwt';
  
  @Module({
    imports: [
      JwtModule.registerAsync({
        useFactory: () => ({
          secret: 'my-secret',
          signOptions: { expiresIn: '7d' },
        }),
      }),
    ],
    controllers: [AppController],
    providers: [AppService],
  })
  export class AppModule {}
  ```

- app.controller.ts

  ```
  import {
    Controller,
    Get,
    Res,
    Session,
    Headers,
    UnauthorizedException,
  } from '@nestjs/common';
  import { AppService } from './app.service';
  import { JwtService } from '@nestjs/jwt';
  import { Response } from 'express';
  
  @Controller()
  export class AppController {
    constructor(
      private readonly appService: AppService,
      private readonly jwtService: JwtService,
    ) {}
  
    @Get('jwt')
    getJwt(
      @Headers('authorization') authorization: string,
      @Res({ passthrough: true }) response: Response,
    ) {
      if (authorization) {
        try {
          const token = authorization.split(' ')[1];
          const data = this.jwtService.verify(token);
  
          const newToken = this.jwtService.sign({
            count: data.count + 1,
          });
          response.setHeader('token', newToken);
          return data.count + 1;
        } catch (e) {
          console.log(e);
          throw new UnauthorizedException();
        }
      } else {
        const newToken = this.jwtService.sign({
          count: 1,
        });
  
        response.setHeader('token', newToken);
        return 1;
      }
    }
  }
  ```

- 请求

  ```
  // 请求
  http://localhost:3000/jwt
  // header
  authorization Bear xxx
  ```

## mysql + typeorm + jwt 实现登录

### 安装依赖

```
npm install --save @nestjs/typeorm typeorm mysql2
npm install @nestjs/jwt
```

### 实现

#### app.module.ts

```
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { User } from './user/entities/user.entity';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '123456',
      database: 'login_test',
      synchronize: true,
      logging: true,
      entities: [User],
      poolSize: 10,
      connectorPackage: 'mysql2',
    }),
    UserModule,
    JwtModule.register({
      global: true,
      secret: 'secret-str',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

#### user

##### user.entity.ts

```
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    length: 50,
    comment: '用户名',
  })
  username: string;

  @Column({
    length: 50,
    comment: '密码',
  })
  password: string;

  @CreateDateColumn({
    comment: '创建时间',
  })
  createTime: Date;

  @UpdateDateColumn({
    comment: '更新时间',
  })
  updateTime: Date;
}
```

##### user.module.ts

```
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from '..//user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
```

##### user.controller.ts

```
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Res,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { LoginGuard } from 'src/login.guard';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('login')
  async login(
    @Body() user: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const foundUser = await this.userService.login(user);

    if (foundUser) {
      const token = await this.jwtService.signAsync({
        user: {
          id: foundUser.id,
          username: foundUser.username,
        },
      });
      res.setHeader('token', token);
      return 'login success';
    } else {
      return 'login fail';
    }
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return await this.userService.register(registerDto);
  }

  @Get('aaa')
  @UseGuards(LoginGuard)
  aaa() {
    return 'aaa';
  }

  @Get('bbb')
  @UseGuards(LoginGuard)
  bbb() {
    return 'bbb';
  }
}

```

##### user.service.ts

```
import { RegisterDto } from './dto/register.dto';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as crypto from 'crypto';
import { LoginDto } from './dto/login.dto';

function md5(str) {
  const hash = crypto.createHash('md5');
  hash.update(str);
  return hash.digest('hex');
}

@Injectable()
export class UserService {
  private logger = new Logger();

  @InjectRepository(User)
  private userRepository: Repository<User>;

  async login(user: LoginDto) {
    const foundUser = await this.userRepository.findOneBy({
      username: user.username,
    });

    if (!foundUser) {
      throw new HttpException('用户名不存在', 200);
    }
    if (foundUser.password !== md5(user.password)) {
      throw new HttpException('密码错误', 200);
    }
    return foundUser;
  }

  async register(user: RegisterDto) {
    const foundUser = await this.userRepository.findOneBy({
      username: user.username,
    });

    if (foundUser) {
      throw new HttpException('用户已存在', 200);
    }

    const newUser = new User();
    newUser.username = user.username;
    newUser.password = md5(user.password);

    try {
      await this.userRepository.save(newUser);
      return '注册成功';
    } catch (e) {
      this.logger.error(e, UserService);
      return '注册失败';
    }
  }
}
```



## 基于 ACL 实现权限控制

### 概念

- ACL （Access Control List）的方式实现了权限控制，它的特点是用户直接和权限关联。
- 用户和权限是多对多关系，在数据库中会存在用户表、权限表、用户权限中间表。
- 登录的时候，把用户信息查出来，放到 session 或者 jwt 返回。
- 访问接口的时候，在 Guard 里判断是否登录，是否有权限，没有就返回 401，有的话才会继续处理请求。
- 通过 handler 上用 SetMetadata 声明的所需权限的信息，和从数据库中查出来的当前用户的权限做对比，有相应权限才会放行。

### 安装依赖

```
npm install --save @nestjs/typeorm typeorm mysql2
npm install express-session @types/express-session
npm install --save class-validator class-transformer
npm install redis
```

### 实现

#### main.ts

```
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as session from 'express-session';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    session({
      secret: 'secret_str', // cookie 的密钥
      resave: false, // session 没变的时候要不要重新生成 cookie
      saveUninitialized: false, // 没登录不要也创建一个 session
    }),
  );
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(3000);
}
bootstrap();

```

#### app.module.ts

```
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';
import { PermissionModule } from './permission/permission.module';
import { User } from './user/entities/user.entity';
import { Permission } from './permission/entities/permission.entity';
import { AaaModule } from './aaa/aaa.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '123456',
      database: 'acl_test',
      synchronize: true,
      logging: true,
      entities: [User, Permission],
      poolSize: 10,
      connectorPackage: 'mysql2',
    }),
    UserModule,
    PermissionModule,
    AaaModule,
    RedisModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

#### user 模块

- init 实现了数据初始化

  ```
  // user
  id  name password 
  1	东东	aaaaaa	2026-01-11 10:16:29.178726	2026-01-11 10:16:29.178726
  2	光光	bbbbbb	2026-01-11 10:16:29.187785	2026-01-11 10:16:29.187785
  
  // permisssion
  id    name        desc      
  1	create_aaa	新增 aaa	2026-01-11 10:16:29.053174	2026-01-11 10:16:29.053174
  2	update_aaa	修改 aaa	2026-01-11 10:16:29.075471	2026-01-11 10:16:29.075471
  3	remove_aaa	删除 aaa	2026-01-11 10:16:29.085448	2026-01-11 10:16:29.085448
  4	query_aaa	查询 aaa	2026-01-11 10:16:29.093297	2026-01-11 10:16:29.093297
  5	create_bbb	新增 bbb	2026-01-11 10:16:29.103369	2026-01-11 10:16:29.103369
  6	update_bbb	修改 bbb	2026-01-11 10:16:29.110762	2026-01-11 10:16:29.110762
  7	remove_bbb	删除 bbb	2026-01-11 10:16:29.120245	2026-01-11 10:16:29.120245
  8	query_bbb	查询 bbb	2026-01-11 10:16:29.129275	2026-01-11 10:16:29.129275
  
  // user_permission_relation
  userId permissionId
  1	1
  1	2
  1	3
  1	4
  2	5
  ```

- 实现 `login` 用于实现登录能力,登录后在session的user对象上保存

- 实现`findByUsername`用于根据用于名称查找用户信息

- 登录后

  ```
  Response Header
  Set-Cookie	connect.sid=s%3AAIOVSdfrubHtfAc8WEopfz-0D3txg8jg.H8JDGyoCor3upK0Ux2npr%2FlFN9kjarmclWtWk3EBWTY; Path=/; HttpOnly
  ```

##### user.module.ts

```
import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
```

##### user.controller.ts

```
import { Body, Controller, Get, Post, Session } from '@nestjs/common';
import { UserService } from './user.service';
import { LoginUserDto } from './dto/login-user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('init')
  async initData() {
    await this.userService.initData();
    return 'done';
  }

  @Post('login')
  async login(@Body() loginUser: LoginUserDto, @Session() session) {
    const user = await this.userService.login(loginUser);
    session.user = {
      username: user.username,
    };
    return 'success';
  }
}
```

##### user.service.ts

```
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Permission } from 'src/permission/entities/permission.entity';
import { EntityManager } from 'typeorm';
import { User } from './entities/user.entity';
import { LoginUserDto } from './dto/login-user.dto';

@Injectable()
export class UserService {
  @InjectEntityManager()
  entityManager: EntityManager;

  async initData() {
    const permission1 = new Permission();
    permission1.name = 'create_aaa';
    permission1.desc = '新增 aaa';

    const permission2 = new Permission();
    permission2.name = 'update_aaa';
    permission2.desc = '修改 aaa';

    const permission3 = new Permission();
    permission3.name = 'remove_aaa';
    permission3.desc = '删除 aaa';

    const permission4 = new Permission();
    permission4.name = 'query_aaa';
    permission4.desc = '查询 aaa';

    const permission5 = new Permission();
    permission5.name = 'create_bbb';
    permission5.desc = '新增 bbb';

    const permission6 = new Permission();
    permission6.name = 'update_bbb';
    permission6.desc = '修改 bbb';

    const permission7 = new Permission();
    permission7.name = 'remove_bbb';
    permission7.desc = '删除 bbb';

    const permission8 = new Permission();
    permission8.name = 'query_bbb';
    permission8.desc = '查询 bbb';

    const user1 = new User();
    user1.username = '东东';
    user1.password = 'aaaaaa';
    user1.permissions = [permission1, permission2, permission3, permission4];

    const user2 = new User();
    user2.username = '光光';
    user2.password = 'bbbbbb';
    user2.permissions = [permission5, permission6, permission7, permission8];

    await this.entityManager.save([
      permission1,
      permission2,
      permission3,
      permission4,
      permission5,
      permission6,
      permission7,
      permission8,
    ]);
    await this.entityManager.save([user1, user2]);
  }

  async login(loginUserDto: LoginUserDto) {
    const user = await this.entityManager.findOneBy(User, {
      username: loginUserDto.username,
    });
    if (!user) {
      throw new HttpException('用户不存在', HttpStatus.ACCEPTED);
    }
    if (user.password !== loginUserDto.password) {
      throw new HttpException('密码错误', HttpStatus.ACCEPTED);
    }
    return user;
  }

  async findByUsername(username: string) {
    const user = await this.entityManager.findOne(User, {
      where: {
        username,
      },
      relations: {
        permissions: true,
      },
    });
    return user;
  }
}
```

#### permission 模块

```
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Permission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    length: 50,
  })
  name: string;

  @Column({
    length: 100,
    nullable: true,
  })
  desc: string;

  @CreateDateColumn()
  createTime: Date;

  @UpdateDateColumn()
  updateTime: Date;
}
```

#### login.guard.ts

```
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';

declare module 'express-session' {
  interface Session {
    user: {
      username: string;
    };
  }
}

@Injectable()
export class LoginGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request: Request = context.switchToHttp().getRequest();

    if (!request.session?.user) {
      throw new UnauthorizedException('用户未登录');
    }

    return true;
  }
}
```

#### redis 模块

- 通过 `useFactory` 创建提供器，提供`redis`连接对象
- 设置了`redis`相关的操作`redis`工具函数

##### redis.module.ts

```
import { Global, Module } from '@nestjs/common';
import { createClient } from 'redis';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    RedisService,
    {
      provide: 'REDIS_CLIENT',
      async useFactory() {
        const client = createClient({
          socket: {
            host: 'localhost',
            port: 6379,
          },
        });
        await client.connect();
        return client;
      },
    },
  ],
  exports: [RedisService],
})
export class RedisModule {}

```

##### redis.service.ts

```
import { Inject, Injectable } from '@nestjs/common';
import { RedisClientType } from 'redis';

@Injectable()
export class RedisService {
  @Inject('REDIS_CLIENT')
  private redisClient: RedisClientType;

  async listGet(key: string) {
    return await this.redisClient.lRange(key, 0, -1);
  }

  async listSet(key: string, list: Array<string>, ttl?: number) {
    for (let i = 0; i < list.length; i++) {
      await this.redisClient.lPush(key, list[i]);
    }
    if (ttl) {
      await this.redisClient.expire(key, ttl);
    }
  }
}
```

#### permission.guard.ts

- 先在`redis`中获取缓存的值
- 如果没有找到，则查数据或获取，再缓存到redis
- 如果获取到的`permissions`包含`handler`的值，则通过守卫

```
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { UserService } from './user/user.service';
import { RedisService } from './redis/redis.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  @Inject(UserService)
  private userService: UserService;

  @Inject(Reflector)
  private reflector: Reflector;

  @Inject(RedisService)
  private redisService: RedisService;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();

    const user = request.session.user;
    if (!user) {
      throw new UnauthorizedException('用户未登录');
    }

    let permissions = await this.redisService.listGet(
      `user_${user.username}_permissions`,
    );

    if (permissions.length === 0) {
      const foundUser = await this.userService.findByUsername(user.username);
      permissions = foundUser.permissions.map((item) => item.name);

      this.redisService.listSet(
        `user_${user.username}_permissions`,
        permissions,
        60 * 30,
      );
    }

    const permission = this.reflector.get('permission', context.getHandler());

    if (permissions.some((item) => item === permission)) {
      return true;
    } else {
      throw new UnauthorizedException('没有权限访问该接口');
    }
  }
}
```

#### 测试

```
import { Controller, Get, UseGuards, SetMetadata } from '@nestjs/common';
import { AaaService } from './aaa.service';
import { LoginGuard } from 'src/login.guard';
import { PermissionGuard } from 'src/permission.guard';

@Controller('aaa')
export class AaaController {
  constructor(private readonly aaaService: AaaService) {}

  @Get()
  @UseGuards(LoginGuard, PermissionGuard)
  @SetMetadata('permission', 'query_aaa')
  findAll() {
    return this.aaaService.findAll();
  }
}
```

