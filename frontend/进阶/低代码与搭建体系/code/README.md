# 低代码与搭建体系 · 配套代码总索引

| 工程 | 形态 | 跑法 | 对应篇目 |
| --- | --- | --- | --- |
| `lowcode-lab/` | 零依赖探针实验台（`node:assert` 自检） | `node run.cjs` | 四篇正文全部实测数字 |
| `mini-lowcode/` | 真实工程（vite + Vue，schema 驱动搭建器） | `npm install && npm run dev`（5201） | 全景 / 协议 / 渲染 / 编辑器与出码 / 边界·实战节 |

## 实验 ↔ 篇目对照

| 篇目 | 探针（lowcode-lab） | 真实工程（mini-lowcode） |
| --- | --- | --- |
| 协议与 schema 设计 | schema.cjs：物料校验 / 迁移链 / 环检测 | REGISTRY 描述三用（校验/属性面板/出码）+ 未注册报错 |
| 渲染引擎 | render.cjs：沙箱 / 递归渲染 / 更新粒度 | evaluate + renderNode + 节点计数可视化 |
| 编辑器与出码 | editor.cjs：落点 / 出码 / 锚点 / 联动 | 属性面板联动清值 + 快照栈撤销 + 出码预览 |
| 低代码的边界 | boundary.cjs：打分 / 漂移 / 盈亏 / 逃逸 | 物料注册口子 + 未注册报错可视化 |

约定：**一章一工程、同层级、命名对齐章节**；探针负责断言回归，真实工程负责交互验证，两边逻辑同源（`mini-lowcode/src/engine.js` 注释逐条标注来源篇目）。
