# pnpm

## npm 问题：重复安装与幽灵依赖

npm 从 v3 起把依赖尽量拍平到项目顶层的 `node_modules`，解决深层嵌套的路径长度问题。代价有两个：

1. **同名包的不同版本各留一份**。不同子树依赖同一库的不同版本时，冲突的那份只能嵌套在依赖方下面，磁盘上出现多份副本。
2. **传递依赖全部暴露在顶层**。源码可以 `require` 一个自己没声明的包——这就是幽灵依赖（phantom dependency）。

### 重复安装

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

```
node_modules
├── react -> .pnpm/react@18.2.0/node_modules/react      # 直接依赖：符号链接
└── .pnpm
    ├── react@18.2.0
    │   └── node_modules
    │       └── react（文件是硬链接，指向全局store）
    └── loose-envify@1.4.0
        └── node_modules
            └── loose-envify（硬链接）

```

### store 硬链接 + 符号链接（省内存、安装快）
- 全局 store：所有包文件只存一份，多个项目共用同一个 store；
  ```
  # 查看 store 路径
  pnpm store path
  ```
- 硬链接：`node_modules/.pnpm` 里的包文件是硬链接
- 符号链接：项目根 `node_modules/xxx` 是符号链接

### 严格 node_modules 让幽灵依赖直接报错
传递依赖全部隔离在 `.pnpm` 子目录里，不会提升到根 node_modules，避免幽灵依赖。

## 构建 monorepo

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

### 工作区骨架

- pnpm-workspace.yaml
  - 声明哪些目录是工作区成员
- package.json
  - `private: true` 防止根工程被误发布——根工程不产出包，只做编排。
  - 根 `scripts` 只是常用命令的快捷方式
    - `r=--recursive`：递归，全部子包都执行
    - `-F=--filter`：过滤，挑选一部分子包执行

```yaml
// pnpm-workspace.yaml
packages:
    - 'packages/*'
    - 'apps/*'

// package.json
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

### 建子包与声明本地依赖
- 建子包
  - 对应工作区成员目录，需要新建 `package.json` 声明
  - `name` 必填，
  - `private: true|false` 根据是否要发布进行设置
- 声明本地依赖
  - 依赖本地包时用 `workspace:` 协议，好处是**版本与源码永远同步**：本地改完即生效，不会引用线上npm版本
  - 依赖外部包时用普通版本号
- 新增依赖命令 
```
pnpm --filter @lab/ui  @lab/utils@workspace:*  # 在 ui 里加本地依赖
pnpm --filter @lab/ui add lodash               # 在 ui 里加外部依赖
pnpm install                                   # 建链、写锁文件
```
- 对应的子包如下
```json
// pnpm-workspace-lab/packages/ui/package.json
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

// pnpm-workspace-lab/apps/web/package.json
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
| `./code/pnpm-workspace-lab/` | 可运行的 monorepo：工作区声明、本地依赖、编排脚本 | 三 |
| 各实验台的 `README.md` | 安装方式与观察命令 | — |