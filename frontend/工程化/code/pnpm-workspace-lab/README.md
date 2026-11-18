# pnpm-workspace-lab

一个可运行、可继续扩展的 pnpm monorepo：根工程 + 两个库 + 一个应用。

```
pnpm-workspace-lab/
├── package.json            # 根：private + packageManager + 汇总脚本
├── pnpm-workspace.yaml     # 声明哪些目录是工作区成员
├── pnpm-lock.yaml          # 锁文件：importers 按成员分组
├── packages/
│   ├── utils/              # @lab/utils：无依赖
│   └── ui/                 # @lab/ui：依赖 @lab/utils（workspace:*）+ 外部包 is-odd
└── apps/
    └── web/                # @lab/web：依赖 @lab/ui（workspace:*）
```

## 一、从零建工作区

```bash
pnpm init                                        # 根 package.json
# 手写三项：private: true、packageManager、汇总脚本
```

```yaml
packages:
    - 'packages/*'
    - 'apps/*'
```

每个成员只需自己的 `package.json`（`name` 必填、`private: true`、`main` 指向入口）；目录结构就是上面那棵树。

## 二、声明本地依赖

```bash
pnpm --filter @lab/ui add @lab/utils@workspace:*   # 在 ui 里写依赖
pnpm --filter @lab/web add @lab/ui@workspace:*     # 在 web 里写依赖
pnpm install                                       # 建链、写锁文件
```

`workspace:*` 表示"永远用工作区里的版本"，本地改完即生效，不需要发版。

## 三、安装后的形态

- 顶层 `node_modules` 里没有 `@lab/*`，链接落在每个成员自己的 `node_modules` 下；
- `apps/web/node_modules/@lab/ui`、`packages/ui/node_modules/@lab/utils` 都是指向源目录的链接；
- 锁文件的 `importers` 里记成 `version: link:...`。

查看方式：

```powershell
(Get-Item apps/web/node_modules/@lab/ui).Target
pnpm list -r --depth -1
```

## 四、运行与编排

```bash
pnpm -r run build                       # 所有成员，按依赖图排序
pnpm --filter "@lab/web..." run build    # web 及其全部依赖
pnpm start                              # 根脚本：只跑 web
```

## 五、日常管理

| 需求 | 命令 |
| --- | --- |
| 给某个包加依赖 | `pnpm --filter @lab/ui add lodash` |
| 给某个包加开发依赖 | `pnpm --filter @lab/ui add -D typescript` |
| 全仓升级 | `pnpm -r update` / `pnpm -r update --latest` |
| 查某个包从哪来 | `pnpm why is-odd --filter @lab/ui` |
| 列出所有成员 | `pnpm list -r --depth -1` |
| 在某个包里执行命令 | `pnpm --filter @lab/ui exec node -v` |
| 删除依赖 | `pnpm --filter @lab/ui remove lodash` |

## 六、发布

- `pnpm -r publish` 打包时会把 `workspace:*` 替换成实际版本号；
- 先 `pnpm -r version` 或引入 changesets 统一升版本，再发布；
- 版本策略与变更日志不放进本实验台。

实测环境：Node 24.16 · pnpm 11.5.2。
