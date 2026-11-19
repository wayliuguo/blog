# 模块系统与包管理

《模块系统与包管理》配套实验代码：CommonJS / ES Module 的本质特征、解析时机、加载语义、互操作、缓存与 `exports` 陷阱。

对应博客：`node/运行环境/模块系统与包管理.md`。

## 环境要求

- `mr05`（CJS 同步 require ESM）需要 Node 20.17+ / 22.12+；其余脚本 Node 18+ 即可
- 本目录 `package.json` 设了 `"type": "commonjs"`，所以 `.js` 文件按 CommonJS 解析
- 需要单文件用 ESM 的，单独用 `.mjs`（如 `02-module-esm.mjs`）
- 例外：`src/02-module-realm/08-type-switch/` 有自己的 `package.json`（`"type": "module"`），用来演示「整包开关 vs 后缀强制」
- 全部使用 Node 内置模块（`node:` 前缀），**无第三方依赖**，无需 `npm install`

## 脚本清单

| 脚本 | 演示什么 | 运行命令 | 预期输出 |
| --- | --- | --- | --- |
| `02-module-cjs.cjs` | CommonJS 侧的两个本质特征：值拷贝 + 互引 ESM | `npm run 02cjs` | 6 行输出：`module.exports` 的键、`count` 快照恒为 0、`cjs.peek()` 却是 1；ESM 侧 `inc()` 后活绑定立刻变 1 |
| `02-module-esm.mjs` | ES Module 侧的两个本质特征：活绑定 + 互引 CJS | `npm run 02esm` | 与 `npm run 02cjs` **逐行相同**（同一对模块，只是入口不同） |

### 模块系统实验组（`src/02-module-realm/`）

上面的一对 `02-module-cjs.cjs` / `02-module-esm.mjs` 只做**最小对照**：各自亮出自己的本质特征（值拷贝 vs 活绑定），并互相导入对方一次。想逐条深挖，用这一组实验：它专门演示 CommonJS 与 ES Module 的**区别与互操作**，主线就是正文反复强调的四件事：**解析时机**（静态解析 vs 运行时解析）、**加载语义**（值的拷贝 vs 活绑定）、**同步 vs 异步加载**（require 阻塞 vs import() 不阻塞）、**互操作**（ESM 引 CJS / CJS 引 ESM / 动态 import()）；另外还覆盖缓存、`exports` 陷阱、解析算法、`type` 字段与后缀强制。全部零依赖，都能单独 `node src/02-module-realm/xx` 跑通。

公共模块放在 `lib/`：`counter.cjs`（CJS 计数器）、`counter.mjs`（ESM 计数器）、`store.cjs`（CJS 多导出）、`only-esm.mjs`（纯 ESM）、`tla-esm.mjs`（带顶层 await 的 ESM）、`eval-trace.mjs`（被引入时打印顶层执行痕迹，用于观察解析时机）、`slow.cjs` / `slow.mjs`（顶层忙等 300ms，用于观察同步 vs 异步加载）；`exports` 陷阱专用模块放在 `traps/`。

| 脚本 | 演示什么 | 运行命令 | 预期输出 |
| --- | --- | --- | --- |
| `02-module-realm/01-cache.cjs` | 模块缓存：同一路径只执行一次 | `npm run mr01` | 三次 `require` 拿到的对象两两 `===` 全为 `true`；`require.cache` 里只有 1 条 `counter.cjs` 记录；手动删缓存后再 `require` 会重新执行模块体、拿到新对象 |
| `02-module-realm/02-exports-trap.cjs` | `exports` 与 `module.exports` 的陷阱 | `npm run mr02` | `exports === module.exports` 为 `true`；`exports.xxx` 挂的属性外部可见；模块里 `exports = {...}` 时外部只拿到 `{}`；替换 `module.exports` 后挂的 `exports.xxx` 是 `undefined` |
| `02-module-realm/03-cjs-value-vs-esm-binding.mjs` | 值的拷贝 vs 活绑定 | `npm run mr03` | 各调一次 `increase()` 后：CJS 快照 `count = 0`（仍是 0），ESM 活绑定 `count = 1`；`peek()` 显示 CJS 内部其实也是 1 |
| `02-module-realm/04-esm-import-cjs.mjs` | ESM 导入 CJS：默认导入 vs 命名导入 | `npm run mr04` | 默认导入拿到完整 `module.exports`；命名导入取到 `name` / `version`；`Object.keys(namespace)` = `['default','describe','name','version']`；计算属性名挂的 `dynamic` 默认导入可见、命名空间里是 `undefined` |
| `02-module-realm/05-cjs-require-esm.cjs` | CJS 用 `require()` 加载 ESM（Node 22 新能力） | `npm run mr05` | 打印 Node 版本；`require` 纯 ESM 模块成功（返回值 `[object Module]`、`__esModule = true`、`default` 与命名导出都在）；带顶层 await 的模块抛 `ERR_REQUIRE_ASYNC_MODULE` |
| `02-module-realm/06-dynamic-import.cjs` | CJS 里用 `await import()` 动态导入 ESM | `npm run mr06` | `import()` 返回值是 Promise；await 后拿到命名空间对象；对 CJS 同样有效（多一层 `default`）；变量拼路径可用 |
| `02-module-realm/07-resolve-path.cjs` | 模块解析算法与向上查找 | `npm run mr07` | `node:path` / `path` / `fs` / `os` 原样返回；相对路径解析成绝对路径；省略 `.cjs` / `.mjs` 后缀抛 `MODULE_NOT_FOUND`；不存在的包名抛 `MODULE_NOT_FOUND`；`module.paths` 打印逐级向上的 `node_modules` 链 |
| `02-module-realm/08-type-switch/run.cjs` | `"type"` 字段与后缀强制 | `npm run mr08` | 依次以独立入口运行 `esm-default.js`（ESM：`typeof require` / `__dirname` 均为 `undefined`）与 `cjs-forced.cjs`（CJS：`require` 可用），两者同目录却分属两套模块系统 |
| `02-module-realm/09-parse-time.mjs` | 解析时机：静态解析 vs 运行时解析 | `npm run mr09` | 写在 `import` 声明**上方**的 `console.log` 反而后打印，证明 import 被提升、依赖先求值；静态 import 的路径不能是变量而 `import()` 可以；静态 import 一个不存在的命名导出直接判 `SyntaxError: Named export 'notExist' not found`（退出码 1、stdout 为空），而 CJS 同样写法只是 `undefined` |
| `02-module-realm/10-sync-vs-async.mjs` | 同步 vs 异步加载：require 阻塞 vs import() 不阻塞 | `npm run mr10` | `require` 前后耗时约 303ms（对方模块顶层忙等 300ms，期间主线程被占住）；`import()` 发起后当前行耗时 0~2ms 就继续往下走、返回值是 Promise，`await` 之后才变成约 303ms |

## 运行与预期输出

逐脚本列出「脚本 / 命令 / 预期输出要点」，便于你跑完对照自检（输出均来自真实运行）。

| 脚本 | 命令 | 预期输出要点 |
| --- | --- | --- |
| `02-module-cjs.cjs` | `npm run 02cjs` | 6 行：`[CJS 模块体] 执行完毕，导出 = TAG, count, inc, peek` → `[ESM 模块体] 开始执行` → `[互操作 ESM→CJS] 调 inc() 后 count = 0 但 cjs.peek() = 1` → `[互操作 CJS→ESM] 调 inc() 后 count = 1` |
| `02-module-esm.mjs` | `npm run 02esm` | 与 `npm run 02cjs` 的输出**逐行相同**，两者退出码均为 0 |
| `02-module-realm/01-cache.cjs` | `npm run mr01` | `a === b`、`b === c`、`a === c` 全为 `true`；`counter.cjs` 在 `require.cache` 中只有 1 条记录、`loaded = true`；删缓存后再 `require` 得到新对象，且模块体日志第二次出现 |
| `02-module-realm/02-exports-trap.cjs` | `npm run mr02` | 本文件 `exports === module.exports` 为 `true`；`store` 打印出 `name` / `version` / `describe` / `dynamic`；陷阱模块分别拿到 `{}` 与 `{ viaModuleExports: true }`，`viaExportsAfterOverwrite` 是 `undefined` |
| `02-module-realm/03-cjs-value-vs-esm-binding.mjs` | `npm run mr03` | 调用前两者都是 0；各调一次 `increase()` 后 `CJS 快照 count = 0`、`ESM 活绑定 count = 1`；`cjsCounter.peek()` 返回 1，证明 CJS 内部变了只是外部看不到 |
| `02-module-realm/04-esm-import-cjs.mjs` | `npm run mr04` | 默认导入打印出完整对象；`name = node-basics-store`、`version = 1.0.0`；`Object.keys(namespace) = [ 'default', 'describe', 'name', 'version' ]`；`store.dynamic` 有值而 `namespace.dynamic` 是 `undefined` |
| `02-module-realm/05-cjs-require-esm.cjs` | `npm run mr05` | 打印 `当前 Node 版本: v22.22.2`；`require` 成功、返回值类型 `[object Module]`、`flavor = ESM`、`esm.default` 是默认导出、`__esModule = true`；第二段反例抛 `ERR_REQUIRE_ASYNC_MODULE`（顶层 await 的 ESM 同步 require 不了） |
| `02-module-realm/06-dynamic-import.cjs` | `npm run mr06` | `require` 同步返回 object；`import()` 返回值是 Promise；await 后拿到 `flavor` / `features` / `default`；`import('./lib/store.cjs')` 的键含 `default` 与命名导出；变量拼路径也能导入成功 |
| `02-module-realm/07-resolve-path.cjs` | `npm run mr07` | 内置模块 `node:path` / `path` / `fs` / `os` 原样返回；相对路径解析为绝对路径；`./lib/store`、`./lib/counter` 与不存在的包名均 `失败(MODULE_NOT_FOUND)`；`module.paths` 列出 9 级 `node_modules` 链（从 `02-module-realm` 一直到 `E:\node_modules`） |
| `02-module-realm/08-type-switch/run.cjs` | `npm run mr08` | 先打印本目录 `package.json` 的 `{"type":"module"}`；随后 `esm-default.js` 输出 `typeof require = undefined` 且 `import.meta.url` 可用，`cjs-forced.cjs` 输出 `typeof require = function`、`__dirname` 可用；两个子进程退出码都是 0 |
| `02-module-realm/09-parse-time.mjs` | `npm run mr09` | 第 1 节先打印 `[依赖模块 eval-trace.mjs] 顶层代码被执行`、再打印本文件的 A 与 B；第 2 节 `import('./lib/eval-trace.mjs')` 成功且**不会**再打印一次 eval-trace 的日志（静态 import 与动态 import() 共用同一份实例）；第 3 节子进程退出码 1、stdout 为空、报 `SyntaxError: Named export 'notExist' not found`，而 `require` 的 `store.notExist` 只是 `undefined` |
| `02-module-realm/10-sync-vs-async.mjs` | `npm run mr10` | 先 `[slow.cjs] 顶层求值完成，忙等了约 300 ms`、再 `require 返回，t = 303 ms`；`import()` 刚发起时 `t = 2 ms` 且返回值是 Promise，`[slow.mjs]` 忙等后 `await 之后拿到模块，t = 303 ms`（说明「异步」指的是调度时机，不是加载过程不占 CPU） |

## 为什么值得跑一遍

- `02cjs` / `02esm` 这一对把“值拷贝 vs 活绑定”和“两套系统怎么互引”压到最小：两个文件、六行输出，跑哪个入口都一样；
- `02-module-realm/01`~`10` 再把“解析时机、同步 vs 异步加载、缓存只执行一次、`exports` 陷阱、解析算法”逐条放大成可对照的输出，被追问 `require` 与 `import` 的区别时可以直接用跑出来的结果回答。

## 注意事项

- `02-module-realm/08-type-switch/` 是唯一自带 `package.json`（`"type": "module"`）的子目录，入口 `run.cjs` 靠后缀强制按 CommonJS 解析；请按 `npm run mr08` 或 `node src/02-module-realm/08-type-switch/run.cjs` 运行，子目录里另有 README 说明。
- `02-module-realm/lib/counter.cjs` 在被加载时会打印一行「模块体被执行」，这是 `01-cache.cjs` / `03-*.mjs` 判断模块体执行了几次的依据，看到这行重复出现说明缓存被清过。
- `02-module-realm/05-cjs-require-esm.cjs` 需要 Node 20.17+ / 22.12+ 才支持同步 `require` ESM；版本不够时脚本会 catch 住错误并打印 `code`，不会崩溃。
- `02-module-realm/09-parse-time.mjs` 会用子进程（`--input-type=module -e`）跑一段“导入不存在的命名导出”的代码，只为让你看到退出码与报错；子进程失败不影响主进程，主进程退出码仍是 0。
- `02-module-realm/10-sync-vs-async.mjs` 会连续忙等 2×300ms，这是它的观测手段（用来让“阻塞”可计时），不是脚本卡死。

模块系统实验组不写任何文件到磁盘，也不安装任何依赖。
