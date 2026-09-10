# CI/CD 自动化部署

> 从"SSH 登录部署"到"推送即上线"：自动化的渐进式演进
> 实战参考：nest-template 的 GitHub Actions 工作流
> 承上：[生产部署实战](./08-生产部署实战) —— 自动化只是把「手动部署」变成推送即上线，不读它不懂要自动化哪几步
> 启下：[脚手架开发入门](../10-脚手架开发/01-脚手架开发入门) —— 用 `inquirer` + `fs-extra` 做一个交互式 CLI，按用户选择复制模板目录并把 `{{变量}}` 替换为真实项目名

---

## 为什么最后一步是自动化

[生产部署实战](./08-生产部署实战) 里，每次发版都要：

```bash
git pull && docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

手工部署的四个问题：**易漏步骤、构建消耗服务器资源、无法快速回滚、多人发版不可控**。CI/CD 把"构建 + 推送镜像 + 服务器拉取重启"变成一次 `git tag`。

渐进四步：

| 阶段 | 目标 | 你能获得 |
|------|------|---------|
| ① 对比 | 手动 vs 自动化 | 理解 CI/CD 的价值 |
| ② 基础 | workflow 核心概念 | 看懂流水线 |
| ③ 双流水线 | 构建推送 + 服务器部署 | 完整落地 |
| ④ 安全与运维 | Secrets、迁移、回滚 | 生产可信 |

---

## ① 手动 vs 自动化

| 维度 | CI/CD 工作流 | 手动命令部署 |
|------|-------------|-------------|
| 触发方式 | `git tag v1.0.0` 推送 | SSH 服务器敲命令 |
| 构建位置 | GitHub Actions 云端 | 服务器本地 |
| 镜像来源 | 从仓库拉取 | 本地构建 |
| 自动化 | 全自动 | 需手动 |
| 服务器压力 | 构建在 CI，服务器只拉取 | 安装+编译吃服务器资源 |
| 回滚 | 切回旧 tag 镜像，秒级 | git checkout + 重新构建 |
| 适合场景 | 正式发版、多机部署 | 快速热修复、单机小项目 |

> 核心区别：**构建从服务器挪到云端 CI**。服务器只做一件事——拉新镜像、重启容器。

---

## ② 基础：workflow 的三个概念

GitHub Actions 的流水线叫 **workflow**，由 `.github/workflows/*.yml` 定义。三个核心概念：

| 概念 | 说明 |
|------|------|
| **触发条件（on）** | 什么时候跑：push、tag、手动 |
| **任务（jobs）** | 一个流水线的步骤集合，可并行 |
| **步骤（steps）** | 具体动作：checkout、build、deploy |

```yaml
name: Build Stable Image
on:
  push:
    tags: ['v*']          # 推送 v 开头的 tag 时触发

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4     # 拉取代码
      - run: docker build .           # 构建镜像
```

> 推荐用双流水线而不是一个：**build 负责构建推送，deploy 等 build 成功后再 SSH 部署**。这样构建失败不会触发部署，且 deploy 可在多台服务器复用。

---

## ③ 双流水线：构建推送 + 服务器部署

### 3.1 流水线一：构建镜像并推送（build-stable.yml）

```yaml
name: Build Stable Image
on:
  push:
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # 登录 Docker Hub
      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      # 构建镜像（tag 为 stable 和 v1.0.0）
      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ secrets.DOCKER_IMAGE }}:stable
            ${{ secrets.DOCKER_IMAGE }}:${{ github.ref_name }}
```

> `tag: stable` 表示"最新稳定版"；`tag: v1.0.0` 表示"此版本"。回滚时直接拉旧版本 tag 的镜像。

### 3.2 流水线二：SSH 部署（deploy.yml）

```yaml
name: Deploy to Server
on:
  workflow_run:
    workflows: ['Build Stable Image']
    types: [completed]        # 构建成功且完成才触发

jobs:
  deploy:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    steps:
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /opt/my-app
            docker compose -f docker-compose.prod.yml \
              --env-file .env --env-file .env.production pull
            docker compose -f docker-compose.prod.yml \
              --env-file .env --env-file .env.production up -d
```

整体链路：

```
git tag v1.0.0 && git push origin v1.0.0
    ↓
build-stable: 云端构建镜像 → 推送 Docker Hub（stable + v1.0.0）
    ↓
deploy: SSH 服务器 → docker compose pull → up -d（容器重启，完成部署）
```

> `pull`（从仓库拉取）替代了 `--build`（服务器本地构建）——这就是"构建挪到云端"的关键，服务器压力大幅下降。

---

## ④ 安全与运维

### 4.1 Secrets：密钥不进代码

在 GitHub 仓库 **Settings → Secrets and variables → Actions** 添加：

| Secret | 说明 |
|--------|------|
| `DOCKER_USERNAME` / `DOCKER_PASSWORD` | Docker Hub 账号 |
| `DOCKER_IMAGE` | 镜像名（不含 tag） |
| `SERVER_HOST` / `SERVER_USER` | 服务器地址与 SSH 用户 |
| `SERVER_SSH_KEY` | 服务器 SSH 私钥 |

> 建议为 CI/CD 创建专用密钥对，不要用日常账号：

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/deploy_key
ssh-copy-id -i ~/.ssh/deploy_key.pub root@your-server
```

### 4.2 数据库迁移放进流水线

安全迁移（新增表/字段/索引）在 deploy 中自动执行；**破坏性迁移（删除/重命名）必须人工确认后手动执行**：

```bash
# deploy 流水线中的迁移步骤（隔离容器执行）
docker compose -f docker-compose.prod.yml run --rm --entrypoint "" my-app \
  node ./node_modules/typeorm/cli.js migration:run -d ./dist/config/data-source.js
```

> 为什么破坏性迁移不自动跑？`DROP`/重命名不可逆，自动化执行没有"看一眼"的机会。安全的变更全自动，危险的变更留人工。机制详见 [数据库迁移与发布](./07-数据库迁移与发布)。

### 4.3 触发与回滚

```bash
git tag v1.0.0 && git push origin master && git push origin v1.0.0   # 发版
git tag -d v1.0.0 && git push origin --delete v1.0.0                 # 删 tag
```

**回滚 = 用旧 tag 再部署一次**：本地 `git tag v1.0.0`（旧版本）`git push origin v1.0.0`，CI 重新构建旧代码镜像并部署——秒级回滚。

### 4.4 验证部署

```bash
# GitHub 仓库 → Actions 标签页查看运行日志
# SSH 服务器验证
docker ps | grep my-app
docker logs -f my-app-server
curl https://api.example.com/api/health
```

---

## 整个部署知识体系的收官

回顾这个阶段九篇的递进主线：

```
配置（可切换的环境）
  → 日志（可观测）
  → PM2（裸机进程管理）
  → Docker（容器化）
  → Compose（多服务编排）
  → Nginx（统一入口）
  → 迁移（结构变更受控）
  → 部署实战（全流程合流）
  → CI/CD（自动化收口）
```

到这一步，你已经拥有从"本地开发"到"推送即上线"的完整生产链路。

---

## 参考

- 上一篇：[生产部署实战](./08-生产部署实战)
- 下一篇：[脚手架开发入门](../10-脚手架开发/01-脚手架开发入门)