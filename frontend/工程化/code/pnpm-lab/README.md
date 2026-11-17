# pnpm-lab

pnpm workspace 实验台。脚本把 fixture 里的三包 monorepo 复制到 `.work/workspace` 安装，只打印稳定事实——链接目标、运行结果、锁文件片段、构建顺序。

## 运行

```bash
pnpm lab workspace
```

实测环境：Node 24.16 · pnpm 11.5.2。

## case 对照

| case | 做什么 | 看什么 | 对应篇目 |
| ---- | ---- | ---- | ---- |
| `workspace` | 三个包的 monorepo 安装后检查链接与编排 | `workspace:*` 变成 `link:`；`--filter @lab/web...` 按 utils → ui → web 顺序构建 | 五 |

## 目录

```
lab.mjs              case 分发
cases/               workspace.mjs + _util.mjs（执行命令、复制 fixture、路径格式化）
fixtures/workspace   pnpm-workspace.yaml + packages/utils + packages/ui + apps/web
.work/               运行期临时工程（gitignore，可随时删除）
```
