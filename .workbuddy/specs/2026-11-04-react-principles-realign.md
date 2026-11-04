# Spec：React 目录重组——原理篇对齐《Vue3 原理》形态

日期：2026-11-04
状态：待用户评审

## 目标

`frontend/react/` 对齐 `frontend/vue/` 的组织：使用篇不动，原理篇收敛为一篇《React 原理》（全新重写，方案 A），配套 code 全新写为与 mini-vue 同形态的 mini-react（浏览器直载 lib + demo-app 单页可断点）。移除《React 状态管理原理与实现》《手写 mini-react》两篇及其配套工程。

## 目录终态

```
frontend/react/
├── React 核心概念 / React Hooks / React 路由 / React 状态管理 / React 使用 TS / React 使用 CSS   ← 使用篇不动
├── React 性能优化.md          ← 新增使用篇（承接旧"性能优化"章：memo/useMemo/useCallback/key 复用/长列表优化）
├── React 原理.md              ← 新增原理篇（全新重写，目标 ~1800-2200 行）
├── 总结.md                    ← 联动更新（移除对两篇旧文的引用，补《React 原理》《React 性能优化》）
└── code/react/mini-react/
    ├── lib/  shared.js → scheduler.js → hooks.js → reconciler.js → dom.js → index.js
    └── demo/demo-app.html
```

## 《React 原理》五章骨架（对齐 Vue3 原理章法）

| 章 | 内容 | 对应 Vue3 原理 |
| --- | --- | --- |
| 一、React 整体架构 | react / react-dom / scheduler / reconciler 分层地图；**「JSX 与 React Element」一节**：JSX 与等价 `createElement` 代码并排对照，说明真实 React 由构建工具编译、mini-react 直接站在编译产物层 | 一、整体架构 |
| 二、Fiber 架构与调度 | FiberNode 结构、双缓冲树、时间分片与优先级 | 机制基石位（Vue：编译+响应式） |
| 三、Hooks 原理 | Fiber 上的 hooks 链表：useState / useEffect 实现 | 三、响应式（驱动角色） |
| 四、运行时原理 | reconcile（beginWork / completeWork / keyed diff，含与 Vue patchKeyedChildren 异同一小节）+ commit 三阶段 | 四、运行时 |
| 五、关键执行链路 | setState → schedule → render → commit → 卸载，分镜式走读一条数据改动的完整旅程 | 五、关键执行链路 |
| 配套代码 / 参考 | 体例同 Vue 篇 | 同 |

## mini-react code 形态（对齐 mini-vue）

- `lib/` 纯 JS 零依赖、`<script>` 按序加载、`window.MiniReact` 统一导出、全量 JSDoc、文件头含"建议断点"注释（体例照搬 mini-vue lib）
- 分层：`shared.js`（类型判断/工具）→ `scheduler.js`（宏任务时间分片调度）→ `hooks.js`（hooks 链表）→ `reconciler.js`（Element 创建 createElement/h、beginWork、diff）→ `dom.js`（commit 宿主操作）→ `index.js`（createRoot 装配）
- **demo 用 `createElement`（别名 `h`）直写，不引入 babel/JSX**
- `demo/demo-app.html`：官网 CDN 式用法；函数组件 + useState/useEffect；页面层按钮触发各链路并实测留痕：
  - 改 message（单次 setState → 重渲染）
  - 一次改多项（批处理：多次 setState 合并为一次 render，对齐 Vue 批处理按钮）
  - 乱序 + 插删（keyed diff：`[a,b,c,d,e] → [a,d,f,b,e]`，与 Vue demo 同数据，便于跨框架对照）
  - 新列表更长 / 旧列表更长（头尾同步快速通道）
  - 卸载（effect 清理 → unmount）
  - 断点标注列表（对应五章链路）

## 删除清单

- 文档：`React 高级与原理.md`、`React 状态管理原理与实现.md`、`手写 mini-react.md`
- code：`code/react/mini-react`（Node 测试工程）、`code/react/mini-state`、`code/react/site`、`code/server.js`、`code/package.json`
- 注意：旧《React 高级与原理》四章优质内容（渲染机制 / Fiber / reconciliation / Hooks 原理）作为重写参考素材；"性能优化"章迁移到新使用篇《React 性能优化》

## 联动更新

- `.vitepress/config/frontend.js` sidebar：React 组删两项（状态管理原理与实现、手写 mini-react），加《React 原理》《React 性能优化》
- `frontend/react/总结.md`：引用与结构描述联动
- 其他文档如有交叉引用（grep 全库核查 `React 高级与原理` / `mini-state` / `手写 mini-react`）一并修正

## 验收

1. `npm run build` 通过
2. demo-app 浏览器实测：五条按钮链路 DOM 结果正确（含 keyed diff 与 Vue demo 同数据同结果）
3. 全库 grep 无残留旧引用；sidebar 与文件一一对应
