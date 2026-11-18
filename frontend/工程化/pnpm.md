# pnpm

## 一、npm 问题：重复安装与幽灵依赖

npm 从 v3 起把依赖尽量拍平到项目顶层的 `node_modules`，解决深层嵌套的路径长度问题。代价有两个：

1. **同名包的不同版本各留一份**。不同子树依赖同一库的不同版本时，冲突的那份只能嵌套在依赖方下面，磁盘上出现多份副本。
2. **传递依赖全部暴露在顶层**。源码可以 `require` 一个自己没声明的包——这就是幽灵依赖（phantom dependency）。

### 重复安装：一个包名，两处实体

`is-even@1.0.0` 依赖 `is-odd@0.1.2`，后者要 `is-number@3.0.0`；根工程又直接声明 `is-odd@3.0.1`，它要 `is-number@6.0.0`：

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

平坦树只能每个包名留一份在顶层，另一份嵌进依赖方自己的 `node_modules`。`npm ls --all` 能直接看到两个版本：

```txt
npm-lab@1.0.0 E:\working\blog\frontend\工程化\code\npm-lab
├─┬ is-even@1.0.0
│ └─┬ is-odd@0.1.2
│   └─┬ is-number@3.0.0
│     └─┬ kind-of@3.2.2
│       └── is-buffer@1.1.6
└─┬ is-odd@3.0.1
  └── is-number@6.0.0
```

落到磁盘上，两份 `is-number` 分别在顶层和 `is-even` 的子树里：

```
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

同一句 `require('is-number')`，从不同目录出发命中不同副本：

```bash
node -p "require('is-number/package.json').version"                                        # 6.0.0
node -p "require('./node_modules/is-even/node_modules/is-number/package.json').version"    # 3.0.0
```

- 顶层 `is-odd@3.0.1` / `is-number@6.0.0` 是根工程直接要的版本；`is-odd@0.1.2` / `is-number@3.0.0` 只存在于 `is-even` 的子树里，项目源码解析不到。
- 重复安装不只是磁盘上多几份文件：同一行 `require` 从不同位置拿到不同版本，运行时行为跟着变。
- 提升的副作用会扩散：`is-number@3.0.0` 的依赖 `is-buffer` / `kind-of` 也被拍到了顶层，同样没有出现在任何 `package.json` 里。

### 幽灵依赖：没声明的包也能 require

还是同一个工程：`package.json` 里只有 `is-even` 与 `is-odd`，`is-number` 只是它们拉进来的传递依赖，却被拍到了顶层。

```powershell
Get-ChildItem node_modules -Directory | Select-Object -ExpandProperty Name
# is-buffer
# is-even
# is-number
# is-odd
# kind-of
node -p "require('is-number/package.json').version"   # 6.0.0
```

Node 解析模块时只沿目录向上找 `node_modules`，不检查是否在 `package.json` 里声明，所以这段代码"能跑"。危险不在"当前能跑"，而在"依赖别人的安装结果"：换一个包管理器、升级 `is-odd` 到不再依赖 `is-number` 的版本、或者顶层恰好由另一个包带进来不同版本的 `is-number`，同一段代码就可能解析到别的版本，甚至直接报错。pnpm 的思路是从布局上让这件事不可发生。

## 二、pnpm 核心特性

pnpm 用两个机制分别对应上面两个问题：**磁盘上只存一份**（store + 硬链接），**解析时只给直接依赖**（严格的 `node_modules`）。

### store 硬链接 + 符号链接

注册表里的包下载一次，按内容哈希落进全局 store；项目里的实体文件是 store 文件的硬链接，顶层目录只是指向 `.pnpm` 的符号链接：

```
registry
   │ 下载一次，按内容哈希落盘
   ▼
全局 store（`pnpm store path`）
   │ 硬链接：同一份文件、多个目录项、同一 inode
   ▼
项目A/node_modules/.pnpm/is-even@1.0.0/node_modules/is-even   ← 实体文件
   ▲ 符号链接（Windows 上是 junction）
项目A/node_modules/is-even
```

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

安装后顶层只有一条链接，实体和整棵依赖图都在 `.pnpm` 里：

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

`app-b` 装同一个包后，两个工程的实体文件是同一份物理文件。`fsutil hardlink list` 列出同一个文件的全部路径：

```powershell
# 在 pnpm-core-lab 根目录执行
fsutil hardlink list app-a\node_modules\.pnpm\is-even@1.0.0\node_modules\is-even\package.json
```

```txt
\.pnpm-store\v11\files\99\b0543e83fc41a5727cb53cfa763fff9954e11a8995aecb2448374f19ebb0b156c3f0d9829cb1216af647cf063339348ee09dbef8c68e650dfef0068c930a19
\working\blog\frontend\工程化\code\pnpm-core-lab\app-a\node_modules\.pnpm\is-even@1.0.0\node_modules\is-even\package.json
\working\blog\frontend\工程化\code\pnpm-core-lab\app-b\node_modules\.pnpm\is-even@1.0.0\node_modules\is-even\package.json
```

`.pnpm` 下的目录名带版本，所以两个版本可以并存；每个包的依赖挂在它旁边的 `node_modules` 里：

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

三个层次各司其职：

| 位置 | 是什么 | 作用 |
| --- | --- | --- |
| 全局 store | 按内容寻址的文件仓库 | 同一份内容只存一次，跨项目、跨分支共享 |
| `node_modules/.pnpm/<name>@<version>/node_modules/<name>` | 包的实体目录 | 每个"包 + 版本"一个目录，目录旁挂它自己的依赖链接 |
| `node_modules/<name>` | 指向 `.pnpm` 的符号链接 | 只暴露 `package.json` 里直接声明的包 |

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
