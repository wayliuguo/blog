# pnpm

## 一、npm 问题：重复安装与幽灵依赖

npm 从 v3 起把依赖尽量拍平到项目顶层的 `node_modules`，解决深层嵌套的路径长度问题。代价有两个：

1. **同名包的不同版本各留一份**。不同子树依赖同一库的不同版本时，冲突的那份只能嵌套在依赖方下面，磁盘上出现多份副本。
2. **传递依赖全部暴露在顶层**。源码可以 `require` 一个自己没声明的包——这就是幽灵依赖（phantom dependency）。

### 重复安装：一个包名，两处实体

`is-even@1.0.0` 依赖 `is-odd@0.1.2`，后者要 `is-number@3.0.0`；根工程又直接声明 `is-odd@3.0.1`，它要 `is-number@6.0.0`。平坦树只能每个包名留一份在顶层，另一份嵌进依赖方自己的 `node_modules`：

```
app/node_modules/
├── is-buffer@1.1.6
├── is-even@1.0.0
│   └── node_modules/
│       ├── is-number@3.0.0        ← 冲突版本，只能嵌套
│       └── is-odd@0.1.2
├── is-number@6.0.0                ← 顶层：根工程要的版本
├── is-odd@3.0.1
└── kind-of@3.2.2
```

同一句 `require('is-number')`，换个目录就命中另一份副本：

> 示意片段（无配套脚本）

```js
require('is-number') // 项目根目录 → 顶层副本 6.0.0
require('is-number') // node_modules/is-even 内 → 嵌套副本 3.0.0
```

- 顶层 `is-odd@3.0.1` / `is-number@6.0.0` 是根工程直接要的版本；`is-odd@0.1.2` / `is-number@3.0.0` 只存在于 `is-even` 的子树里，项目源码解析不到。
- 重复安装不只是磁盘上多几份文件：同一行 `require` 在不同位置拿到不同版本，运行时行为跟着变。
- 提升的副作用还会扩散：`is-number@3.0.0` 的依赖 `is-buffer` / `kind-of` 也被拍到了顶层，同样没有出现在任何 `package.json` 里。

### 幽灵依赖：没声明的包也能 require

把对照缩到一条链：`package.json` 只声明 `is-odd`，源码却直接 `require` 它的传递依赖 `is-number`。

> 示意片段（无配套脚本）

```json
{
    "name": "phantom-demo",
    "private": true,
    "dependencies": {
        "is-odd": "3.0.1"
    }
}
```

npm 安装后，`is-number` 被提升到顶层，和自己的父包并排：

```
phantom-demo/node_modules/
├── is-number@6.0.0        ← 没声明，但被提升上来
└── is-odd@3.0.1
```

> 示意片段（无配套脚本）

```js
// package.json 里只有 is-odd；Node 解析时不检查是否声明
require('is-number') // 能跑：顶层就有
```

幽灵依赖的危险不在"当前能跑"，而在"依赖别人的安装结果"：换一个包管理器、升级 `is-odd` 到不再依赖 `is-number` 的版本、或者顶层恰好由另一个包带进来不同版本的 `is-number`，同一段代码就可能解析到别的版本，甚至直接报错。pnpm 的思路是从布局上让这件事不可发生。

## 二、pnpm 不复制文件：store 硬链接 + 符号链接

pnpm 不往项目里复制包文件，而是维护一份全局 store，再用链接把包装进项目：

```
registry
   │ 下载一次，按内容哈希落盘
   ▼
全局 store（pnpm store path）
   │ 硬链接：同一份文件、多个目录项、同一 inode
   ▼
项目A/node_modules/.pnpm/is-odd@3.0.1/node_modules/is-odd   ← 实体文件
   ▲ 符号链接（Windows 上是 junction）
项目A/node_modules/is-odd
```

装完一个包，项目的 `node_modules` 是三层结构：

```
app/node_modules/
├── .pnpm/
│   ├── is-number@6.0.0/
│   │   └── node_modules/is-number/        ← 实体文件，硬链接到 store
│   ├── is-odd@3.0.1/
│   │   └── node_modules/
│   │       ├── is-number -> ../../is-number@6.0.0/node_modules/is-number
│   │       └── is-odd/                    ← 实体文件，硬链接到 store
│   └── node_modules/                      ← 私下提升区，项目源码不从这里解析
├── is-number -> .pnpm/is-number@6.0.0/node_modules/is-number
└── is-odd -> .pnpm/is-odd@3.0.1/node_modules/is-odd
```

三个层次各司其职：

| 位置 | 是什么 | 作用 |
| --- | --- | --- |
| 全局 store | 按内容寻址的文件仓库 | 同一份内容只存一次，跨项目、跨分支共享 |
| `node_modules/.pnpm/<name>@<version>/node_modules/<name>` | 包的实体目录 | 每个"包 + 版本"一个目录，目录旁挂它自己的依赖链接 |
| `node_modules/<name>` | 指向 `.pnpm` 的符号链接 | 只暴露 `package.json` 里直接声明的包 |

同一个包分别装进两个工程，文件系统层面有两条证据：`lstat` 顶层 `is-odd` 得到的是符号链接（不是目录）；`stat` 两个工程里 `.pnpm/is-odd@3.0.1/node_modules/is-odd/package.json`，inode 相同、`nlink=3`——store 一份，两个工程各一份。

- **同一 inode** 表示两个工程里看到的是同一份物理文件，而不是两份副本。
- `nlink` 是硬链接计数：store 里一份 + 每个装过它的工程各一份。换台机器装过别的项目，数字会变，但"多个项目共享同一份文件"的关系不变。
- `.pnpm` 里的目录名带版本（`is-odd@3.0.1`），所以两个版本可以并存；`is-odd` 自己的依赖在它旁边的 `node_modules` 里，只有它能解析到。

两个实践细节：

- **store 必须与项目同盘才能硬链接**。跨盘（比如 store 在 C:、项目在 E:）时 pnpm 会退化为复制，磁盘与安装速度都变差；`package-import-method` 可以显式指定 `hardlink` / `copy` / `clone`。
- **不要手改 `node_modules` 里的文件**。硬链接意味着改动会直接写进 store，污染其他项目；包内容应视为只读。

## 三、严格的 node_modules 让幽灵依赖直接报错

同一份只声明 `is-odd` 的工程交给 pnpm 安装，顶层只会出现声明过的包：

```
app/node_modules/
├── .pnpm/
│   ├── is-number@6.0.0/
│   │   └── node_modules/is-number/
│   └── is-odd@3.0.1/
│       └── node_modules/
│           ├── is-number -> ../../is-number@6.0.0/node_modules/is-number
│           └── is-odd/
└── is-odd -> .pnpm/is-odd@3.0.1/node_modules/is-odd
```

`is-number` 确实被装了，但它在 `is-odd` 的私有依赖区里；Node 从项目源码出发只向上找 `node_modules`，顶层没有 `is-number`，于是解析失败：

> 示意片段（无配套脚本）

```js
// package.json 只声明 is-odd
require('is-number') // Error [MODULE_NOT_FOUND]
```

把 `is-number` 写进 `package.json` 再安装，顶层才会补出它的链接，代码随之恢复。这一条把幽灵依赖从"能跑但不确定"变成"安装后立刻失败"，问题在开发期就暴露。

默认布局下，pnpm 仍然会把所有依赖**私下**提升到 `node_modules/.pnpm/node_modules`，用于满足 peer 依赖和兼容部分工具，但项目源码不会从这里解析。需要临时放宽时有三档开关，按侵入性从小到大：

| 配置 | 效果 | 什么时候用 |
| --- | --- | --- |
| `public-hoist-pattern[]=*` | 把匹配的包额外链接到顶层 | 某个工具硬要求从根目录解析 |
| `shamefully-hoist=true` | 全部提升到顶层，接近 npm 布局 | 老项目迁移期的最后手段 |
| `node-linker=hoisted` | 完全改用 npm 式平坦布局 | 确实无法适配时，放弃 pnpm 的严格性 |

另一个方向的严格性是**安装脚本**：pnpm 10 起默认不执行依赖包的生命周期脚本，只在 `pnpm.onlyBuiltDependencies` 白名单里放行。这一条挡的是供应链攻击，遇到需要编译原生模块的包（如 `esbuild`）时，按提示把包名加进白名单即可。

## 四、声明与锁文件不一致时，冻结安装必须失败

`package.json` 写的是**范围**，`pnpm-lock.yaml` 记的是**这次解析出的确定结果**。锁文件按四个区组织：

> 示意片段（无配套脚本）

```yaml
lockfileVersion: '9.0'

settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false

importers:

  .:
    dependencies:
      is-odd:
        specifier: 3.0.1
        version: 3.0.1

packages:

  is-number@6.0.0:
    resolution: {integrity: sha512-Wu1VHeILBK8KAWJUAiSZQX94GmOE45Rg6/538fKwiloUu21KncEkYGPqob2oSZ5mUT73vLGrHQjKw3KMPwfDzg==}
    engines: {node: '>=0.10.0'}

  is-odd@3.0.1:
    resolution: {integrity: sha512-CQpnWPrDwmP1+SMHXZhtLtJv90yiyVfluGsX5iNCVkrhQtU3TQHsUWPG9wkdk9Lgd5yNpAg9jQEo90CBaXgWMA==}
    engines: {node: '>=4'}

snapshots:

  is-number@6.0.0: {}

  is-odd@3.0.1:
    dependencies:
      is-number: 6.0.0
```

四个区各管一件事：

| 区 | 内容 | 读法 |
| --- | --- | --- |
| `settings` | 安装期开关 | `autoInstallPeers` 表示自动补 peer 依赖 |
| `importers` | 每个工作区工程的直接依赖 | `specifier` 是 `package.json` 里的范围，`version` 是解析结果 |
| `packages` | 每个"包 + 版本"的来源与完整性 | `resolution.integrity` 校验下载内容 |
| `snapshots` | 每个版本的依赖边 | `is-odd@3.0.1` 依赖 `is-number: 6.0.0` |

只改 `package.json`、不动锁文件，冻结安装会直接拒绝：

> 示意片段（无配套脚本）

```bash
# package.json 加了新依赖，但没重新生成锁文件
pnpm install --frozen-lockfile
# → ERR_PNPM_OUTDATED_LOCKFILE
```

- **CI 默认冻结**。检测到 `CI` 环境变量时，pnpm 的 `frozen-lockfile` 默认为 `true`，不需要额外参数；显式写 `--frozen-lockfile` 是为了让本地脚本在两种环境下行为一致。
- **本地改依赖后要更新锁文件**。`pnpm install --no-frozen-lockfile` 或 `pnpm install --lockfile-only` 都可以；后者只写锁文件、不落 `node_modules`，适合先提交锁文件再统一安装。
- **升级走命令，不手改锁文件**。`pnpm update` 在声明范围内升级，`pnpm update --latest` 改声明范围；手改 `pnpm-lock.yaml` 会和 `integrity`、依赖边一起失配。
- **强制统一传递依赖版本**用 `pnpm.overrides`（写在 `package.json`），锁文件里会体现被改写后的解析结果；团队内统一版本还可用 `catalog:` 协议，把版本集中写在 `pnpm-workspace.yaml`。

## 五、workspace 用本地链接替代发版

pnpm 的 monorepo 只需要一个 `pnpm-workspace.yaml` 声明包目录：

> 摘自 `./code/pnpm-lab/fixtures/workspace/pnpm-workspace.yaml`

```yaml
packages:
    - 'packages/*'
    - 'apps/*'
```

包之间的本地依赖用 `workspace:` 协议声明，而不是写死版本号：

> 摘自 `./code/pnpm-lab/fixtures/workspace/packages/ui/package.json`

```json
{
    "name": "@lab/ui",
    "version": "1.0.0",
    "private": true,
    "main": "index.js",
    "scripts": {
        "build": "node -e \"console.log('build @lab/ui')\""
    },
    "dependencies": {
        "@lab/utils": "workspace:*"
    }
}
```

安装后，`workspace:*` 变成指向本地目录的符号链接，锁文件里也能看到 `link:`：

> 摘自 `./code/pnpm-lab/cases/workspace.mjs`（运行：`pnpm lab workspace`）

```js
export async function runCase({ root }) {
    const dir = copyFixture(path.join(root, 'fixtures/workspace'), path.join(root, '.work/workspace'))
    run('pnpm install --reporter=silent', dir)

    const linkOf = target => {
        const link = fs.lstatSync(target)
        return `${link.isSymbolicLink() ? '符号链接' : '普通目录'} -> ${rel(dir, fs.realpathSync(target))}`
    }

    console.log(`web 的 @lab/ui       ${linkOf(path.join(dir, 'apps/web/node_modules/@lab/ui'))}`)
    console.log(`ui 的 @lab/utils     ${linkOf(path.join(dir, 'packages/ui/node_modules/@lab/utils'))}`)
    console.log(`web 运行结果         ${run('node apps/web/index.js', dir)}`)
    console.log('锁文件里的 workspace 协议：')
    console.log(
        fs
            .readFileSync(path.join(dir, 'pnpm-lock.yaml'), 'utf8')
            .split('\n')
            .filter(line => /workspace:|link:/.test(line))
            .join('\n')
    )
    console.log('按依赖图执行 build：')
    console.log(run('pnpm --filter @lab/web... --reporter=append-only run build', dir))
}
```

```txt
web 的 @lab/ui       符号链接 -> packages/ui
ui 的 @lab/utils     符号链接 -> packages/utils
web 运行结果         <section>hello pnpm</section>
锁文件里的 workspace 协议：
        specifier: workspace:*
        version: link:../../packages/ui
        specifier: workspace:*
        version: link:../../packages/utils
        specifier: workspace:*
        version: link:../utils
按依赖图执行 build：
Scope: all 3 workspace projects
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

- `workspace:*` 的好处是**版本与源码永远同步**：本地包改完即生效，不需要先发版；执行 `pnpm publish` 打包时，pnpm 会把它替换成真实版本号。
- `--filter @lab/web...` 里的 `...` 表示"web 及其全部依赖"，pnpm 按依赖图做拓扑排序后依次执行，所以顺序固定是 `utils → ui → web`。反过来 `--filter ...@lab/utils` 选的是 utils 及其所有使用方。
- 常用编排：`pnpm -r run build` 跑所有包（同样按拓扑序），`pnpm --filter ./packages/* run test` 按目录过滤，`pnpm -r --parallel run dev` 显式放弃顺序、并行执行。

## 六、CI 先 fetch 进 store，再离线安装

CI 里最稳的安装顺序分两步：先只凭锁文件把包抓进 store，再做一次不允许联网的链接。

> 示意片段（无配套脚本）

```bash
# 1. 只读锁文件把 tarball 抓进专用 store，不建 node_modules
pnpm fetch --store-dir .store

# 2. 离线安装：store 缺任何一个包都会失败，而不是偷偷联网补齐
pnpm install --offline --frozen-lockfile --store-dir .store
```

- **`pnpm fetch` 只读锁文件**。它不需要 `package.json` 的完整源码，也不建立 `node_modules` 里的链接，只把 tarball 下载进 store，因此可以单独做成一层缓存。
- **`--offline` 是验证**。离线安装成功，说明 store 已经包含锁文件要求的全部内容；漏包会直接失败，而不是偷偷联网补齐。
- **缓存键用锁文件哈希**。CI 缓存目录取 `pnpm store path`；锁文件不变则 store 命中，`fetch` 基本只做校验。
- **版本也要锁**。`package.json` 里写 `"packageManager": "pnpm@11.5.2"`，配合 Corepack 让本地与 CI 用同一个 pnpm；否则 pnpm 大版本变化可能带来锁文件版本与安装行为的差异。
- **Docker 分层**：先拷 `package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml` 执行 `pnpm fetch`，再拷源码执行 `pnpm install --offline --frozen-lockfile`；源码变动不会让依赖层缓存失效。

## 七、迁移：命令对照与四个常见坑

| npm | pnpm | 说明 |
| --- | --- | --- |
| `npm install` | `pnpm install` | 读锁文件安装 |
| `npm ci` | `pnpm install --frozen-lockfile` | 锁文件与声明不一致就失败 |
| `npm install pkg` | `pnpm add pkg` | 写入 `dependencies` |
| `npm install -D pkg` | `pnpm add -D pkg` | 写入 `devDependencies` |
| `npm uninstall pkg` | `pnpm remove pkg` | — |
| `npm run build` | `pnpm build` / `pnpm run build` | 内置命令与脚本同名时加 `run` |
| `npm ls` | `pnpm list` | — |
| `npm explain pkg` | `pnpm why pkg` | 打印依赖链 |
| `npm outdated` | `pnpm outdated` | — |
| `npm update` | `pnpm update` | 在声明范围内升级 |
| `npx foo` | `pnpm dlx foo` | 临时执行，不写入项目 |
| `npm publish` | `pnpm publish` | 自动替换 `workspace:*` |

迁移顺序：

1. 删掉 `node_modules` 与 `package-lock.json`；
2. 有旧锁文件时先 `pnpm import`，把 npm 的解析结果转成 `pnpm-lock.yaml`；
3. `pnpm install`，检查 peer 依赖警告与原生模块的生命周期脚本白名单；
4. 在 `package.json` 写 `packageManager` 字段，启用 Corepack 固定版本；
5. CI 缓存 store 目录，并加上 `--frozen-lockfile`。

四个常见坑：

- **手改 `node_modules`**：硬链接会把改动带回 store，影响其他项目。
- **缺 peer 依赖**：`autoInstallPeers` 默认开启，但版本冲突仍要显式声明或加 `pnpm.peerDependencyRules`。
- **依赖装完不编译**：pnpm 10+ 默认拦截生命周期脚本，按提示写 `onlyBuiltDependencies`。
- **跨盘安装变慢**：store 与项目分属不同盘时硬链接失效，改为同盘或显式设置 `package-import-method`。

## 配套代码

本篇只有 workspace 一节有配套脚本，其余小节为示意片段。lab 无第三方依赖，直接运行：

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/pnpm-lab/package.json` | 唯一命令 `lab`：`pnpm lab workspace` | 五 |
| `./code/pnpm-lab/lab.mjs` | case 分发 | 五 |
| `./code/pnpm-lab/cases/_util.mjs` | 执行命令、复制 fixture、路径格式化 | 五 |
| `./code/pnpm-lab/cases/workspace.mjs` | `workspace:*` 链接、`--filter` 拓扑编排 | 五 |
| `./code/pnpm-lab/fixtures/workspace/` | 三包 monorepo：`utils` / `ui` / `web` + 锁文件 | 五 |
| `./code/pnpm-lab/README.md` | case 与运行说明 | — |

## 参考

- 本模块总结：[总结](./总结.md)
- 相关篇：见第 2 篇《Vite》、第 3 篇《Webpack》
- [pnpm 官方文档](https://pnpm.io/)
- [pnpm Workspace](https://pnpm.io/workspaces)
- [pnpm 设置项](https://pnpm.io/settings)
