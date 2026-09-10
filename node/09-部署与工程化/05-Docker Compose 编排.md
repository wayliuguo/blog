# Docker Compose 编排

> 从"一个容器"到"一组服务"：编排的渐进式演进
> 实战参考：show-track-server 的 `docker-compose.infra.prod.yml` 与 `docker-compose.prod.yml`
> 承上：[Docker 容器化](./04-Docker%20容器化) —— Compose 是「多容器怎么编排」，先会造单容器镜像再看多容器编排
> 启下：[Nginx 反向代理与网关](./06-Nginx%20反向代理与网关) —— 配出反向代理 server，正确传 `X-Forwarded-For` 拿真实客户端 IP，并用 `proxy_read_timeout` + `Upgrade` 头支持 WebSocket 长连接

---

## 为什么需要 Compose

一个后端应用背后至少有三样东西：**应用、MySQL、Redis**。用 `docker run` 一个个启动三个容器要敲几十个参数，且容器间网络、启动顺序、数据持久化全靠人肉管理。

Compose 用一份 YAML 声明"这一组服务长什么样"，一条命令全部拉起。

渐进四步：

| 阶段 | 目标 | 你能获得 |
|------|------|---------|
| ① 认清痛点 | 理解 docker run 的局限 | 知道为什么需要 Compose |
| ② 基础编排 | app + mysql + redis 全栈 | 一个命令跑全套 |
| ③ 生产堆栈分离 | 基础设施与应用拆分 | 部署模式可切换 |
| ④ 生产细节 | 启动顺序、数据卷、网络 | 生产级编排能力 |

---

## ① 认清痛点：docker run 的混乱

```bash
# 要启动三个容器，且要记住它们的网络、端口、数据卷
docker run -d --name mysql -e MYSQL_ROOT_PASSWORD=xxx -v mysql_data:/var/lib/mysql mysql:8
docker run -d --name redis redis:7-alpine
docker run -d --name app -p 3000:3000 -e DB_HOST=mysql -e REDIS_HOST=redis --link mysql --link redis my-app
```

问题：参数记不住、网络手动 link、重启要重新组织命令、无法版本化。

---

## ② 基础编排：一个文件声明全栈

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - REDIS_HOST=redis
    depends_on:
      - mysql
      - redis

  mysql:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: password
      MYSQL_DATABASE: myapp
    volumes:
      - mysql_data:/var/lib/mysql    # 数据持久化：容器删了数据还在
    ports:
      - '3306:3306'

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

volumes:
  mysql_data:    # 声明命名卷
```

```bash
docker-compose up -d      # 后台启动所有服务
docker-compose ps         # 查看状态
docker-compose logs -f    # 查看日志
docker-compose down       # 停止并删除
```

> 容器间用**服务名**（`mysql` / `redis`）互相访问——Compose 自动创建网络并做 DNS 解析，这是和 `docker run` 的本质区别。

---

## ③ 生产堆栈分离：基础设施与应用分开编排

教学示例把 mysql/redis 和 app 写在一起。生产项目（show-track）的做法是**拆成两个 compose 文件**：

| 文件 | 管理什么 | 使用频率 |
|------|---------|---------|
| `docker-compose.infra.prod.yml` | MySQL + Redis（基础设施） | 一次性启动，之后不管 |
| `docker-compose.prod.yml` | migration + 应用 | 日常部署更新 |

为什么拆？

| 原因 | 说明 |
|------|------|
| 生命周期不同 | 数据库几年不动，应用天天更新。绑在一起，每次部署都要确认数据库没被重启 |
| 部署模式可切换 | 数据库可以自建 Docker、可以上云 RDS、可以混合——拆开后只需改 env，不动编排文件 |
| 职责清晰 | "日常操作"文件只管应用，降低误操作数据库的风险 |

### 基础设施编排（infra）

```yaml
# docker-compose.infra.prod.yml（节选，show-track）
services:
  redis:
    image: redis:alpine
    container_name: show-track-redis
    restart: always
    env_file:
      - .env.production
    ports:
      - '${REDIS_PORT}:6379'
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes --appendfsync everysec
    volumes:
      - ./__data/redis/:/data/
  # mysql 服务默认注释掉——如果数据库上云，直接跳过此文件，.env 中 DB_HOST 填云地址
```

要点：

| 配置 | 为什么 |
|------|--------|
| `restart: always` | 数据库挂掉自动拉起，基础设施不因偶发崩溃停机 |
| `--appendonly yes --appendfsync everysec` | Redis 持久化：每秒刷盘，崩溃最多丢 1 秒数据 |
| `./__data/redis/` 挂载 | 数据落到宿主机，容器重建不丢 |
| 云服务时注释掉 mysql | 部署模式切换只改 env，不动代码不动编排 |

---

## ④ 生产细节：启动顺序、数据卷、网络、env

### 4.1 迁移 Job：启动顺序由"依赖"控制

生产发布的关键：**先跑数据库迁移，迁移成功后再启动应用**。show-track 用两个机制实现：

```yaml
# docker-compose.prod.yml（节选，show-track）
services:
  # 一次性迁移 Job：与业务容器共用同一镜像，仅 entrypoint 不同
  migration:
    build:
      context: .
    image: show-track-server:prod
    entrypoint: /usr/local/bin/entrypoint-migration   # 执行 migration 后退出
    restart: 'no'                                     # 一次性任务，不重启
    env_file:
      - .env.production
    networks:
      - show_track_net

  show-track-server:
    build:
      context: .
    image: show-track-server:prod
    container_name: show-track-server
    restart: always
    env_file:
      - .env.production
    ports:
      - '127.0.0.1:${APP_PORT}:${APP_PORT}'           # 只绑定本机，由 Nginx 转发
    volumes:
      - show-track-logs:/app/logs/                    # 日志持久化到命名卷
    depends_on:
      migration:
        condition: service_completed_successfully     # 迁移成功才启动应用
    networks:
      - show_track_net
```

### 4.2 关键配置逐个拆

| 配置 | 作用 |
|------|------|
| `depends_on: condition: service_completed_successfully` | 强依赖：应用等迁移 Job **成功完成**才启动。比默认 `depends_on`（只等容器启动）严格得多 |
| `entrypoint` 覆盖 | 同一镜像、不同入口：一个是迁移任务（跑完退出），一个是业务（常驻） |
| `restart: 'no'` | 一次性 Job 失败就失败，不留死循环重试 |
| `ports: '127.0.0.1:${APP_PORT}:${APP_PORT}'` | 只绑定宿主机回环地址，**不暴露公网**——对外只开 Nginx 一个口 |
| `env_file` | 从 `.env.production` 注入环境变量，密钥不进镜像、不进代码 |
| named volume `show-track-logs` | 日志跨容器生命周期持久化（见 [日志体系](./02-日志体系)） |

### 4.3 网络与跨宿主机访问

```yaml
networks:
  show_track_net:
    name: show_track_net   # 显式命名，多个 compose 文件可共享同一网络

extra_hosts:
  - 'host.docker.internal:host-gateway'   # 容器内通过该域名访问宿主机
```

当 MySQL/Redis 是宿主机上的独立 Docker 容器或云服务时，应用容器要访问它们：

```ini
# .env.production
DB_HOST=host.docker.internal   # 指向宿主机（自建 Docker 数据库）
# 或
DB_HOST=rm-xxx.mysql.rds.aliyuncs.com  # 指向云 RDS
```

> `host.docker.internal` 是 Docker 提供的"宿主机"别名，配合 `extra_hosts` 的 `host-gateway` 在 Linux 上也可用。

---

## 三种部署场景速查

| 场景 | 做法 |
|------|------|
| 全部 Docker（自建 MySQL + Redis） | 先 `infra.prod.yml` 启动基础设施，再 `prod.yml` 部署应用 |
| 混合（MySQL 上云 + Redis 本地） | infra 文件注释掉 mysql，`.env` 里 DB_HOST 填云地址 |
| 全部云服务 | 跳过 infra 文件，`.env` 里全填云地址，只用 `prod.yml` |

```bash
# 场景一：一次性启动基础设施
docker compose -f docker-compose.infra.prod.yml --env-file .env.production up -d

# 日常部署应用
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

---

## 参考

- 上一篇：[Docker 容器化](./04-Docker%20容器化)
- 下一篇：[Nginx 反向代理与网关](./06-Nginx%20反向代理与网关)