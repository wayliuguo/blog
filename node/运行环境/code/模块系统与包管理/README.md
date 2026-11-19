# 模块系统与包管理

《模块系统与包管理》配套实验代码：CommonJS / ES Module 的本质特征、解析时机、加载语义、互操作、缓存与 `exports` 陷阱。

对应博客：`node/运行环境/模块系统与包管理.md`。

## 环境要求

- 本目录 `package.json` 设了 `"type": "commonjs"`，所以 `.js` 文件按 CommonJS 解析
- 需要单文件用 ESM 的，单独用 `.mjs`（如 `live-binding.mjs`）
- 例外：`src/type-switch/` 有自己的 `package.json`（`"type": "module"`），用来演示「整包开关 vs 后缀强制」
- 全部使用 Node 内置模块（`node:` 前缀），**无第三方依赖**，无需 `npm install`

## 脚本清单

| 脚本 | 演示什么 | 运行命令 |
| --- | --- | --- |
| `value-copy.cjs` | CommonJS 的「值的拷贝」，并与 ESM 模块互引 | `npm run value-copy` |
| `live-binding.mjs` | ES Module 的「活绑定」，并与 CJS 模块互引 | `npm run live-binding` |
| `module-cache.cjs` | 模块缓存：同一路径只执行一次 | `npm run cache` |
| `exports-trap.cjs` | `exports` 与 `module.exports` 的陷阱 | `npm run trap` |
| `dynamic-import.cjs` | 互操作：CJS 里用 `await import()` 动态导入 ESM | `npm run dynimp` |
| `type-switch/run.cjs` | `"type"` 字段与后缀强制 | `npm run typeswitch` |

公共模块在 `lib/`（`counter.cjs`、`store.cjs`、`only-esm.mjs`）；`exports` 陷阱专用模块在 `traps/`。

## 运行与预期输出

逐脚本列出「脚本 / 命令 / 预期输出要点」，便于跑完对照自检（输出均来自真实运行）。

| 脚本 | 命令 | 预期输出要点 |
| --- | --- | --- |
| `value-copy.cjs` | `npm run value-copy` | 6 行：`[CJS 模块体] 执行完毕，导出 = TAG, count, inc, peek` → `[ESM 模块体] 开始执行` → `[互操作 ESM→CJS] 调 inc() 后 count = 0 但 cjs.peek() = 1` → `[互操作 CJS→ESM] 调 inc() 后 count = 1` |
| `live-binding.mjs` | `npm run live-binding` | 与 `npm run value-copy` 的输出**逐行相同**，两者退出码均为 0 |
| `module-cache.cjs` | `npm run cache` | `a === b`、`b === c`、`a === c` 全为 `true`；`counter.cjs` 在 `require.cache` 中只有 1 条记录、`loaded = true`；删缓存后再 `require` 得到新对象，且模块体日志第二次出现 |
| `exports-trap.cjs` | `npm run trap` | 本文件 `exports === module.exports` 为 `true`；`store` 打印出 `name` / `version` / `describe` / `dynamic`；陷阱模块分别拿到 `{}` 与 `{ viaModuleExports: true }`，`viaExportsAfterOverwrite` 是 `undefined` |
| `dynamic-import.cjs` | `npm run dynimp` | `require` 同步返回 object；`import()` 返回值是 Promise；await 后拿到 `flavor` / `features` / `default`；`import('./lib/store.cjs')` 的键含 `default` 与命名导出；变量拼路径也能导入成功 |
| `type-switch/run.cjs` | `npm run typeswitch` | 先打印本目录 `package.json` 的 `{"type":"module"}`；随后 `esm-default.js` 输出 `typeof require = undefined` 且 `import.meta.url` 可用，`cjs-forced.cjs` 输出 `typeof require = function`、`__dirname` 可用；两个子进程退出码都是 0 |

## 为什么值得跑一遍

- `value-copy` / `live-binding` 这一对把「值拷贝 vs 活绑定」和「两套系统怎么互引」压到最小：两个文件、六行输出，跑哪个入口都一样；
- `cache` / `trap` 把 CommonJS 专属的「缓存只执行一次」「`exports` 陷阱」放大成可对照的输出；
- `dynimp` / `typeswitch` 分别覆盖互操作与「Node 怎么判断用哪套」，被追问 `require` 与 `import` 的区别时可以直接用跑出来的结果回答。

## 注意事项

- `type-switch/` 是唯一自带 `package.json`（`"type": "module"`）的子目录，入口 `run.cjs` 靠后缀强制按 CommonJS 解析；请按 `npm run typeswitch` 或 `node src/type-switch/run.cjs` 运行，子目录里另有 README 说明。
- `lib/counter.cjs` 在被加载时会打印一行「模块体被执行」，这是 `module-cache.cjs` 判断模块体执行了几次的依据，看到这行重复出现说明缓存被清过。

本目录所有脚本不写任何文件到磁盘，也不安装任何依赖。
