# Monorepo 工程化：pnpm workspace

## 一、为什么用 Monorepo + pnpm

### 1. 两种仓库组织方式对比

| 维度 | Multi-repo（多仓库） | Mono-repo（单仓库多包） |
| ---- | ---- | ---- |
| 组织方式 | 每个包一个 git 仓库 | 所有包一个仓库、多个 `package` |
| 依赖版本 | 各自独立发版、靠 semver 同步 | 可统一、可用 workspace 内部引用 |
| 跨包改动 | 要提多个 PR、对齐发版时序 | 一次 commit 即可原子改动 |
| 基建复用 | 每仓库各配一遍 CI/规范 | 统一基建，一处配置全覆盖 |
| 隔离性/权限 | 强（可按仓库控制） | 弱（需要代码规约与测试门禁补足） |

### 2. 典型目录结构（pnpm workspace）

> 完整可运行版本见配套代码 `./code/pnpm-workspace-demo`。

```
monorepo/
├── pnpm-workspace.yaml        # 声明 workspace 范围
├── package.json               # 根：private + 统一 scripts + packageManager
├── pnpm-lock.yaml             # 由 install 生成，锁定全仓依赖
├── packages/
│   ├── shared/                # 共享类型与工具（无依赖）
│   ├── sdk/                   # 业务 SDK（依赖 shared）
│   └── ui/                    # 组件库（依赖 sdk）
├── .npmrc                     # 可选的 pnpm 配置（镜像、store 等）
└── scripts/                   # 统一脚本
```

### 3. 为什么选 pnpm（对比 npm / yarn）

| 维度 | npm / yarn（扁平 hoist） | pnpm（硬链接 + 非扁平） |
| ---- | ---- | ---- |
| 磁盘占用 | 每项目一份副本 | 全局 store 一份，硬链接引用 |
| 隔离性 | 间接依赖也被提升到顶层，可幽灵 require | 只暴露直接依赖，用到未声明包即报错 |
| 安装速度 | 逐包拷贝 | 链接为主，快 |
| workspace | 需要额外配置 | 原生支持，简单 |

pnpm 的核心目标是：**磁盘最省 + 依赖严格隔离**。这两点让它成为现代 Monorepo 的默认选择。

## 二、pnpm 核心机制（使用前先懂原理）

| 机制 | 说明 |
| ---- | ---- |
| 内容寻址存储（CAS） | 所有依赖解压到全局 `.pnpm-store`，按内容 hash 组织，一份内容多处链接 |
| 硬链接（Hard link） | 同一内容多个位置指向同一 inode，**省磁盘、快安装** |
| 符号链接（Symlink） | `node_modules/@scope/ui` 链接到真实包文件 |
| 非扁平结构 | 只暴露直接依赖，**防止幽灵依赖** |
| workspace 协议 | `workspace:*` 本地链接，改动即时生效、无需发布 |

**幽灵依赖问题**：npm/yarn 将依赖全部拍平到根 `node_modules`，导致代码能 `require` 一个并未声明在 `package.json` 里的包（幽灵依赖）。pnpm 的严格结构让"你只能用到你声明过的依赖"——代码一旦引用未声明的包，在编译/安装阶段就暴露，更安全、可维护性更强。

一句话记住 pnpm 的组织方式：**每个 package 的 `node_modules` 只长着它自己声明的依赖，依赖之间用软链连接，真正的包内容（硬链接）躺在全局 store 里。**

## 三、安装与配置实操

### 1. 安装 pnpm

```bash
npm i -g pnpm          # 全局安装
pnpm --version         # 验证版本
pnpm config set store-dir ~/.pnpm-store   # 可选：自定义全局 store 位置
```

### 2. 初始化 workspace：`pnpm-workspace.yaml`

在仓库根目录新建 `pnpm-workspace.yaml`，声明哪些目录被当作"包"管理。支持 glob 通配：

> 摘自 `./code/pnpm-workspace-demo/pnpm-workspace.yaml`

```yaml
packages:
  - "packages/*"
```

- 改了这个文件后，pnpm 会重新收集工作区包列表。
- 支持多种 glob，如 `"packages/**"`、排除项 `"!packages/legacy"` 等。

### 3. 根 `package.json`

根 `package.json` 是 workspace 的"指挥中心"，必须 `"private": true`（不能发到 npm），并写 `packageManager` 声明使用的包管理器和版本：

> 摘自 `./code/pnpm-workspace-demo/package.json`

```json
{
  "name": "pnpm-workspace-demo",
  "version": "1.0.0",
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "build": "pnpm -r run build",
    "build:ui": "pnpm --filter @scope/ui run build",
    "build:pkgs": "pnpm --filter \"./packages/**\" run build",
    "demo": "node packages/ui/dist/index.js"
  }
}
```

### 4. 包间依赖：`workspace:*` 协议

子包之间相互引用，用 `workspace:` 前缀替代真实版本号：

> 摘自 `./code/pnpm-workspace-demo/packages/sdk/package.json`

```json
{
  "name": "@scope/sdk",
  "dependencies": {
    "@scope/shared": "workspace:*"
  }
}
```

`workspace:*` 的三种范围写法，控制"用哪个版本"：

| 写法 | 含义 |
| ---- | ---- |
| `workspace:*` | 用工作区里该包的最新版本（最常用） |
| `workspace:^` | 用该包在本地的最新版本，且允许 ≥ 该版本 |
| `workspace:~` | 用该包本地最新版本，且只允许同 minor 内升级 |

> `workspace:*` 表示"用工作区里这个包的最新版本"；pnpm 会用本地文件在 `node_modules` 里软链/硬链该包，改动即时生效，无需发布。发布时由发布工具改写为真实 semver。

### 5. 安装与锁定

```bash
pnpm install                          # 首次安装，生成 node_modules + pnpm-lock.yaml
pnpm install --frozen-lockfile        # 完全按 lockfile 安装，改任何依赖版本都会失败（CI 常用）
```

- `pnpm-lock.yaml` 是依赖准确性的唯一事实源，必须提交进 git。
- CI 里一定用 `--frozen-lockfile`，避免"本地能用、CI 复现不一致"。

### 6. 快速构建一个 workspace

进入配套代码目录，三步把依赖链 run 起来（构建 sdk 时会先构建 shared，构建 ui 时先构建 sdk，即按拓扑序）：

```bash
cd code/pnpm-workspace-demo
pnpm install          # 1. 建立 workspace 链接
pnpm build            # 2. 等价于 pnpm -r run build
pnpm --filter @scope/ui start   # 3. 跑 ui，输出 "Hello, zhang"
```

## 四、pnpm 常用命令一览

### 1. 安装 / 卸载 / 升级依赖

```bash
pnpm add lodash                     # 装到根 package.json
pnpm add zod --filter @scope/sdk    # 只给 sdk 包安装 zod
pnpm remove lodash                  # 卸载
pnpm up --latest                    # 批量升级所有依赖到最新
pnpm dlx turbo build                # 临时执行某个工具（等价于 npx）
```

### 2. filter 定向操作

pnpm 与 turbo 都支持按 filter 定向执行命令，避免每次都全员运行：

> 摘自 `./code/pnpm-workspace-demo` 根 `package.json`（命令手动执行）

```bash
pnpm --filter @scope/ui build            # 只构建 ui 包
pnpm --filter "./packages/**" run test   # 构建 packages 下所有包
pnpm --filter @scope/app... run test     # 构建 app 及它依赖的包（祖先，... 后缀）
pnpm --filter ...sdk run test            # 构建依赖 sdk 的包（接收方，... 前缀）
```

### 3. 递归执行（拓扑序）

```bash
pnpm -r run build          # 按依赖拓扑序构建所有包（依赖先、被依赖后）
pnpm -r --parallel test    # 并行跑所有包（无依赖先后时才安全）
```

- `pnpm -r` 会先分析依赖图，保证"被依赖的包先构建"。
- 同机多个包脚本并行时，可配合 `--stream` 串行打印输出，方便观察顺序。

## 五、版本发布：changesets（pnpm 官方配套）

发布用 **changesets**（pnpm 官方推荐的版本管理工具，定位与 lerna 相同但更轻，专注 pnpm 生态）。

```bash
pnpm dlx changeset          # 交互式创建变更集（在提交信息里标记 major/minor/patch）
pnpm changeset version      # 依据变更集统一升级受影响包的版本并生成 CHANGELOG
pnpm publish -r             # 按依赖顺序发布所有已变更包
```

核心思路：改动时先用 `changeset add` 声明这是 breaking/feature/fix，发布时统一据此联动所有受影响包的版本，避免手动逐个改 `version` 造成的版本错位。

## 六、常见落地误区

| 误区 | 正确做法 |
| ---- | ---- |
| 把所有东西塞进一个包，包太厚 | 保持包粒度清晰、职责单一 |
| 依赖结构混乱导致循环依赖 | 明确包间图，禁止跨层反向依赖 |
| 一个测试坏全仓 CI 全红 | 用 `--filter` 与缓存降低失败面影响 |
| 权限全开放、随便 publish | 收紧 publish 权限 + `changeset` 门禁 |
| 没有代码规约约束跨包耦合 | 加 lint 规则与评审制度 |

## 配套代码

`./code/pnpm-workspace-demo` 是一套**可完整运行**的最小 pnpm workspace：

```
pnpm-workspace-demo/
├── pnpm-workspace.yaml
├── package.json            # 根：private + 统一 scripts + packageManager
├── README.md               # 运行说明
└── packages/
    ├── shared/  (src + package.json，无依赖)
    ├── sdk/     (src + package.json，依赖 shared)
    └── ui/      (src + package.json，依赖 sdk)
```

运行：进入目录后依次 `pnpm install` → `pnpm build` → `pnpm --filter @scope/ui start`。它演示了 `workspace:*` 本地链接、`--filter` 定向、`pnpm -r` 拓扑序，以及"引用未声明包会报错"的幽灵依赖隔离。

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[脚手架的诞生](./脚手架的诞生.md)
- 下一篇：[代码规范](../交付与质量/代码规范与质量门禁.md)