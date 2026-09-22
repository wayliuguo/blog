# pnpm workspace 最小示例

演示 pnpm workspace 的三个核心能力：`workspace:*` 本地链接、`--filter` 定向操作、`pnpm -r` 拓扑序递归。

```
packages/
├── shared/   (无依赖)
├── sdk/      → 依赖 shared  (workspace:*)
└── ui/       → 依赖 sdk     (workspace:*)
```

## 运行

```bash
# 1. 安装依赖（会生成 node_modules 符号链接 + 锁定 pnpm-lock.yaml）
pnpm install

# 2. 按拓扑序递归构建所有包（shared → sdk → ui）
pnpm build              # 等价于 pnpm -r run build

# 3. 定向构建单个包
pnpm --filter @scope/ui build

# 4. 运行 ui 输出（串联了 sdk → shared）
pnpm --filter @scope/ui start
```

## 观察点

- `node_modules/@scope/ui` 是软链，指向 `packages/ui`；改源码即时生效，无需发布。
- 在 `packages/ui/src/index.ts` 里尝试 `import { ... } from '@scope/shared'`——没在 ui 声明该依赖，编译会失败。这就是 pnpm 防止幽灵依赖的体现。