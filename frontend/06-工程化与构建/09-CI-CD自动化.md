# CI/CD 自动化

> 级别：中级→高级

按本书四层推进：

- **入门使用**：看清 CI / 持续交付 / 持续部署三者的差异，以及各在哪一环节结束；
- **进阶**：掌握 workflow/job/step 概念、环境变量分层注入与凭据/权限安全；
- **实战**：用 GitHub Actions 串起 lint→test→build→deploy 的完整流水线，并为生产环境加审批；
- **最小实现掌握原理**：到 `code/frontend/14-infra` 运行 `pipeline-demo.html`，让 build→test→deploy 一步步在浏览器里跑并输出日志，体会"流水线 = 按依赖顺序编排的步骤序列 + 每步门禁"。

"代码 push 上去，机器自动帮我检查、测试、构建、部署"——这不再是想像，而是现代研发的标配。CI/CD（持续集成/持续交付与持续部署）把研发流程从"人肉接力"变成"机器编排流水线"。本文从概念讲起，用 GitHub Actions 打通一个真实项目，深入流水线设计（lint→test→build→deploy）、多环境管理与权限安全（凭据管理）。

## 一、CI/CD 概念与流程

### 1. 术语厘清

| 术语 | 全称 | 做什么 | 到哪一步 |
| ---- | ---- | ---- | ---- |
| CI | Continuous Integration | 持续集成：频繁合并小改动并自动验证 | 构建+测试 |
| CD(交付) | Continuous Delivery | 持续交付：随时可发布到生产 | 构建+测试+可部署产物 |
| CD(部署) | Continuous Deployment | 持续部署：验证通过自动上线 | 全自动进入生产 |

> 核心区别：**交付**是"随时可以发"的自动化，**部署**是"验证后就发"的完全自动化。生产环境往往保留"一键/审批"而不是全自动部署，以留出人工把关空间。

### 2. 一次典型发布的时间线

```
开发者 push ──▶ CI 触发
                  ├─ 检出代码
                  ├─ 安装依赖
                  ├─ lint
                  ├─ 单元测试
                  ├─ 构建产物
                  ├─ 上传产物 + 生成版本清单
                  └─ 触发 CD
部署到 staging/预发 ──▶ 自动冒烟/人工验证 ──▶ 灰度到生产 ──▶ 全量
                                                      └─ 失败则回滚
```

## 二、GitHub Actions 实战

GitHub Actions 是 GitHub 原生的 CI/CD，用 YAML 定义**workflow → job → step**。

### 1. 核心概念

| 概念 | 说明 |
| ---- | ---- |
| Workflow | 由事件触发的一组自动化流程，在 `.github/workflows/*.yml` |
| Job | 一个 workflow 内的执行单元，可并行、可依赖其他 job |
| Step | job 内的一步，一个命令或一个 action |
| Action | 可复用的步骤，如 `actions/checkout@v4` |
| Runner | 实际执行的环境（GitHub 托管或自托管） |

### 2. 事件(trigger)

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch: {}   # 允许手动触发
```

### 3. 一个完整流水线示例

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm test

  build:
    # 在上面 quality 通过后才构建
    needs: quality
    runs-on: ubuntu-latest
    outputs:
      version: $&#123;&#123; steps.version.outputs.version &#125;&#125;
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"
      - run: pnpm install
      - run: pnpm build
      # 上传产物供下游发布 job 使用
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist
      - id: version
        run: echo "version=$(date +%s)" >> "$GITHUB_OUTPUT"

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist
      - run: ./scripts/deploy.sh
        env:
          CDN_KEY: $&#123;&#123; secrets.CDN_KEY &#125;&#125;
```

> 说明：YAML 中出现的 `$&#123;&#123; &#125;&#125;` 是 GitHub Actions 的表达式语法，**与 Vue 模板插值同形**。在 VitePress（Vue SSR）构建中这类 `*&#123;&#123;*&#125;&#125;` 会被当成 Vue 插值报错，因此本文档统一使用 HTML 实体转义表示，你在真实 .yml 中应写回 `$&#123;&#123; &#125;&#125;`。

## 三、流水线设计：lint → test → build → deploy

### 1. 分阶段的原因

- **尽早失败**：lint/test 便宜且快，放最前面，避免在昂贵构建后才报低级错误。
- **缩短反馈**：PR 阶段只跑 quality，合并后才跑完整发布。
- **关注点分离**：构建只依赖"质量通过"，部署只依赖"产物就绪"。

### 2. 各阶段要点

| 阶段 | 关键动作 | 常见 gate |
| ---- | ---- | ---- |
| lint | ESLint/Prettier/commitlint | 任何 error 拒绝合入 |
| test | 单测、组件测试、覆盖率 | 覆盖率低于阈值(如 80%)reject |
| build | 多环境构建、产物 hash、版本标记 | 产物可重复、体积告警 |
| deploy | 上传 CDN、更新索引、灰度、通知 | 冒烟通过、监控无异常、一键回滚 |

### 3. 产物与缓存

```yaml
steps:
  - uses: actions/setup-node@v4
    with:
      cache: "pnpm"            # Actions 自动缓存依赖
```

依赖安装、构建产物等都开启缓存，CI 提速显著；Monorepo 场景可配合 Turborepo 等远程缓存进一步加速（参考《03-Monorepo 工程化》）。

## 四、环境管理

### 1. 常见环境与用途

| 环境 | 用途 | 何时部署 |
| ---- | ---- | ---- |
| dev | 日常联调 | 每次 push 自动 |
| test / staging | 功能验收、回归 | 合并主干自动 |
| pre-production(预发) | 拟生产数据、上线前验证 | 发布前置 |
| production | 真实用户 | 审批/灰度 |

### 2. GitHub Actions 的 environment 与变量

```yaml
deploy:
  environment:
    name: production
    url: https://example.com
```

为不同 environment 配置不同的 secrets 与 approval 审批人，即可做到 **"生产环境需要人工审批才能部署"**：

```yaml
jobs:
  deploy-prod:
    environment:
      name: production
    # 配置中要求 approvers，部署前需人工批准
```

### 3. 环境变量分层注入

```
构建期 NODE_ENV / VITE_API_BASE / 版本
        ↓ 编译进产物
部署期目标环境/baseURL/域名
        ↓ 运行时注入
业务环境切换(取决于打包时取的 env 文件或运行时配置)
```

## 五、权限与安全：凭据管理

CI/CD 一但配错，可能把生产密钥泄露到流水线日志，因此凭据是安全第一优先级。

### 1. 凭据管理的原则

- **永远不把密钥写进代码或 .yml 明文**。
- **把密钥放到 secrets**（GitHub Actions 的 `secrets.*`），仅在使用时才注入环境变量。
- **最小权限**：token 只给本次任务所需的最小权限，可加 `permissions:` 收窄。

```yaml
permissions:
  contents: read          # 发布 job 不允许写仓库，只读即可
```

### 2. 实践对照

| 做法 | 是否安全 | 说明 |
| ---- | ---- | ---- |
| 密钥写进 .env 且入库 | ❌ | 一旦泄露即失控 |
| 密钥明文写在 workflow | ❌ | CI 日志可能暴露 |
| 密钥放 secrets，仅运行时注入 | ✅ | 推荐；可用 `mask` 隐藏 |
| 使用 OIDC 代替长期 token | ✅✅ | 更安全，避免静态凭据 |

### 3. 关键安全审计清单

- [ ] 所有密钥在仓库 Secrets 里，代码中无明文。
- [ ] 每个 job 用 `permissions` 收窄到最小权限。
- [ ] 生产部署任务有审批层，不自动无限执行。
- [ ] fork 提交不可直接获得 secrets（新贡献者提交不含机密）。
- [ ] 日志里不回显敏感值（可配置 mask）。

### 4. 生产部署的审批与保护

```yaml
on:
  workflow_dispatch:
    inputs:
      env:
        type: environment
        description: 选择部署环境
branches:
  main:
    protection:
      required_status_checks: [quality]  # 必须通过质量 gate 才能合并
      required_reviews: true             # 必须有 reviewer
```

## 最小实现：让 build→test→deploy 在自己浏览器里跑一遍

到 `code/frontend/14-infra` 运行 `pipeline-demo.html`：点击"运行流水线"，build、test、deploy 三步依次执行，每步按门禁判断、任一步失败即终止并输出红/绿日志，全部通过才进入发布；发布阶段还支持灰度放量与一键回滚。原理一句话：CI/CD 的"流水线"本质上就是"按依赖顺序编排的步骤序列 + 每一步的门禁判断"，GitHub Actions 只是把这份编排用 YAML 声明出来、交给 runner 执行。

## 面试衔接

本节对应 `90-附录-面试体系` 的「工程化基建」板块（流水线设计 lint→test→build→deploy、多环境管理、secrets 与审批、灰度/回滚编排）。回到正文，进入下一节 `10-质量体系与测试`。