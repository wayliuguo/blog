# pnpm-core-lab

pnpm 安装模型的两个结论：store 硬链接 + 符号链接、严格 node_modules。没有脚本：`app-a` 里 `pnpm install` 后看 `node_modules`。

## 安装

```bash
cd app-a && pnpm install
```

`app-a` 只声明一个依赖 `is-even@1.0.0`。

## 观察命令

```powershell
# 顶层：只有直接依赖，而且是 Junction
Get-ChildItem node_modules -Directory | Select-Object Name, LinkType
(Get-Item node_modules/is-even).Target

# .pnpm：实体目录 + 依赖的 Junction
Get-ChildItem node_modules/.pnpm/is-even@1.0.0/node_modules -Force | Select-Object Name, LinkType
(Get-Item node_modules/.pnpm/is-even@1.0.0/node_modules/is-odd).Target

# 严格：未声明的传递依赖解析不到
node -e "try{require('is-odd');console.log('ok')}catch(e){console.log(e.code)}"
```

```powershell
# 在 pnpm-core-lab 根目录执行：同一份文件同时出现在 store 与 app-a
fsutil hardlink list app-a\node_modules\.pnpm\is-even@1.0.0\node_modules\is-even\index.js
```

实测环境：Node 24.16 · pnpm 11.5.2。
