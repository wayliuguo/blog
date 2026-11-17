# npm-lab

npm 包管理器实验台。每个 case 在系统临时目录准备一个工程、执行真实的 `npm install`，只打印稳定事实——安装路径、版本、解析结果。

## 运行

```bash
npm run lab:duplicate   # 多版本重复安装
npm run lab:phantom     # 幽灵依赖
```

两个脚本都不需要在 lab 目录里先装依赖，安装发生在各自的临时工程里。

实测环境：Node 24.16 · npm 自带的 11.x。

## case 对照

| case | 做什么 | 看什么 | 对应篇目 |
| ---- | ---- | ---- | ---- |
| `duplicate` | 根工程同时要 `is-even@1.0.0`（→ `is-odd@0.1.2` → `is-number@3.0.0`）和 `is-odd@3.0.1`（→ `is-number@6.0.0`） | 平坦树里 `is-number` / `is-odd` 各两份：一份在顶层、一份嵌在父包自己的 `node_modules`；同一句 `require('is-number')` 在根目录与 `is-even` 里拿到不同版本 | 一 |
| `phantom` | 工程只声明 `is-odd`，源码却 `require` 传递依赖 `is-number` | npm 把它提升到顶层，运行成功；这个包没有在 `package.json` 里出现 | 一 |

## 目录

```
cases/duplicate.mjs   多版本重复安装：npm ls --all --parseable 列出所有副本
cases/phantom.mjs     幽灵依赖：只声明 is-odd，require 传递依赖 is-number
cases/_util.mjs       执行命令、复制 fixture、列顶层包名
fixtures/duplicate    根依赖 is-even@1.0.0 + is-odd@3.0.1
fixtures/phantom      只声明 is-odd，src/check.js 里 require is-number
```

临时工程放在系统临时目录，因为博客仓库根目录自己也有 `node_modules`——放在仓库内会沿父目录向上命中，让结果失去意义。pnpm 侧的严格性对照见同级 [`../pnpm-lab`](../pnpm-lab/README.md)。
