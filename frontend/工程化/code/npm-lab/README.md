# npm-lab

npm 平坦树的两个副作用，各用一个独立工程演示。没有脚本：进目录 `npm install`，自己看 `node_modules`。

## 两个工程

```bash
cd duplicate && npm install   # 同名包两份实体
cd phantom && npm install     # 未声明的传递依赖也能 require
```

| 目录 | 依赖 | 看什么 | 对应篇目 |
| --- | --- | --- | --- |
| `duplicate/` | `is-even@1.0.0` + `is-odd@3.0.1` | `is-number` / `is-odd` 各出现两个版本；根目录 `require` 到 `6.0.0`，`is-even` 内 `require` 到 `3.0.0` | 一 |
| `phantom/` | 只有 `is-odd@3.0.1` | 顶层多出未声明的 `is-number`，`require('is-number')` 成功 | 一 |

## 观察命令

```bash
npm ls --all
node -p "require('is-number/package.json').version"
node -p "require('./node_modules/is-even/node_modules/is-number/package.json').version"
```

```powershell
Get-ChildItem node_modules -Directory   # phantom：is-number 与 is-odd 并排
```

实测环境：Node 24.16 · npm 11。
