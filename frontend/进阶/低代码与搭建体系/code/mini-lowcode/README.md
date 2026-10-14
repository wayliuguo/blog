# mini-lowcode · schema 驱动搭建器（真实工程）

《低代码与搭建体系》模块配套真实工程：一个能跑起来的最小搭建器，把四篇正文的核心机制装进同一个交互界面。

## 实验 ↔ 篇目对照表

| 界面/功能 | 对应正文 | 对应探针 |
| --- | --- | --- |
| 物料协议 + 属性面板自动生成（必填/枚举标记） | 《协议与 schema 设计》二 | `lowcode-lab/schema.cjs` 场景一 |
| 表达式沙箱（`state.vip` 可用、window/process 抛错） | 《渲染引擎》一 | `lowcode-lab/render.cjs` 场景一 |
| 递归渲染（`when` 条件剪枝、`loop` 循环展开、子项 id 带下标） | 《渲染引擎》二 | `lowcode-lab/render.cjs` 场景二 |
| 属性联动（`srcType` 切换后不可见字段连带清值） | 《编辑器与出码》二 | `lowcode-lab/editor.cjs` 场景四 |
| 出码预览（表达式 `{}`、字面量 `""`、循环补 key、条件编译三元） | 《编辑器与出码》三 | `lowcode-lab/editor.cjs` 场景三 |
| 撤销/重做 + 全量重渲染节点计数 | 《渲染引擎》三（更新粒度） | `lowcode-lab/render.cjs` 场景三 |
| 添加/删除物料、校验错误直接上屏（未注册物料报错不静默降级） | 《低代码的边界》二 | `lowcode-lab/boundary.cjs` 场景四 |

## 跑起来

```bash
npm install
npm run dev     # http://127.0.0.1:5201
```

## 建议动手实验

1. 把 `schema.js` 里 `signup` 的 `type` 改成 `Marquee` → 画布出现「未注册组件」红条（协议校验前置）。
2. 属性面板把 `srcType` 从 url 切到 upload 并应用 → `url` 字段被连带清掉，不再留幽灵值。
3. 出码预览里看 `loop` 编译成 `map` 且自动补 `key`；条件节点编译为三元 + 显式 `null`。
4. 连续做几次结构操作后点撤销/重做 → 快照栈行为；观察标题栏节点计数随条件开关变化。

## 与探针实验台的关系

`lowcode-lab`（`node run.cjs`）负责把每个机制用断言钉死，可 CI 回归；本工程负责让人**看到机制在真实交互里的样子**。两边逻辑同源（`engine.js` 注释里逐条标注了来源篇目）。
