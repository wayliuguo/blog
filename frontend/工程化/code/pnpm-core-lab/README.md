# pnpm-core-lab

pnpm 安装模型的两个结论，用两个独立工程演示。没有脚本：各自 `pnpm install` 后看 `node_modules`。

## 两个工程

```bash
cd app-a && pnpm install
cd app-b && pnpm install
```

| 目录 | 依赖 | 看什么 | 对应篇目 |
| --- | --- | --- | --- |
| `app-a/` | `is-even@1.0.0` | 顶层只有 `is-even`；`require('is-odd')` 报 `MODULE_NOT_FOUND`；`.pnpm` 里有完整依赖图 | 二 |
| `app-b/` | `is-even@1.0.0` | 与 `app-a` 的实体文件是同一份（硬链接），可对照链接目标 | 二 |

## 观察命令

```powershell
Get-ChildItem node_modules -Directory | Select-Object Name, LinkType   # is-even 是 Junction
(Get-Item node_modules/is-even).Target                                  # 指向 .pnpm 里的版本目录

Get-ChildItem node_modules/.pnpm/is-even@1.0.0/node_modules -Force | Select-Object Name, LinkType
(Get-Item node_modules/.pnpm/is-even@1.0.0/node_modules/is-odd).Target   # 依赖也是 Junction

node -e "try{require('is-odd');console.log('ok')}catch(e){console.log(e.code)}"
```

```powershell
# 在 pnpm-core-lab 根目录执行：列出同一个文件的所有路径（store、app-a、app-b）
fsutil hardlink list app-a\node_modules\.pnpm\is-even@1.0.0\node_modules\is-even\index.js
```

`app-a` 用来观察"store → 项目"的硬链接；`app-b` 装同一个包后，同一个文件多出一条路径，用来观察"项目 ↔ 项目"共享同一份内容。

实测环境：Node 24.16 · pnpm 11.5.2。
