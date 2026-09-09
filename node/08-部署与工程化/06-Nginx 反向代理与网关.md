# Nginx 反向代理与网关

> 从"转发请求"到"入口架构"：Nginx 的渐进式演进
> 实战参考：nest-template 生产部署架构

---

## 为什么生产环境前面要加一层 Nginx

你部署完应用，服务跑在 `3000` 端口，然后呢？直接把 `3000` 暴露给公网会有四个问题：没有域名路由、无法多服务共享 80/443、没有 SSL、没有负载均衡。

Nginx 作为**入口网关**解决这一切——用户只跟 Nginx 打交道，Nginx 把请求分发给背后的服务。

渐进四步：

| 阶段 | 目标 | 你能获得 |
|------|------|---------|
| ① 概念 | 正向代理 vs 反向代理 | 理解 Nginx 的角色 |
| ② 反向代理 | 基本转发 + 请求头 | 能搭起第一层代理 |
| ③ 进阶配置 | WebSocket、负载均衡、动静分离、Gzip | 覆盖生产常见场景 |
| ④ 架构协作 | Nginx + PM2 + Docker 的分工与架构演进 | 具备架构设计能力 |

---

## ① 概念：正向代理 vs 反向代理

| 类型 | 代理谁 | 例子 |
|------|--------|------|
| 正向代理 | 代理**客户端**访问外部资源 | 翻墙、公司内网出口 |
| 反向代理 | 代理**服务端**接收请求 | 网关、负载均衡 |

```
正向代理： 客户端 → 代理 → 互联网（代理帮客户端访问）
反向代理： 用户 → Nginx → 后端服务（代理帮后端收请求）
```

> 后端领域说的是**反向代理**：Nginx 收下所有请求，按规则转发给内部服务，并隐藏内部网络结构。

---

## ② 反向代理：基本配置

```nginx
server {
    listen 80;
    server_name example.com;

    # 把 /api/ 开头的请求转发给后端
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

三个关键请求头：

| 请求头 | 作用 |
|--------|------|
| `Host $host` | 保留原始域名，后端才能正确生成链接 |
| `X-Real-IP` | 客户端真实 IP（否则后端只看到 Nginx 的 IP） |
| `X-Forwarded-For` | 转发链上的所有 IP，供后端日志/风控分析 |

> 装了 Nginx 后，**NestJS 的日志和限流看到的是代理 IP**——记得在应用层解析 `X-Forwarded-For` 拿真实 IP。

---

## ③ 进阶配置：覆盖生产常见场景

### 3.1 WebSocket 代理（实时通信必备）

```nginx
location /ws/ {
    proxy_pass http://localhost:3002/;
    proxy_read_timeout 300s;              # 长连接不超时
    proxy_send_timeout 300s;
    proxy_set_header Upgrade $http_upgrade;    # 升级协议为 WebSocket
    proxy_set_header Connection "upgrade";
    proxy_http_version 1.1;               # HTTP/1.1 才支持长连接
}
```

> 对应 [WebSocket 实时通信](../07-NestJS%20进阶/07-WebSocket%20实时通信)：没有这段配置，前端 WebSocket 会握手失败。

### 3.2 动静分离 + Gzip（静态资源）

```nginx
# 前端 SPA：找不到文件时回退到 index.html（Vue/React History 模式）
location / {
    root /usr/share/nginx/html;
    index index.html;
    try_files $uri $uri/ /index.html;
}

# Gzip 压缩，减小传输体积
gzip on;
gzip_http_version 1.1;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
gzip_comp_level 9;
```

### 3.3 负载均衡（多实例分发）

```nginx
upstream backend {
    least_conn;                       # 最少连接优先
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
}

server {
    location /api/ {
        proxy_pass http://backend/;   # 转发给 upstream 组
    }
}
```

| 负载策略 | 说明 |
|---------|------|
| 默认（轮询） | 依次分发，权重相同 |
| `least_conn` | 分给当前连接最少的实例 |
| `ip_hash` | 同一 IP 固定到同一实例（需 Session 的场景） |

---

## ④ 架构协作：Nginx、PM2、Docker 谁干什么

### 4.1 各组件职责

| 组件 | 职责 |
|------|------|
| **Nginx** | 接收请求、SSL 终结、静态文件、反向代理、负载均衡 |
| **PM2** | Node 进程管理、故障恢复、内存管理 |
| **Docker** | 环境隔离、一致性部署、服务编排 |
| **MySQL / Redis** | 数据持久化 / 缓存 |

### 4.2 三种部署架构

**架构一：纯 Docker 部署**（现代默认）

```
┌─────────────────────────────────────────┐
│          Docker Compose                 │
│  ┌─────────┐  ┌─────────┐  ┌────────┐  │
│  │  Nginx   │  │ Server  │  │ Redis  │  │
│  └────┬─────┘  └────┬────┘  └───┬────┘  │
│       │              │           │       │
│  ┌────┴──────────────┴───────────┴────┐ │
│  │           MySQL Container           │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**架构二：PM2 + Nginx 传统部署**（裸机多实例）

```
Nginx (80/443) 反向代理 + 负载均衡
   ├── PM2 Nest #1（cluster）
   └── PM2 Nest #2（cluster）
          ↓
    MySQL / Redis
```

**架构三：Docker + 容器内 PM2**（show-track 模式）

```
Nginx (80/443)  ← 宿主机，唯一公网入口
   └── Docker 容器（PM2 fork 管理单进程）× N 副本
          ↓
    MySQL / Redis（宿主机 Docker 或云服务）
```

> 从架构一到架构三的演进主线：**Nginx 始终保持"唯一入口"**；变化的只是背后的 Node 进程由谁管理（裸机 PM2 → 容器 → 编排平台）。

---

## 与前后篇章的衔接

| 相关文档 | 衔接点 |
|---------|--------|
| [PM2 进程管理](./03-PM2%20进程管理) | Nginx 背后就是 PM2 管的 Node 进程 |
| [Docker Compose 编排](./05-Docker%20Compose%20编排) | compose 里端口绑定 `127.0.0.1`，正是为了只让 Nginx 访问 |
| [生产部署实战](./08-生产部署实战) | 完整架构如何落地 |

---

## 参考

- 上一篇：[Docker Compose 编排](./05-Docker%20Compose%20编排)
- 下一篇：[数据库迁移与发布](./07-数据库迁移与发布)