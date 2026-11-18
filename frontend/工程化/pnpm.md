# pnpm

## npm 问题：重复安装与幽灵依赖

npm 从 v3 起把依赖尽量拍平到项目顶层的 `node_modules`，解决深层嵌套的路径长度问题。代价有两个：

1. **同名包的不同版本各留一份**。不同子树依赖同一库的不同版本时，冲突的那份只能嵌套在依赖方下面，磁盘上出现多份副本。
2. **传递依赖全部暴露在顶层**。源码可以 `require` 一个自己没声明的包——这就是幽灵依赖（phantom dependency）。

### 重复安装：一个包名，两处实体

- 根工程声明`is-even@1.0.0`，其依赖 `is-odd@0.1.2`，后者依赖 `is-number@3.0.0`；
- 根工程声明 `is-odd@3.0.1`，其依赖 `is-number@6.0.0`：

> 摘自 `./code/npm-lab/package.json`（在该目录执行 `npm install`）

```json
{
    "name": "npm-lab",
    "version": "1.0.0",
    "private": true,
    "dependencies": {
        "is-even": "1.0.0",
        "is-odd": "3.0.1"
    }
}
```

```txt
// npm ls --all 能直接看到两个版本
npm-lab@1.0.0 E:\working\blog\frontend\工程化\code\npm-lab
├─┬ is-even@1.0.0
│ └─┬ is-odd@0.1.2
│   └─┬ is-number@3.0.0
│     └─┬ kind-of@3.2.2
│       └── is-buffer@1.1.6
└─┬ is-odd@3.0.1
  └── is-number@6.0.0
```

```txt
// 磁盘表现
node_modules/
├── is-even@1.0.0
│   └── node_modules/
│       ├── is-number@3.0.0        ← 冲突版本，只能嵌套
│       └── is-odd@0.1.2
├── is-number@6.0.0                ← 顶层：根工程要的版本
├── is-odd@3.0.1
├── is-buffer@1.1.6                ← 传递依赖被拍平到顶层
└── kind-of@3.2.2
```


### 幽灵依赖：没声明的包也能 require

- 表现：

```js
const is_number = require('is-number')
console.log(is_number('123')) // true
```

- 问题：依赖了别人安装的结果，当依赖不存在后会报错（换包管理器、升级后不再依赖、顶层依赖不同版本）

## pnpm 核心特性

pnpm 用两个机制分别对应上面两个问题：**磁盘上只存一份**（store + 硬链接），**解析时只给直接依赖**（严格的 `node_modules`）。

### store 硬链接 + 符号链接

`node_modules` 里有两类"链接"，分工完全不同：

- **符号链接**（Windows 上是 junction）只负责指路：包名 → 某个版本目录；
- **硬链接**发生在**文件**一级：同一份内容有多个目录项，磁盘上只存一份。

`app-a` 只声明一个依赖：

> 摘自 `./code/pnpm-core-lab/app-a/package.json`（在该目录执行 `pnpm install`）

```json
{
    "name": "pnpm-app-a",
    "version": "1.0.0",
    "private": true,
    "dependencies": {
        "is-even": "1.0.0"
    }
}
```

#### 顶层：直接依赖只是一个 junction

```powershell
Get-ChildItem node_modules -Directory | Select-Object Name, LinkType
```

```txt
Name       LinkType
----       --------
.pnpm
is-even    Junction
```

```powershell
(Get-Item node_modules/is-even).Target
```

```txt
E:\working\blog\frontend\工程化\code\pnpm-core-lab\app-a\node_modules\.pnpm\is-even@1.0.0\node_modules\is-even
```

`is-even` 不是目录，而是指向 `.pnpm` 的 junction。顶层只给 `package.json` 里直接声明的包开口。

#### `.pnpm` 里：实体目录 + 依赖 junction

```powershell
Get-ChildItem node_modules/.pnpm/is-even@1.0.0/node_modules -Force | Select-Object Name, LinkType
```

```txt
Name    LinkType
----    --------
is-even
is-odd  Junction
```

- `is-even` 没有 LinkType：它是真实目录，包的文件都在里面；
- `is-odd` 是 junction，指向 `is-odd@0.1.2` 的版本目录：

```powershell
(Get-Item node_modules/.pnpm/is-even@1.0.0/node_modules/is-odd).Target
```

```txt
E:\working\blog\frontend\工程化\code\pnpm-core-lab\app-a\node_modules\.pnpm\is-odd@0.1.2\node_modules\is-odd
```

每个包都这样挂自己的依赖，整棵依赖图由 junction 串起来。版本目录名带版本号，所以同一个包的两个版本可以并存：

```powershell
Get-ChildItem node_modules/.pnpm -Directory | Select-Object -ExpandProperty Name
```

```txt
is-buffer@1.1.6
is-even@1.0.0
is-number@3.0.0
is-odd@0.1.2
kind-of@3.2.2
node_modules
```

其中 `node_modules` 是私有提升区，里面同样全是 junction，项目源码不会从这里解析。

#### 实体目录里的文件是硬链接

`is-even` 目录里的 `index.js` 与全局 store 的文件共享同一份内容。`fsutil hardlink list` 列出指向这份内容的全部路径：

```powershell
# 在 pnpm-core-lab 根目录执行
fsutil hardlink list app-a\node_modules\.pnpm\is-even@1.0.0\node_modules\is-even\index.js
```

```txt
\.pnpm-store\v11\files\dd\131e756f380a89a93ab6098d23e765d35330d66d6ef992f47d7b59c4dc3419877642489b24936b732ac5008319302afb4f030482733d44e326b4dfd47c665a
\working\blog\frontend\工程化\code\pnpm-core-lab\app-a\node_modules\.pnpm\is-even@1.0.0\node_modules\is-even\index.js
\working\blog\frontend\工程化\code\pnpm-core-lab\app-b\node_modules\.pnpm\is-even@1.0.0\node_modules\is-even\index.js
```

#### 为什么需要 app-a 和 app-b 两个工程

- 只装 `app-a` 时，这条命令只有两条路径：store 与 `app-a`——能证明"文件不是复制进项目的"；
- 再装一个依赖相同的 `app-b`，同一个文件变成三条路径：两个工程共用一份内容，第二个工程没有多占磁盘。这是 pnpm 在多项目机器上省空间的直接证据；
- 分工是：`app-a` 看"store → 项目"的硬链接，`app-b` 看"项目 ↔ 项目"的共享。

```
全局 store（E:\.pnpm-store\v11）
   │ 硬链接：同一份内容，多个目录项
   ├──> app-a/node_modules/.pnpm/is-even@1.0.0/node_modules/is-even/index.js
   └──> app-b/node_modules/.pnpm/is-even@1.0.0/node_modules/is-even/index.js
          ▲ junction（符号链接）
   app-a/node_modules/is-even
```

| 位置 | 类型 | 作用 |
| --- | --- | --- |
| 全局 store | 内容寻址的文件仓库 | 每个文件唯一的实体 |
| `node_modules/<包名>` | junction | 只暴露 `package.json` 里直接声明的包 |
| `.pnpm/<包名>@<版本>/node_modules/<包名>` | 真实目录 | 包的内容，其中的文件硬链接到 store |
| `.pnpm/<包名>@<版本>/node_modules/<依赖>` | junction | 让这个包解析到自己版本的依赖 |
| `.pnpm/node_modules` | junction | 私有提升区，供 peer 依赖与部分工具使用 |

两个实践细节：

- **store 必须与项目同盘才能硬链接**。跨盘（比如 store 在 C:、项目在 E:）时 pnpm 会退化为复制，磁盘与安装速度都变差；`package-import-method` 可以显式指定 `hardlink` / `copy` / `clone`。
- **不要手改 `node_modules` 里的文件**。硬链接意味着改动会直接写进 store，污染其他项目；包内容应视为只读。

### 严格 node_modules 让幽灵依赖直接报错

还是 `app-a` 那个工程：`is-even` 的传递依赖 `is-odd` 在 `.pnpm` 里有实体，但顶层没有它的链接，项目源码解析不到。

```powershell
node -e "try{require('is-odd');console.log('ok')}catch(e){console.log(e.code)}"
# MODULE_NOT_FOUND
```

把 `is-odd` 写进 `package.json` 再安装，顶层才会补出它的链接：

```bash
pnpm add is-odd@3.0.1
Get-ChildItem node_modules -Directory | Select-Object -ExpandProperty Name   # .pnpm is-even is-odd
```

这一条把幽灵依赖从"能跑但不确定"变成"安装后立刻失败"，问题在开发期就暴露。默认布局下，pnpm 仍然会把所有依赖**私下**提升到 `node_modules/.pnpm/node_modules`，用于满足 peer 依赖和兼容部分工具，但项目源码不会从这里解析。需要临时放宽时有三档开关，按侵入性从小到大：

| 配置 | 效果 | 什么时候用 |
| --- | --- | --- |
| `public-hoist-pattern[]=*` | 把匹配的包额外链接到顶层 | 某个工具硬要求从根目录解析 |
| `shamefully-hoist=true` | 全部提升到顶层，接近 npm 布局 | 老项目迁移期的最后手段 |
| `node-linker=hoisted` | 完全改用 npm 式平坦布局 | 确实无法适配时，放弃 pnpm 的严格性 |

另一个方向的严格性是**安装脚本**：pnpm 10 起默认不执行依赖包的生命周期脚本，只在 `pnpm.onlyBuiltDependencies` 白名单里放行。这一条挡的是供应链攻击，遇到需要编译原生模块的包（如 `esbuild`）时，按提示把包名加进白名单即可。

## 三、构建 monorepo

`pnpm-workspace-lab` 是一个可直接运行的工作区：根工程 + 两个库 + 一个应用，本地依赖用 `workspace:` 协议互相引用。

```
pnpm-workspace-lab/
├── package.json            # 根：private + packageManager + 汇总脚本
├── pnpm-workspace.yaml     # 声明哪些目录是工作区成员
├── pnpm-lock.yaml          # 锁文件：importers 按成员分组
├── packages/
│   ├── utils/              # @lab/utils：无依赖
│   └── ui/                 # @lab/ui：依赖 @lab/utils（workspace:*）+ 外部包 is-odd
└── apps/
    └── web/                # @lab/web：依赖 @lab/ui（workspace:*）
```

### 工作区骨架：一个 yaml + 根 package.json

工作区不需要额外工具，两件事：在根目录写 `pnpm-workspace.yaml` 声明成员，根 `package.json` 标记 `private` 并锁定 pnpm 版本。

> 摘自 `./code/pnpm-workspace-lab/pnpm-workspace.yaml`

```yaml
packages:
    - 'packages/*'
    - 'apps/*'
```

> 摘自 `./code/pnpm-workspace-lab/package.json`

```json
{
    "name": "pnpm-workspace-lab",
    "version": "1.0.0",
    "private": true,
    "packageManager": "pnpm@11.5.2",
    "scripts": {
        "build": "pnpm -r run build",
        "start": "pnpm --filter @lab/web run start"
    }
}
```

- `private: true` 防止根工程被误发布——根工程不产出包，只做编排。
- `packageManager` 配合 Corepack，让所有人用同一个 pnpm 版本；版本不一致时 pnpm 会直接报错。
- 根 `scripts` 只是常用命令的快捷方式，`pnpm -r` / `--filter` 才是真正的编排手段。

### 建包与声明本地依赖

每个成员就是一个普通包，只需 `package.json`（`name` 必填、`private: true`、`main` 指向入口）。库依赖本地包时用 `workspace:` 协议：

> 摘自 `./code/pnpm-workspace-lab/packages/ui/package.json`

```json
{
    "name": "@lab/ui",
    "version": "0.1.0",
    "private": true,
    "main": "index.js",
    "scripts": {
        "build": "node -e \"console.log('build @lab/ui')\""
    },
    "dependencies": {
        "@lab/utils": "workspace:*",
        "is-odd": "3.0.1"
    }
}
```

> 摘自 `./code/pnpm-workspace-lab/apps/web/package.json`

```json
{
    "name": "@lab/web",
    "version": "0.1.0",
    "private": true,
    "main": "index.js",
    "scripts": {
        "build": "node -e \"console.log('build @lab/web')\"",
        "start": "node index.js"
    },
    "dependencies": {
        "@lab/ui": "workspace:*"
    }
}
```

新增依赖走命令，让 pnpm 同时更新声明与锁文件：

```bash
pnpm --filter @lab/ui add @lab/utils@workspace:*   # 在 ui 里加本地依赖
pnpm --filter @lab/ui add lodash                   # 在 ui 里加外部依赖
pnpm install                                       # 建链、写锁文件
```

`workspace:*` 的好处是**版本与源码永远同步**：本地改完即生效，不需要先发版。

### 安装后的链接与锁文件

顶层 `node_modules` 里没有 `@lab/*`，链接落在每个成员自己的 `node_modules` 下，指向源目录：

```powershell
(Get-Item apps/web/node_modules/@lab/ui).Target
(Get-Item packages/ui/node_modules/@lab/utils).Target
```

```txt
E:\working\blog\frontend\工程化\code\pnpm-workspace-lab\packages\ui
E:\working\blog\frontend\工程化\code\pnpm-workspace-lab\packages\utils
```

锁文件把 `workspace:*` 记成 `link:`：

```bash
Select-String -Path pnpm-lock.yaml -Pattern "specifier: workspace:|version: link:"
```

```txt
        specifier: workspace:*
        version: link:../../packages/ui
        specifier: workspace:*
        version: link:../utils
```

应用能直接跑通整条链路 `web → ui → utils`：

```bash
node apps/web/index.js
# <section>hello-pnpm</section>
```

### 按依赖图执行脚本

`-r` 跑所有成员，pnpm 先做拓扑排序，保证依赖先构建：

```bash
pnpm -r run build
```

```txt
Scope: 3 of 4 workspace projects
packages/utils build$ node -e "console.log('build @lab/utils')"
packages/utils build: build @lab/utils
packages/utils build: Done
packages/ui build$ node -e "console.log('build @lab/ui')"
packages/ui build: build @lab/ui
packages/ui build: Done
apps/web build$ node -e "console.log('build @lab/web')"
apps/web build: build @lab/web
apps/web build: Done
```

只跑一个包的依赖链时用 `--filter`：

| 命令 | 选中的成员 |
| --- | --- |
| `pnpm --filter "@lab/web..." run build` | `@lab/web` 及其全部依赖（utils → ui → web） |
| `pnpm --filter "...@lab/utils" run build` | `@lab/utils` 及其所有使用方（utils → ui → web） |
| `pnpm --filter @lab/ui run build` | 只有 `@lab/ui` |
| `pnpm -r --parallel run build` | 全部成员，放弃顺序、并行执行 |
| `pnpm --filter "./packages/*" run build` | 按目录过滤 |

`...` 的位置决定方向：写在包名后面往下游的依赖走，写在前面往上游的使用方走。不写 `...` 就不做拓扑展开。

### 日常管理

```bash
pnpm list -r --depth -1        # 列出所有成员
pnpm why is-odd --filter @lab/ui   # 查某个依赖是谁引入的
```

```txt
pnpm-workspace-lab@1.0.0 E:\working\blog\frontend\工程化\code\pnpm-workspace-lab (PRIVATE)

@lab/web@0.1.0 E:\working\blog\frontend\工程化\code\pnpm-workspace-lab\apps\web (PRIVATE)

@lab/ui@0.1.0 E:\working\blog\frontend\工程化\code\pnpm-workspace-lab\packages\ui (PRIVATE)

@lab/utils@0.1.0 E:\working\blog\frontend\工程化\code\pnpm-workspace-lab\packages\utils (PRIVATE)
```

```txt
is-odd@3.0.1
└── @lab/ui@0.1.0 (dependencies)

Found 1 version of is-odd
```

| 需求 | 命令 |
| --- | --- |
| 给某个包加依赖 | `pnpm --filter @lab/ui add lodash` |
| 给某个包加开发依赖 | `pnpm --filter @lab/ui add -D typescript` |
| 删除依赖 | `pnpm --filter @lab/ui remove lodash` |
| 全仓升级 | `pnpm -r update` / `pnpm -r update --latest` |
| 在某包里执行命令 | `pnpm --filter @lab/ui exec node -v` |
| 跑某个包的脚本 | `pnpm --filter @lab/web run start` |

### 发布

- `pnpm -r publish` 打包时把 `workspace:*` 替换成实际版本号，所以本地链接不会带进发布产物；
- 发布前用 `pnpm -r version` 或 changesets 统一升版本、生成变更日志；
- 私有包（`private: true`）不会被发布，工作区里可以放心放示例包。

## 配套代码

三台实验台都是普通工程，没有脚本：进目录装依赖，自己看 `node_modules` 与命令输出。

| 路径 | 内容 | 对应小节 |
| --- | --- | --- |
| `./code/npm-lab/` | `is-even@1.0.0` + `is-odd@3.0.1`：两份实体，且未声明的 `is-number` 能从顶层 require | 一 |
| `./code/pnpm-core-lab/app-a/` | `is-even@1.0.0`：顶层只有一条链接，未声明依赖报错 | 二 |
| `./code/pnpm-core-lab/app-b/` | 同依赖：与 app-a 的实体文件是同一份硬链接 | 二 |
| `./code/pnpm-workspace-lab/` | 可运行的 monorepo：工作区声明、本地依赖、编排脚本 | 三 |
| 各实验台的 `README.md` | 安装方式与观察命令 | — |

## 参考

- 本模块总结：[总结](./总结.md)
- 相关篇：见第 2 篇《Vite》、第 3 篇《Webpack》
- [pnpm 官方文档](https://pnpm.io/)
- [pnpm Workspace](https://pnpm.io/workspaces)
- [pnpm 设置项](https://pnpm.io/settings)
