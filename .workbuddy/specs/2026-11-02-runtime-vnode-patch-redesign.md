# 设计：《Vue3 原理》四章运行时按「VNode + patch」心智模型重构

日期：2026-11-02
状态：设计已获用户确认方向并逐节修正（本稿为定稿）

## 背景与目标

现行四章（章引言 + 4.1~4.5，约 630 行）按"命中片段 + 三行框"精简过一轮，用户反馈仍复杂。
用户明确心智模型与结构：**VNode 是中间描述层，patch 统一分发挂载/更新；组件负责产出 VNode，元素 VNode 映射真实 DOM；响应式副作用驱动 render 重执行 → 数据驱动视图**。五节重组；表达以流程图、关键代码、输入输出为主，砍掉大段文案。

## 硬约束

1. 代码片段逐字取自 lib（可截取连续片段，不改字符），命中路径标注保留。
2. 实测数据只出现在 5.3（本轮不动 5.3 内容，只改索引指向）。
3. 表达方向：流程图 + 关键代码 + 输入输出框为主；文案最少化；不搞死板的"每节固定配方"。
4. 每节保留 1 行断点建议。
5. 不出现指向 .js 源文件的 markdown 链接（无法跳转，用 `摘自` 就地片段）。

## 新五节内容

### 4.1 VNode：数据的基石
- 定义：用 JS 对象描述真实节点的普通对象（虚拟节点）。
- 类型：元素 / 组件 / 文本 / 注释 / Fragment 五种。
- 结构：type、props、children、shapeFlag、key、el、component（逐字段注释标注）。
- 意义：中间描述层——组件产出它、patch 消费它、DOM 由它映射；diff 与复用的单位。
- 代码：`h('p', null, 'hi')` 一行调用 → 产出的对象字面量；`createBaseVNode` 关键行；ShapeFlags 摘录（shared.js，保留上一轮修复成果）。
- 输入输出框：输入 (type, props, children) → 输出 VNode 对象。

### 4.2 patch：运行时的调度中枢
- 定位：挂载和更新复用同一个函数，靠 `n1`（旧 VNode）是否为空区分。
  - 首次挂载：`render(vnode, container)` → `patch(null, vnode, container)`。
  - 更新：`patch(prevVNode, nextVNode, container)`。
- patch 分发器：组件（processComponent）、元素（processElement）、文本（processText）、Fragment 四条分支（switch 片段）。
- 递归：patch 过程中对 children 再次 patch，整棵树走完。
- 卸载一句带过：`render(null)` / `app.unmount()` → unmount 递归（极简片段或一句话，不再展开）。
- 代码：render 入口片段 + 分发 switch 片段。
- 输入输出框：n1=null → 挂载路径；n1 有值 → 更新路径。

### 4.3 组件挂载：从组件到子 VNode
- 链条：创建组件实例 → 执行 setup → 获取 render 函数 → 把 render 包进 effect → 执行 render 产出子 VNode（subTree）→ 对子 VNode 执行 patch → 进入元素挂载流程。
- 核心概念框（本节重点）：
  - **Component instance**：组件的上下文容器，所有组件状态、方法都挂在这里。
  - **effect（副作用）**：render 是一个副作用函数；访问响应式数据时收集依赖，数据变更后重新执行 render，生成新 VNode，再走 patch 更新。
- 代码：mountComponent（5 行）+ setupRenderEffect 首跑分支（6 行）。
- 生命周期钩子一句带过（注册进实例数组，挂载完统一调）。

### 4.4 元素挂载：VNode → 真实 DOM
- 定位：只有元素 / 文本 VNode 才会生成真实 DOM。
- 五步：`document.createElement` 创建 DOM → 赋给 `vnode.el` → 处理 props / 事件 → 递归 patch 子节点（在内存构建子 DOM 树）→ `insert`（appendChild）插入父容器。
- 代码：mountElement 片段（~12 行）；mountChildren 递归回 patch（呼应 4.2 调度中枢）。
- 宿主注入一句带过：9 个 host* 函数即 document.createElement 等 DOM API，换宿主即 SSR 雏形。

### 4.5 响应式 + effect 调度：数据驱动视图的闭环
- 只讲响应式与渲染的关联，不重复三章响应式内容。
- 闭环链：组件 render 读响应式数据 → track 把渲染 effect 记为订阅者 → 数据变更 trigger → 命中 scheduler → queueJob 去重 → 微任务 flushJobs → 重跑 render 产出新 VNode → `patch(prev, next)`（闭环指回 4.2）。
- 代码：`instance.update = effect(componentUpdateFn, { scheduler: () => queueJob(instance.update) })` 1 行 + queueJob 3 行 + componentUpdateFn 更新分支 3 行。
- 结尾一句点题：这就是"数据驱动视图"的全部。

### 章引言
压到 5 行以内：一张总流程图（`数据 → render() → VNode 树 → patch → 真实 DOM`）+ 一句心智模型 + 五节导航。

## 联动改动

| 项 | 动作 |
| --- | --- |
| 交叉引用重映射 | 旧4.1→新4.1/4.2（VNode 部分→4.1、patch 分发→4.2）；旧4.2→4.3；旧4.3→4.4；旧4.4→4.5；旧4.5→4.2 |
| 5.3 | 内容不动；"关键函数摘录索引"与链路总图的节指向按新编号改 |
| 配套代码表 | 对应小节列同步改号 |
| lib 头注释 | runtime-core.js 文件头五节映射改为新节名；shared.js "4.1 shapeFlag" 不变 |
| 总量目标 | 四章从 ~630 行压到 ~300 行 |

## 验证

1. grep 无死链、无旧编号残留（4.6/4.7/4.8 不再出现）。
2. vm 冒烟 MiniVue 导出（lib 只动注释）。
3. `npm run build` 成功。
4. 浏览器 demo-app 不受影响（本轮不改 lib 行为与 demo），可跳过重测。

## 明确不做

- 不动 5.3 实测内容、三章、二章。
- 不改 lib 行为。
