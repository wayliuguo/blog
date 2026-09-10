# Monorepo 工程化

> 级别：高级

按本书四层推进：

- **入门使用**：看懂 Monorepo 与 Multi-repo 的差异，以及典型目录结构；
- **进阶**：掌握 pnpm 的硬链接/软链与幽灵依赖、lerna 版本联动、turborepo 增量缓存与任务编排；
- **实战**：给一个 pnpm workspace 配置依赖与任务编排，用 filter 定向构建受影响包；
- **最小实现掌握原理**：到 `code/frontend/14-infra` 运行 `deps-demo.html`，手写一张"依赖快照 + 硬链接/软链"图，看 pnpm 如何隔离依赖、又为何避免扁平 hoist 的幽灵依赖。

当项目从一个仓库演进到"一个需求要同时改 SDK、组件库、业务 app、文档"时，传统多仓库（Multi-repo）的版本割裂与协作成本会越来越痛。Monorepo 把多个包放进同一个仓库，以"统一版本管理 + 统一依赖 + 统一任务编排"换取一致性。本文讲清 Monorepo 是什么、为什么要用，深入 pnpm workspace / lerna / turborepo 的依赖管理与任务编排机制，并剖析 babel / vue / turbo 等大型 Monorepo 的落地形态。

## 一、什么是 Monorepo，为什么用它

### 1. 两种仓库组织方式对比

| 维度 | Multi-repo（多仓库） | Mono-repo（单仓库多包） |
| ---- | ---- | ---- |
| 组织方式 | 每个包一个 git 仓库 | 所有包一个仓库、多个 `package` |
| 依赖版本 | 各自独立发版、靠 semver 同步 | 可统一、可用 workspace 内部引用 |
| 跨包改动 | 要提多个 PR、对齐发版时序 | 一次 commit 即可原子改动 |
| 基建复用 | 每仓库各配一遍 CI/规范 | 统一基建，一处配置全覆盖 |
| 隔离性/权限 | 强（可按仓库控制） | 弱（需要代码规约与测试门禁补足） |

### 2. 典型目录结构（pnpm workspace）

```
monorepo/
├── pnpm-workspace.yaml        # 声明 workspace 范围
├── package.json
├── packages/
│   ├── ui/                    # 组件库
│   │   ├── src/
│   │   └── package.json
│   ├── sdk/                   # 业务 SDK
│   ├── shared/                # 共享类型与工具
│   └── app/                   # 具体业务应用(可多个)
├── scripts/                   # 统一脚本
└── turbo.json / lerna.json
```

### 3. 为什么用 Monorepo

- **原子提交**：跨包改动一次提交合入，避免"代码断了、版本没跟上"。
- **依赖统一**：同一依赖只需要一份，减少版本漂移。
- **增量构建**：改动一个包只重新构建受影响的部分，显著提速。
- **复用基建**：lint / test / CI 配置只在根目录写一次。

## 二、pnpm workspace / lerna / turborepo

三者定位不同、常常组合使用：**pnpm 管依赖，lerna/turborepo 管版本与任务编排**。

### 1. pnpm workspace：现代依赖管理

pnpm 的核心是**基于硬链接 + 全局内容寻址存储（CAS）的依赖管理**，配合 workspace 可以让包间相互依赖直接"链接"而非下载。

`pnpm-workspace.yaml`：

```yaml
packages:
  - "packages/*"
```

`packages/ui/package.json` 直接依赖本仓库的 sdk：

```json
{
  "name": "@scope/ui",
  "dependencies": {
    "@scope/sdk": "workspace:*"
  }
}
```

> `workspace:*` 表示"用工作区里这个包的最新版本"；pnpm 会用本地文件在 node_modules 里软链/硬链该包，改动即时生效，无需发布。

### 2. 依赖管理与软链接机制

| 机制 | 说明 |
| ---- | ---- |
| 全局内容寻址存储 | 所有依赖解压到全局 `.pnpm-store`，按内容 hash 组织，一份内容多处链接 |
| 硬链接(Hard link) | 同一内容多个位置指向同一 inode，**省磁盘、快安装** |
| 符号链接(Symlink) | `node_modules/@scope/ui` 链接到真实包文件 |
| 非扁平结构 | pnpm 的 `node_modules` 与 npm/yarn 的扁平 `hoist` 不同，仅暴露直接依赖，**防止幽灵依赖** |

**幽灵依赖问题**：npm/yarn 将依赖全部拍平到根 `node_modules`，导致代码能 `require` 一个并未声明在 `package.json` 里的包（幽灵依赖）。pnpm 的严格结构让"你只能用到你声明过的依赖"，更安全、可维护性更强。

### 3. lerna：专注版本管理

lerna 解决的痛点是**多包发版的版本联动**。

```bash
npx lerna version major   # 联动升级所有受影响包的版本
npx lerna publish         # 按依赖顺序发布所有已变更包
```

lerna 的 `--conventional-commits` 可基于 Angular 式提交信息自动推导版本号（fix→patch, feat→minor, BREAKING→major）。新版 lerna(>=7) 删除了内置执行器，将任务编排完全交给 turborepo 这类工具。

### 4. turborepo：任务编排与缓存

turborepo 的杀手锏是**任务依赖图 + 增量缓存**。它在 `turbo.json` 中声明各任务之间的依赖关系，并按依赖顺序编排执行，同时缓存产物。

`turbo.json`：

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "outputs": ["dist/**"],
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {}
  }
}
```

- `build` 依赖 `^build`：先构建该包依赖的包，再构建它本身。
- `outputs`：声明产物目录，用于缓存命中。

```bash
npx turbo run build --filter=@scope/app   # 只构建 app 及其依赖
npx turbo run dev --parallel              # 并行启动所有 dev
```

### 5. 三者的分工定位总结

| 工具 | 主要职责 | 是否管依赖 | 是否管发版 | 是否管任务编排 |
| ---- | ---- | ---- | ---- | ---- |
| pnpm | 依赖解析与实际安装/链接 | ✅ | ❌ | 有限(带 filter/递归) |
| lerna | 多包版本管理与发布 | ❌(交给 npm/yarn/pnpm) | ✅ | ❌(7+ 已移除执行) |
| turborepo | 任务编排、增量缓存、并行 | ❌ | ❌ | ✅ |

> 现代主流组合：**pnpm + turborepo**（或 pnpm + changesets 发版）。

## 三、依赖管理与任务编排进阶

### 1. filters 定向操作

pnpm 与 turbo 都支持按 filter 定向执行命令，避免每次都全员运行。

```bash
pnpm --filter @scope/ui build            # 只构建 ui 包
pnpm --filter "./packages/**" test       # 构建 packages 下所有包
pnpm --filter @scope/app... test         # 构建 app 及它依赖的包(祖先)
```

### 2. 增量构建的原理

Turbo 的核心是**根据"输入文件 hash"判断任务是否过期**。

```
输入集(Hash) = 源码文件内容 + 依赖配置 + turbo.json + 相关任务输出
     │
     ▼ 若命中缓存且 hash 一致
  直接复用缓存产物(本地缓存 / 远程缓存如 Vercel Remote Caching)
     │ 未命中
     ▼
  执行任务 → 产出存缓存 → 后续按依赖链供下游使用
```

远程缓存在 CI 中价值极大：整个团队共享同一份构建缓存，**未改动的包连构建都不用跑**，大幅缩短 CI 时间。

### 3. 任务编排的并发与拓扑

```
build 依赖关系(DAG)
 @scope/shared ─┬─▶ @scope/sdk
                ├─▶ @scope/ui ──▶ @scope/app
                └─▶ @scope/app
turbo 会并行执行无相互依赖的任务，同时保证有依赖的任务按拓扑序先后执行。
```

## 四、大型 Monorepo 案例

### 1. Babel（多版本共生 + 单元包模式）

- 把整个编译器拆成 `@babel/core`、`@babel/parser` 等几十个包，全部置于一个仓库。
- 各包独立 semver 发版，但共享 CI 与测试基座。
- 用 lerna + yarn workspaces 传统组合曾是其标配。
- 启示：重度解耦、一个仓库内可"原子"地跨包改一个语法特性。

### 2. Vue 3（按需拆包 + 根项目共建）

- Vue 3 分为 `@vue/reactivity`、`@vue/runtime-core`、`@vue/runtime-dom`、`@vue/compiler-*` 等多个包。
- 源码 `packages/*` 通过 pnpm workspace 互相链接，`dev` 时改动 reactivity 即时反映到 compiler。
- 包之间依赖用 `workspace:*`，最终发布时由发布工具改写为真实 semver。
- 启示：Monorepo 让框架内部模块边界清晰、可单独测试，贡献者改动一处即可全链路生效。

### 3. Turbo（工具自身使用自己）

- Turborepo 的仓库本身也是大规模 Monorepo，既是"使用者"也是"被测试对象"。
- 用自己来构建自己（dogfooding），天然验证工具质量与性能。
- 通过 `turbo.json` 把编译(基于 go/rust + md 文档站)等任务化、缓存化。
- 启示：基建工具用 Monorepo 自举，是可信度与稳定性的强证明。

### 4. 常见落地误区

| 误区 | 正确做法 |
| ---- | ---- |
| 把所有东西塞进一个包，包太厚 | 保持包粒度清晰、职责单一 |
| 依赖结构混乱导致循环依赖 | 明确包间图，禁止跨层反向依赖 |
| 一个测试坏全仓 CI 全红 | 用 filter 与缓存降低失败面影响 |
| 权限全开放、随便 publish | 收紧 publish 权限 + 变更门禁 |
| 没有代码规约约束跨包耦合 | 加 lint 规则与评审制度 |

## 最小实现：手写一张"依赖快照 + 链接"图看懂 pnpm

到 `code/frontend/14-infra` 运行 `deps-demo.html`：它用纯文本 + 交互按钮把"内容寻址存储、硬链接、软链、扁平化 vs 隔离"画出来，并对比 npm 的扁平 hoist，演示幽灵依赖为何产生、又为何被 pnpm 的严格结构防住。原理一句话：pnpm 的隔离靠"node_modules 里只放一层软链、真实文件在 store 只存一次"；npm/yarn 的扁平 hoist 省了软链却埋下幽灵依赖——这本质是工程化在"空间与安全"之间的取舍。

## 面试衔接

本节对应 `90-附录-面试体系` 的「工程化基建」板块（Monorepo、pnpm 软链/硬链接、幽灵依赖、lerna 联动、turbo 增量缓存）。回到正文，进入下一节 `09-CI/CD 自动化`。