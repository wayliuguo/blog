# Docker 容器化

> 从"能跑"到"生产级"：Dockerfile 的渐进式演进
> 实战参考：nest-template 四阶段 Dockerfile → show-track-server 五阶段 Dockerfile
> 承上：[PM2 进程管理](./03-PM2%20进程管理) —— 容器化后 PM2 退化为容器内进程管家，先理解它裸机的角色再看容器里的分工
> 启下：[Docker Compose 编排](./05-Docker%20Compose%20编排) —— 用一份 compose 文件把 app + MySQL + Redis 编排起来，并用 `depends_on: condition: service_completed_successfully` 让迁移先于应用启动

---

## 为什么 Docker 是部署的基石

Docker 解决的是部署领域最古老的问题：**"在我机器上是好的"**。本地环境、测试环境、生产环境配置差异导致"环境不一致"——Docker 把应用和它的运行环境一起打包，实现"一次构建，到处运行"。

渐进四步：

| 阶段 | 目标 | 你能获得 |
|------|------|---------|
| ① 核心概念 | 镜像、容器、仓库 | 理解 Docker 心智模型 |
| ② 单阶段 Dockerfile | 先跑起来 | 最小可用 |
| ③ 多阶段构建 | 体积优化 | 镜像从 1GB → 200MB |
| ④ 生产级 Dockerfile | 缓存、安全、健康检查 | 达到生产标准 |

---

## ① 核心概念：镜像 vs 容器

| 概念 | 类比 | 说明 |
|------|------|------|
| 镜像（Image） | 类 / 光盘 | 只读模板，包含应用 + 依赖 + 运行环境 |
| 容器（Container） | 实例 / 光驱 | 镜像的运行实例，可读写 |
| 仓库（Registry） | 应用商店 | 存储分发镜像，如 Docker Hub |

```bash
docker build -t my-app .     # 由 Dockerfile 构建镜像
docker run -d -p 3000:3000 my-app   # 由镜像运行容器
docker ps                    # 查看运行中的容器
docker logs -f <container>   # 查看容器日志
docker exec -it <container> sh      # 进入容器内部
```

> 关键心智：**镜像分层缓存**。Dockerfile 每一条指令生成一个只读层，构建时层不变则复用缓存——所以指令顺序直接影响构建速度（见 ③ ④）。

---

## ② 单阶段 Dockerfile：先跑起来

一个能跑的 NestJS Dockerfile：

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/main"]
```

能跑，但有三个问题：

| 问题 | 后果 |
|------|------|
| 镜像里带着 devDependencies 和源码 | 体积巨大（约 1GB），攻击面大 |
| `npm install` 装全量依赖 | 构建慢 |
| 没有健康检查 | 容器"起来了"但应用没就绪，编排平台无法感知 |

---

## ③ 多阶段构建：让镜像瘦下来

多阶段的核心思想：**构建用的环境，不需要带进运行镜像**。

```dockerfile
# 第一阶段：构建（装全量依赖 + 编译）
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 第二阶段：运行（只复制产物）
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3000
CMD ["node", "dist/main"]
```

| 优化 | 效果 |
|------|------|
| 最终镜像不含源码和 devDependencies | 体积从 ~1GB 降到 ~200MB |
| 构建工具留在第一阶段 | 攻击面减小 |
| 复用基础镜像缓存 | 构建速度提升 |

其他体积优化手段：

```dockerfile
# 1. Alpine 基础镜像：约 120MB vs Ubuntu 约 1GB
FROM node:18-alpine

# 2. .dockerignore（构建上下文瘦身）
node_modules
.git
*.md
.env

# 3. 合并 RUN，减少层数
RUN apk add --no-cache curl && npm ci --only=production && npm cache clean --force
```

---

## ④ 生产级 Dockerfile：show-track 五阶段演进

生产项目的 Dockerfile 不只是"两阶段"，还要解决**构建缓存、时区、非 root 安全、健康检查、特殊依赖**五个问题。我们从 nest-template 的四阶段看起，再演进到 show-track 的五阶段。

### 4.1 阶段拆分：deps → build → prod-deps → runtime

```
deps（固定版本 node + pnpm + pm2 + 时区工具）
  │
  ├── build（装全量依赖 + nest build → dist）
  │
  ├── prod-deps（只装生产依赖，不含 devDependencies）
  │
  └── runtime（从 deps 继承系统工具，从 prod-deps 复制依赖，从 build 复制 dist）
```

### 4.2 阶段 1：deps——固定版本与构建缓存

```dockerfile
# 固定版本号，保证每次构建可复现（node:20.16.0-alpine 而非 node:20-alpine）
FROM node:20.16.0-alpine AS deps

ARG TZ=Asia/Shanghai

# --mount=type=cache：npm 缓存挂载为构建缓存，后续构建直接复用
RUN --mount=type=cache,id=npm,target=/root/.npm \
    apk add --no-cache bash=~5.2 tzdata wget \
    && npm install -g pnpm@9.1.0 pm2 \
    && cp /usr/share/zoneinfo/$TZ /etc/localtime \
    && echo "$TZ" > /etc/timezone

ENV PNPM_HOME="/pnpm" PATH="$PNPM_HOME:$PATH"
WORKDIR /app
```

三个要点：

| 写法 | 为什么 |
|------|--------|
| 固定版本号 `node:20.16.0-alpine` | 可复现构建：今天构建和半年后构建结果一致 |
| `--mount=type=cache` | 依赖缓存挂载，构建缓存不落入镜像层却能被复用 |
| `ARG TZ` + 时区设置 | 日志时间戳、定时任务时区正确（见 [日志体系](./02-日志体系)） |

### 4.3 阶段 2/3：build 与 prod-deps——依赖缓存与最小依赖

```dockerfile
FROM deps AS build
# 只复制依赖描述文件 → 装依赖 → 再复制源码
# 依赖没变时，这层缓存被复用，跳过 pnpm install
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build
```

```dockerfile
FROM deps AS prod-deps
COPY package.json pnpm-lock.yaml ./
# --prod：只装 dependencies，跳过 TypeScript/ESLint/Jest 等 devDependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile
```

| 细节 | 为什么 |
|------|--------|
| 先 `COPY package*.json` 再装依赖 | 依赖描述文件不变 → 缓存命中 → 跳过安装 |
| `--frozen-lockfile` | 严格按 lockfile 安装，所有环境依赖版本一致 |
| `--prod` | 生产镜像不含 devDependencies，体积小、攻击面小 |

### 4.4 阶段 4：runtime——安全、健康检查、元数据

```dockerfile
FROM deps AS runtime

# 构建参数：版本号、构建时间，供 CI/CD 传入
ARG APP_PORT=3000
ARG APP_VERSION=dev
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}"

# 只复制运行必需文件——无源码、无 devDependencies
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
COPY --from=build /app/ecosystem.config.js ./

# 预创建日志目录并授权给非 root 用户
RUN mkdir -p /app/logs && chown -R node:node /app/logs /app/dist

# 安全：以非 root 用户运行（最小权限原则）
USER node

ENV APP_PORT=$APP_PORT
EXPOSE $APP_PORT

# 健康检查：端点级探测，验证应用真正可用（而非仅端口监听）
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:$APP_PORT/api/health || exit 1

ENTRYPOINT ["entrypoint"]
```

生产级要点拆解：

| 写法 | 为什么 |
|------|--------|
| `ARG` + `LABEL` | 版本、构建时间写入镜像元数据，`docker inspect` 可溯源（CI/CD 必备） |
| `chown` 只授权 logs 和 dist | 最小权限：不遍历 node_modules，构建不拖慢 |
| `USER node` | 非 root 运行，符合安全最佳实践 |
| `HEALTHCHECK` 打健康检查接口 | 端点级探测（不是端口探测）：应用真正就绪才健康 |
| `ENTRYPOINT` exec 形式 | entrypoint 成为 PID 1，正确接收 SIGTERM 实现优雅关闭 |

### 4.5 进阶：show-track 的五阶段（特殊依赖独立缓存）

show-track 需要 Playwright 无头浏览器（抓取页面），它的浏览器下载（184MB）每次构建都重下太慢，于是拆出独立阶段：

```dockerfile
# 阶段 4：Playwright 浏览器（独立缓存，只随 pnpm-lock.yaml 失效）
FROM prod-deps AS playwright-browsers
# 国内加速：默认走 npmmirror，官方 CDN 无国内节点
ARG PLAYWRIGHT_DOWNLOAD_HOST=https://cdn.npmmirror.com/binaries/playwright
ENV PLAYWRIGHT_DOWNLOAD_HOST=${PLAYWRIGHT_DOWNLOAD_HOST}

# 先下到缓存目录并挂 cache mount，再拷到 /opt
# cache mount 的内容不进镜像层，所以多一次 cp 换来重建时跳过整个下载
RUN --mount=type=cache,id=playwright,target=/root/.cache/ms-playwright,sharing=locked \
    npx playwright install chromium \
    && mkdir -p /opt/playwright-browsers \
    && cp -a /root/.cache/ms-playwright/. /opt/playwright-browsers/

# runtime 阶段从独立阶段拷贝
COPY --chown=node:node --from=playwright-browsers /opt/playwright-browsers /opt/playwright-browsers
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers
```

这个设计回答了一个经典问题：**"特殊依赖怎么处理才能既减小镜像又加速构建？"**

| 方案 | 问题 |
|------|------|
| 装进 build 阶段 | 浏览器 184MB 进不了 runtime，白装 |
| 直接装进 runtime | 每次构建都重下 184MB |
| 独立阶段 + cache mount | ✅ 浏览器缓存可复用；runtime 只复制一次；锁文件不变则缓存命中 |

---

## 与后续章节的关系

| 下一篇 | 关联点 |
|--------|--------|
| [Docker Compose 编排](./05-Docker%20Compose%20编排) | Dockerfile 是"单容器怎么造"，Compose 是"多容器怎么编排" |
| [生产部署实战](./08-生产部署实战) | 完整部署链路：构建 → 迁移 → 启动 → 健康检查 |

---

## 参考

- 上一篇：[PM2 进程管理](./03-PM2%20进程管理)
- 下一篇：[Docker Compose 编排](./05-Docker%20Compose%20编排)