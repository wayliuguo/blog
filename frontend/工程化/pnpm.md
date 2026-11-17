# pnpm

## 一、npm 平坦树：重复安装与幽灵依赖

npm 从 v3 起把依赖尽量拍平到项目顶层的 `node_modules`，解决深层嵌套的路径长度问题。代价有两个：

1. **同一份文件被装多次**。不同包依赖同一库的不同版本时，冲突的那份只能嵌套在依赖方下面，磁盘上出现多份副本。
2. **传递依赖全部暴露在顶层**。源码可以 `require` 一个自己没声明的包——这就是幽灵依赖（phantom dependency）。

本 lab 的对照组只声明 `is-odd`，源码却直接 `require` 它的传递依赖 `is-number`：

> 摘自 `./code/pnpm-lab/fixtures/strict-pkg/src/check.js`（运行：`pnpm lab strict`）

```js
// package.json 只声明了 is-odd；is-number 是它的传递依赖，没有直接声明
try {
    require('is-number')
    console.log('未声明依赖可用（被提升到顶层）')
} catch (err) {
    console.log(`未声明依赖不可用（${err.code}）`)
}
```

npm 安装后，`is-number` 被提升到顶层，于是这段代码跑得通：

```txt
npm 顶层            is-number is-odd
npm 运行 check.js   未声明依赖可用（被提升到顶层）
```

幽灵依赖的危险不在"当前能跑"，而在"依赖别人的安装结果"：换一个包管理器、升级 `is-odd` 到不再依赖 `is-number` 的版本、或者顶层恰好由另一个包带进来不同版本的 `is-number`，同一段代码就可能解析到别的版本，甚至直接报错。pnpm 的思路是从布局上让这件事不可发生。

## 二、pnpm 不复制文件：store 硬链接 + 符号链接

pnpm 不往项目里复制包文件，而是维护一份全局 store，再用链接把包装进项目：

```
registry
   │ 下载一次，按内容哈希落盘
   ▼
全局 store（`pnpm store path`）
   │ 硬链接：同一份文件、多个目录项、同一 inode
   ▼
项目A/node_modules/.pnpm/is-odd@3.0.1/node_modules/is-odd   ← 实体文件
   ▲ 符号链接（Windows 上是 junction）
项目A/node_modules/is-odd
```

三个层次各司其职：

| 位置 | 是什么 | 作用 |
| --- | --- | --- |
| 全局 store | 按内容寻址的文件仓库 | 同一份内容只存一次，跨项目、跨分支共享 |
| `node_modules/.pnpm/<name>@<version>/node_modules/<name>` | 包的实体目录 | 每个"包 + 版本"一个目录，目录旁挂它自己的依赖链接 |
| `node_modules/<name>` | 指向 `.pnpm` 的符号链接 | 只暴露 `package.json` 里直接声明的包 |

实验在独立 store 下把同一个 `is-odd@3.0.1` 装进两个临时工程，再比较实体文件：

> 摘自 `./code/pnpm-lab/cases/store.mjs`（运行：`pnpm lab store`）

```js
export async function runCase({ root }) {
    const storeDir = path.join(root, '.work/store')
    const dirs = ['store-a', 'store-b'].map(name => {
        const dir = fresh(path.join(root, '.work', name))
        fs.writeFileSync(
            path.join(dir, 'package.json'),
            JSON.stringify({ name, private: true, dependencies: { 'is-odd': '3.0.1' } }, null, 4)
        )
        run(`pnpm install --reporter=silent --prefer-offline --store-dir "${storeDir}"`, dir)
        return dir
    })

    const pkgOf = dir => path.join(dir, 'node_modules/.pnpm/is-odd@3.0.1/node_modules/is-odd/package.json')
    const [a, b] = dirs
    const statA = fs.statSync(pkgOf(a))
    const statB = fs.statSync(pkgOf(b))
    const topLink = fs.lstatSync(path.join(a, 'node_modules/is-odd'))
    const real = fs.realpathSync(path.join(a, 'node_modules/is-odd'))

    console.log(`专用 store         ${rel(root, storeDir)}`)
    console.log(`.pnpm 里的实体     ${rel(a, path.dirname(pkgOf(a)))}`)
    console.log(`顶层 is-odd        ${topLink.isSymbolicLink() ? '符号链接' : '普通目录'} -> ${rel(a, real)}`)
    console.log(`两个工程同一文件   同一 inode：${statA.ino === statB.ino ? '是' : '否'}，nlink=${statB.nlink}`)
    console.log(
        `.pnpm 下的包       ${fs
            .readdirSync(path.join(a, 'node_modules/.pnpm'))
            .filter(name => !name.startsWith('.') && name !== 'lock.yaml' && name !== 'node_modules')
            .sort()
            .join(' ')}`
    )
}
```

```txt
专用 store         .work/store
.pnpm 里的实体     node_modules/.pnpm/is-odd@3.0.1/node_modules/is-odd
顶层 is-odd        符号链接 -> node_modules/.pnpm/is-odd@3.0.1/node_modules/is-odd
两个工程同一文件   同一 inode：是，nlink=3
.pnpm 下的包       is-number@6.0.0 is-odd@3.0.1
```

- **同一 inode** 表示两个工程里看到的 `package.json` 是同一份物理文件，而不是两份副本。
- `nlink=3` 是文件系统的硬链接计数：store 里一份 + 两个工程各一份。换台机器装过别的项目，这个数字会变，但"多个项目共享同一份文件"的关系不变。
- `.pnpm` 里的目录名带版本（`is-odd@3.0.1`），所以两个版本可以并存；`is-odd` 自己的依赖在它旁边的 `node_modules` 里，只有它能解析到。

两个实践细节：

- **store 必须与项目同盘才能硬链接**。跨盘（比如 store 在 C:、项目在 E:）时 pnpm 会退化为复制，磁盘与安装速度都变差；`package-import-method` 可以显式指定 `hardlink` / `copy` / `clone`。
- **不要手改 `node_modules` 里的文件**。硬链接意味着改动会直接写进 store，污染其他项目；包内容应视为只读。

## 三、严格的 node_modules 让幽灵依赖直接报错

同样的对照组换成 pnpm 安装，源码再 `require('is-number')`：

> 摘自 `./code/pnpm-lab/cases/strict.mjs`（运行：`pnpm lab strict`）

```js
export async function runCase({ root }) {
    const fixture = path.join(root, 'fixtures/strict-pkg')
    const base = fresh(path.join(os.tmpdir(), 'pnpm-lab-strict'))
    const npmDir = copyFixture(fixture, path.join(base, 'npm'))
    const pnpmDir = copyFixture(fixture, path.join(base, 'pnpm'))

    run('npm install --silent --no-audit --no-fund', npmDir)
    run('pnpm install --reporter=silent --no-frozen-lockfile', pnpmDir)

    console.log(`npm 顶层            ${topLevel(npmDir).join(' ')}`)
    console.log(`pnpm 顶层           ${topLevel(pnpmDir).join(' ')}`)
    console.log(`npm 运行 check.js   ${run('node src/check.js', npmDir)}`)
    console.log(`pnpm 运行 check.js  ${run('node src/check.js', pnpmDir)}`)

    // 补上显式声明后，pnpm 也会把 is-number 放到顶层
    const pkgFile = path.join(pnpmDir, 'package.json')
    const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'))
    pkg.dependencies['is-number'] = '6.0.0'
    fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 4) + '\n')
    run('pnpm install --reporter=silent --no-frozen-lockfile', pnpmDir)

    console.log(`pnpm 补声明后顶层   ${topLevel(pnpmDir).join(' ')}`)
    console.log(`pnpm 补声明后结果   ${run('node src/check.js', pnpmDir)}`)
}
```

```txt
npm 顶层            is-number is-odd
pnpm 顶层           is-odd
npm 运行 check.js   未声明依赖可用（被提升到顶层）
pnpm 运行 check.js  未声明依赖不可用（MODULE_NOT_FOUND）
pnpm 补声明后顶层   is-number is-odd
pnpm 补声明后结果   未声明依赖可用（被提升到顶层）
```

pnpm 的顶层只有直接声明的 `is-odd`；`is-number` 虽然也在 `node_modules/.pnpm` 里，但位于 `is-odd` 的私有依赖区，从项目源码解析不到。把 `is-number` 写进 `package.json` 后，顶层才会出现它的链接，代码随之恢复。

默认布局下，pnpm 仍然会把所有依赖**私下**提升到 `node_modules/.pnpm/node_modules`，用于满足 peer 依赖和兼容部分工具，但项目源码不会从这里解析。需要临时放宽时有三档开关，按侵入性从小到大：

| 配置 | 效果 | 什么时候用 |
| --- | --- | --- |
| `public-hoist-pattern[]=*` | 把匹配的包额外链接到顶层 | 某个工具硬要求从根目录解析 |
| `shamefully-hoist=true` | 全部提升到顶层，接近 npm 布局 | 老项目迁移期的最后手段 |
| `node-linker=hoisted` | 完全改用 npm 式平坦布局 | 确实无法适配时，放弃 pnpm 的严格性 |

另一个方向的严格性是**安装脚本**：pnpm 10 起默认不执行依赖包的生命周期脚本，只在 `pnpm.onlyBuiltDependencies` 白名单里放行。这一条挡的是供应链攻击，遇到需要编译原生模块的包（如 `esbuild`）时，按提示把包名加进白名单即可。

> 实验里有一个容易踩的坑：`strict` 的两个临时工程放在系统临时目录，而不是仓库内。放在 `E:\working\blog` 下时，Node 会沿父目录向上找到博客仓库自己的 `node_modules`，`is-number` 被上层命中，pnpm 也会"看起来"能解析幽灵依赖。判断严格性时，工程必须放在没有父级 `node_modules` 的干净路径。

## 四、声明与锁文件不一致时，冻结安装必须失败

`package.json` 写的是**范围**，`pnpm-lock.yaml` 记的是**这次解析出的确定结果**。实验先由声明生成锁文件，再改动声明但不更新锁文件：

> 摘自 `./code/pnpm-lab/cases/lockfile.mjs`（运行：`pnpm lab lockfile`）

```js
export async function runCase({ root }) {
    const dir = fresh(path.join(root, '.work/lockfile'))
    const pkgFile = path.join(dir, 'package.json')
    fs.writeFileSync(
        pkgFile,
        JSON.stringify({ name: 'lockfile-demo', private: true, dependencies: { 'is-odd': '3.0.1' } }, null, 4) + '\n'
    )

    run('pnpm install --lockfile-only --reporter=silent', dir)
    const lockFile = path.join(dir, 'pnpm-lock.yaml')
    const lock = fs.readFileSync(lockFile, 'utf8')

    console.log(`lockfileVersion    ${lock.match(/^lockfileVersion: (.+)$/m)[1]}`)
    console.log('pnpm-lock.yaml：')
    console.log(lock.trimEnd())

    // 只改 package.json，不动锁文件
    const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'))
    pkg.dependencies['is-number'] = '6.0.0'
    fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 4) + '\n')

    let frozen = '未失败'
    try {
        run('pnpm install --frozen-lockfile --reporter=append-only', dir)
    } catch (err) {
        const text = `${err.message || ''}\n${err.stdout || ''}\n${err.stderr || ''}`
        frozen = (text.match(/ERR_PNPM_[A-Z_]+/) || ['未捕获错误码'])[0]
    }
    console.log(`frozen 安装        ${frozen}`)

    run('pnpm install --lockfile-only --reporter=silent', dir)
    const updated = fs.readFileSync(lockFile, 'utf8')
    const direct = /is-number:\s*\n\s*specifier: 6\.0\.0/.test(updated)
    console.log(`重新生成锁文件      直接依赖 is-number 已写入 importers：${direct ? '是' : '否'}`)
}
```

生成的锁文件（pnpm 11 对应 `lockfileVersion: '9.0'`）：

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

锁文件与声明不一致时，冻结安装直接失败：

```txt
frozen 安装        ERR_PNPM_OUTDATED_LOCKFILE
重新生成锁文件      直接依赖 is-number 已写入 importers：是
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

> 摘自 `./code/pnpm-lab/cases/ci.mjs`（运行：`pnpm lab ci`）

```js
export async function runCase({ root }) {
    const dir = copyFixture(path.join(root, 'fixtures/workspace'), path.join(root, '.work/ci'))
    const store = rel(dir, path.join(dir, '.store'))

    run(`pnpm fetch --store-dir ${store} --reporter=silent`, dir)
    const linked = fs.existsSync(path.join(dir, 'apps/web/node_modules/@lab/ui')) ? '存在' : '不存在'

    run(`pnpm install --offline --frozen-lockfile --store-dir ${store} --reporter=silent`, dir)

    console.log(`fetch 后 web 的链接      ${linked}`)
    console.log(`离线安装                成功`)
    console.log(`专用 store              ${store}`)
    console.log(`web 运行结果            ${run('node apps/web/index.js', dir)}`)
}
```

```txt
fetch 后 web 的链接      不存在
离线安装                成功
专用 store              .store
web 运行结果            <section>hello pnpm</section>
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

本篇示例来自 `code/pnpm-lab`（独立的 pnpm 项目，首次运行前先 `pnpm install`）。

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/pnpm-lab/package.json` | 唯一命令 `lab`：`pnpm lab <case>` | 二～六 |
| `./code/pnpm-lab/lab.mjs` | case 分发：`store` / `strict` / `lockfile` / `workspace` / `ci` | 二～六 |
| `./code/pnpm-lab/cases/_util.mjs` | 执行命令、复制 fixture、顶层包名与相对路径格式化 | 二～六 |
| `./code/pnpm-lab/cases/store.mjs` | 两个临时工程共享 store：inode、`nlink`、符号链接 | 二 |
| `./code/pnpm-lab/cases/strict.mjs` | npm / pnpm 对照：幽灵依赖、补声明后恢复 | 三 |
| `./code/pnpm-lab/cases/lockfile.mjs` | 生成锁文件、`--frozen-lockfile` 门禁 | 四 |
| `./code/pnpm-lab/cases/workspace.mjs` | `workspace:*` 链接、`--filter` 拓扑编排 | 五 |
| `./code/pnpm-lab/cases/ci.mjs` | `pnpm fetch` + 离线冻结安装 | 六 |
| `./code/pnpm-lab/fixtures/strict-pkg/` | 只声明 `is-odd`、源码却 `require('is-number')` 的对照组 | 一、三 |
| `./code/pnpm-lab/fixtures/workspace/` | 三包 monorepo：`utils` / `ui` / `web` + 锁文件 | 五、六 |
| `./code/pnpm-lab/README.md` | case ↔ 篇目对照与运行说明 | — |

## 参考

- 本模块总结：[总结](./总结.md)
- 相关篇：见第 2 篇《Vite》、第 3 篇《Webpack》
- [pnpm 官方文档](https://pnpm.io/)
- [pnpm Workspace](https://pnpm.io/workspaces)
- [pnpm 设置项](https://pnpm.io/settings)
