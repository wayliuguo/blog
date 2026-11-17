# pnpm-lab

pnpm 包管理器实验台。每个 case 自己准备临时工程，跑完只打印稳定事实——路径、链接目标、inode、错误码、依赖树；不打印耗时这类会漂移的数字。

## 运行

```bash
pnpm install
pnpm lab store       # store 与硬链接
pnpm lab strict      # 严格 node_modules / 幽灵依赖
pnpm lab lockfile    # 锁文件与 frozen 门禁
pnpm lab workspace   # workspace 多包仓库
pnpm lab ci          # fetch + 离线安装
```

实测环境：Node 24.16 · pnpm 11.5.2。

## case 对照

| case | 做什么 | 看什么 | 对应篇目 |
| ---- | ---- | ---- | ---- |
| `store` | 在独立 store 下给两个临时工程装同一个包 | 顶层是符号链接；两个工程的实体文件同一 inode；`nlink` 反映共享份数 | 二 |
| `strict` | 同一份源码分别用 npm / pnpm 安装，再 `require` 未声明的传递依赖 | npm 顶层多出 `is-number`、运行成功；pnpm 顶层只有 `is-odd`、报 `MODULE_NOT_FOUND`；补声明后恢复 | 三 |
| `lockfile` | 由 `package.json` 生成锁文件，再改声明但不动锁文件 | `pnpm-lock.yaml` 结构；`--frozen-lockfile` 报 `ERR_PNPM_OUTDATED_LOCKFILE` | 四 |
| `workspace` | 三个包的 monorepo 安装后检查链接与编排 | `workspace:*` 变成 `link:`；`--filter @lab/web...` 按 utils → ui → web 顺序构建 | 五 |
| `ci` | 只凭锁文件 `pnpm fetch` 预热专用 store，再离线安装 | fetch 后没有顶层链接；`--offline --frozen-lockfile` 安装成功 | 六 |

## 目录

```
lab.mjs              case 分发
cases/               五个实验脚本 + _util.mjs（执行命令、复制 fixture、路径格式化）
fixtures/strict-pkg  只声明 is-odd，src/check.js 里 require 传递依赖 is-number
fixtures/workspace   pnpm-workspace.yaml + packages/utils + packages/ui + apps/web
.work/               运行期临时工程（gitignore，可随时删除）
```

`strict` 的临时工程放在系统临时目录，因为博客仓库根目录自己也有 `node_modules`——放在仓库内会沿父目录向上命中，导致 pnpm 也"看起来"能解析幽灵依赖。
