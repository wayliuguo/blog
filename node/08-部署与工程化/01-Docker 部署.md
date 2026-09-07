# Docker 部署

---

## [初级] Docker 是什么

Docker 是一个容器化技术，将应用及其依赖打包到一个轻量级容器中，保证"一次构建，到处运行"。

### 镜像 vs 容器

| 概念 | 类比 | 说明 |
|------|------|------|
| 镜像（Image） | 类 | 打包了应用和依赖的只读模板 |
| 容器（Container） | 实例 | 镜像的运行实例，可读写 |

## [初级] 编写 Dockerfile

```dockerfile
# 多阶段构建

# 第一阶段：构建
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# 第二阶段：运行
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3000
CMD ["node", "dist/main"]
```

**多阶段构建的好处**：最终镜像只包含运行所需文件，不包含构建工具，镜像体积更小。

## [初级] Docker Compose

`docker-compose.yml` 编排多容器服务：

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
            - mysql_data:/var/lib/mysql
        ports:
            - '3306:3306'

    redis:
        image: redis:7-alpine
        ports:
            - '6379:6379'

volumes:
    mysql_data:
```

### 常用命令

```bash
docker-compose up -d         # 启动所有服务（后台）
docker-compose down          # 停止并删除容器
docker-compose logs -f       # 查看日志
docker-compose ps            # 查看运行状态
```

## [中级] 镜像优化

### 减少镜像大小

```dockerfile
# 1. 使用 Alpine 基础镜像（比 Ubuntu 小 10 倍）
FROM node:18-alpine  # ~120MB vs ~1GB

# 2. 使用 .dockerignore
node_modules
.git
*.md
.env

# 3. 合并 RUN 命令，减少层数
RUN apk add --no-cache curl && \
    npm ci --only=production && \
    npm cache clean --force
```

## [中级] Docker 部署策略

### 蓝绿部署

```
蓝环境（Blue）：当前运行的版本
绿环境（Green）：新版本

1. 部署到绿环境
2. 切换负载均衡器指向绿环境
3. 蓝环境作为回滚备用
```

### 滚动更新

```yaml
# docker-compose 配合 nginx 实现
# 逐个替换容器，保持服务不中断
```

---

## 参考

- 上一篇：[Redis 进阶](../05-Redis/05-Redis%20进阶)
- 下一篇：[PM2 进程管理](./02-PM2%20进程管理)