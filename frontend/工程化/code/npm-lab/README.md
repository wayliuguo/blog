# npm-lab

npm 平坦树的两个副作用，共用一个工程演示。没有脚本：`npm install` 后自己看 `node_modules`。

依赖：`is-even@1.0.0`（要 `is-odd@0.1.2` → `is-number@3.0.0`）与 `is-odd@3.0.1`（要 `is-number@6.0.0`）。

## 观察命令

```bash
npm install
npm ls --all   # is-number 出现 6.0.0 与 3.0.0 两份
```

```bash
node -p "require('is-number/package.json').version"                                        # 6.0.0（顶层）
node -p "require('./node_modules/is-even/node_modules/is-number/package.json').version"    # 3.0.0（嵌套）
```

```powershell
# is-number 没有写进 package.json，却出现在顶层：幽灵依赖
Get-ChildItem node_modules -Directory | Select-Object -ExpandProperty Name
```

实测环境：Node 24.16 · npm 11。
