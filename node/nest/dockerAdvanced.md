## docker compose

### 核心语法

#### 基础结构

一个完整的 `docker-compose.yml` 包含 3 个核心层级：

```
# 必选：指定 Compose 文件版本（需与 Docker 版本匹配，推荐 3.x）
version: '3.8'  

# 必选：定义所有需要启动的服务（容器）
services:  
  # 服务名（自定义，如 web、mysql、redis）
  服务1:  
    # 服务配置（镜像、端口、环境变量等）
    image: 镜像名:版本
    ports:
      - "主机端口:容器端口"
    # 更多配置...
  
  服务2:
    # 服务2配置...

# 可选：定义数据卷（持久化数据）
volumes:  

# 可选：定义自定义网络
networks:  
```

#### 核心配置项（高频使用）

|    配置项     |                    作用                    |                    示例                    |
| :-----------: | :----------------------------------------: | :----------------------------------------: |
|    `image`    |         指定容器使用的镜像（优先）         |             `image: mysql:8.0`             |
|    `build`    | 基于 Dockerfile 构建镜像（无现成镜像时用） | `build: ./backend`（指定 Dockerfile 目录） |
|    `ports`    |           端口映射（主机：容器）           |    `ports: ["8080:8080", "3306:3306"]`     |
| `environment` |              设置容器环境变量              | `environment: MYSQL_ROOT_PASSWORD: 123456` |
|   `volumes`   |      数据卷挂载（持久化 / 共享数据）       |  `volumes: ["mysql-data:/var/lib/mysql"]`  |
|   `restart`   |                容器重启策略                |       `restart: always`（总是重启）        |
| `depends_on`  |    定义服务启动顺序（依赖的服务先启动）    |        `depends_on: [mysql, redis]`        |
|  `networks`   |               加入自定义网络               |          `networks: [my-network]`          |

#### docker-compose 核心命令（实操关键）

将 `docker-compose.yml` 放在项目根目录，打开终端进入该目录，执行以下命令：

|             命令             |              作用              |                      说明                      |
| :--------------------------: | :----------------------------: | :--------------------------------------------: |
|     `docker-compose up`      |          启动所有服务          |          前台运行，终端关闭则容器停止          |
|    `docker-compose up -d`    |        后台启动所有服务        |        推荐！容器在后台运行，不占用终端        |
| `docker-compose up --build`  |         构建并启动服务         | 当 Dockerfile / 代码修改后，重新构建镜像再启动 |
|    `docker-compose down`     |   停止并删除所有容器 + 网络    |       保留数据卷（volumes），数据不丢失        |
|   `docker-compose down -v`   | 停止并删除容器 + 网络 + 数据卷 |         谨慎使用！会删除所有持久化数据         |
|    `docker-compose start`    |        启动已创建的服务        |             仅启动，不重新创建容器             |
|    `docker-compose stop`     |      停止服务（保留容器）      |         容器仍存在，可通过 start 重启          |
|   `docker-compose restart`   |          重启所有服务          |              等价于 stop + start               |
|    `docker-compose logs`     |        查看所有服务日志        |   加 `-f` 实时查看：`docker-compose logs -f`   |
| `docker-compose logs 服务名` |        查看指定服务日志        |        如 `docker-compose logs backend`        |
|     `docker-compose ps`      |        查看所有服务状态        |          显示容器是否运行、端口映射等          |

### 实践

#### app.module.ts

需要用自身ip，不能写localhost了，通过ipconfig 获取ipv4地址

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
      host: '172.21.48.1',
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

#### redis.module.ts

需要用自身ip，不能写localhost了，通过ipconfig 获取ipv4地址

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
            host: '172.21.48.1',
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

#### Dockerfile

```
FROM node:18-alpine as build-stage

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

RUN npm run build

# production stage
FROM node:18-alpine as production-stage

COPY --from=build-stage /app/dist /app
COPY --from=build-stage /app/package.json /app/package.json

WORKDIR /app

RUN npm install --production

EXPOSE 3000

CMD ["node", "/app/main.js"]
```

#### docker-compose.yml

```
services:
  nest-app:
    build:
      context: ./
      dockerfile: ./Dockerfile
    depends_on:
      - mysql-container
      - redis-container
    ports:
      - '3000:3000'
  mysql-container:
    image: mysql
    ports:
      - '3306:3306'
    volumes:
      - E:\mysql-volumn:/var/lib/mysql
    environment:
      MYSQL_DATABASE: acl_test
      MYSQL_ROOT_PASSWORD: 123456
  redis-container:
    image: redis
    ports:
      - '6379:6379'
    volumes:
      - E:\redis-volumn:/data
```

#### 代码地址

[acl-test](https://gitee.com/wayliuhaha/nestExplore/tree/main/acl-test)

## docker 桥接网络

### 创建桥接模式网络

#### 核心语法

```
docker network inspect networkName
```

#### 完整示例

```
# 1. 基础创建（你的原始命令）
docker network create common-network

# 2. 可选：指定子网、网关（自定义网络参数）
docker network create \
  --driver bridge \
  --subnet 172.20.0.0/16 \
  --gateway 172.20.0.1 \
  common-network

# 3. 验证网络是否创建成功
docker network ls | grep common-network

# 4. 查看网络详细信息（包含连接的容器、子网等）
docker network inspect common-network

# 5. 将容器连接到该网络（创建容器时指定）
docker run -d --name my-app --network common-network nginx

# 6. 为已运行的容器连接该网络
docker network connect common-network existing-container

# 7. 移除该网络（确保无容器使用后）
docker network rm common-network
```

##### 关键参数说明

|       参数        |                             作用                             |
| :---------------: | :----------------------------------------------------------: |
| `--driver bridge` | 指定网络驱动（默认就是 `bridge`，可省略），其他常用驱动还有 `overlay`（跨主机）、`host` 等 |
|    `--subnet`     | 指定网络的子网段（如 `172.20.0.0/16`），避免与宿主机 / 其他网络网段冲突 |
|    `--gateway`    |                      指定子网的网关地址                      |

#### 实践

##### 创建桥接网络

```
docker network create common-network
```

##### 运行mysql 容器（连接桥接网络）

```
docker run -d --network common-network -v E:\mysql-volumn:/var/lib/mysql --name mysql-container -e MYSQL_ROOT_PASSWORD=123456 -e MYSQL_DATABASE=acl_test -p 3306:3306  mysql
```

##### 运行 redis 容器（桥接网络）

```
docker run -d --network common-network -v E:\redis-volumn:/data --name redis-container -p 6379:6379 redis
```

##### app.module.ts

host 使用 mysql-container

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
      // host: '172.21.48.1',
      host: 'mysql-container',
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

##### redis.module.ts

host 使用 redis-container

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
            // host: '172.21.48.1',
            host: 'redis-container',
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

##### 打包 dockfile

```
docker build -t acl-container:latest .
```

##### 运行

```
docker run -d --network common-network -p 3000:3000 --name nest-container acl-container:latest
```

### docker compose 使用桥接网络

#### docker-compse.yml

```
services:
  nest-app:
    build:
      context: ./
      dockerfile: ./Dockerfile
    depends_on:
      - mysql-container
      - redis-container
    ports:
      - '3000:3000'
    networks:
      - common-network
  mysql-container:
    image: mysql
    volumes:
      - E:\mysql-volumn:/var/lib/mysql
    environment:
      MYSQL_DATABASE: acl_test
      MYSQL_ROOT_PASSWORD: 123456
    networks:
      - common-network
  redis-container:
    image: redis
    volumes:
      - E:\redis-volumn:/data
    networks:
      - common-network
networks:
  common-network:
    driver: bridge
```

#### 清除已有的 compse 容器

```
PS E:\working\nestExplore\acl-test> docker-compose down
```

#### 运行

```
PS E:\working\nestExplore\acl-test> docker-compose up
```

## 参考资料

[acl-test](https://gitee.com/wayliuhaha/nestExplore/tree/main/acl-test)
