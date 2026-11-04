# 设计：运行时讲解增强（lib 全量 example + 四章补摘录 + 5.3 四小节重构）

日期：2026-11-02
状态：已确认（用户对三个改动面均无异议）

## 背景与目标

《Vue3 原理》运行时部分（四章 + 5.3）现有问题：

1. `runtime-core.js` 的 `@example` 只覆盖约一半函数；renderer 闭包内的核心链路函数（`render` / `patch` / `process*` / `mount*` / `patchElement` / `patchChildren` / `unmount`）与组件侧（`createComponentInstance` / `setupComponent` / `renderComponentRoot` / `updateProps` / `setupRenderEffect` 等）没有 example，且现有 example 多为抽象的 `h('div', ...)`，与 demo 输入无关。
2. 5.3「整体运行链路」是按操作序平铺的 7 步走读，未按「mount('#app') → 挂载 → 更新 → 卸载」四块组织；函数级输入输出没有逐个落位（如 `processComponent` / `updateComponent` 全文无摘录块、无输入输出讲解）。

目标：运行时的讲解达到「每个关键函数都有 demo 化的输入输出说明，链路按四块组织且每块可对照 demo 按钮实测」。

## 改动面 1：runtime-core.js 全量 demo 化 @example

**范围**：所有带 JSDoc 的函数无死角补齐/替换 `@example`。输入一律取 `demo-app.html` 的真实形态，输出标注真实结果（`// →` 风格，与现有注释一致）。

**代表性 example 设计**（实施时逐一落实）：

| 函数 | example 输入 → 输出 |
| --- | --- |
| `createBaseVNode` / `createVNode` / `h` | 改用 demo 编译产物形态：`h("p", null, toDisplayString(ctx.message), 1)`（patchFlag=1）、`h("li", { key: t.id }, ...)` |
| `normalizeVNode` | 保留（demo 中 renderComponentRoot 归一 subTree 的角色点一句） |
| `isSameVNodeType` | demo 的 li：`key=1` vs `key=2` 同 type 不同 key → false |
| `createComponentInstance` | 根组件 VNode + `parent=null` → 实例字段（标注 parent/provides/mounted 等关键用途） |
| `setupComponent` | 实例 → props 分拣（demo 无 props 声明 → 原始 props 直接当 attrs）/ slots `{}` / setup 执行返回 4 个 ref+函数 |
| `setupStatefulComponent` | 建 proxy → currentInstance 窗口期执行 setup → handleSetupResult |
| `handleSetupResult` | `{ message, count, todos, increment }` → proxyRefs 解包进 setupState（模板读 `ctx.count` 直接是数字） |
| `finishComponentSetup` | in-DOM 模板场景：编译产物已写入 rootComponent.render，setup 返回对象时从这里兜底取 |
| `renderComponentRoot` | 实例 → Fragment subTree（4 个孩子 = 模板 4 个顶层节点） |
| `setupRenderEffect` | 挂载分支：`patch(null, subTree)`；更新分支：改 message 后 `patch(prevSubTree, nextSubTree)` |
| `render` | `render(rootVNode, el)` → 首次 `container._vnode` 为 null 走挂载、并记住本帧 |
| `patch` | `patch(null, subTree)` 挂载 / `patch(prev, next)` 更新 / 类型变化拆掉重建（demo 无，注明） |
| `processText` | `count = {{ count }}` → 首次 createText+insert；改 count 后复用 + setText |
| `processComment` | 渲染 null/false 占位（demo 无此场景，用一般例子） |
| `processFragment` | demo 顶层 Fragment → 首尾两个空文本锚点 + 4 个孩子依次挂载 |
| `processElement` / `mountElement` | `h("button", { onClick: ... }, "count + 1")` → createElement / patchProp(addEventListener) / setElementText / insert 四步留痕 |
| `mountChildren` | ul 的 3 个 li（带 key）逐个 `patch(null, ...)` |
| `patchElement` | 改 message → patchFlag=1 → 仅 1 次 setElementText（静态部分跳过） |
| `patchChildren` | ul 新旧都是数组 → 走 patchKeyedChildren |
| `getSequence` / `patchKeyedChildren` | 已有 demo 化 example，保持/微调（与 5.3 实测数据一致） |
| `processComponent` | `patch(null, rootVNode)` 分流进 mountComponent（n1=null → 挂载） |
| `mountComponent` | 根组件 VNode → 建实例 → setupComponent → setupRenderEffect → mounted 钩子统一执行 |
| `updateComponent` | demo-app 单组件，用「父传 props 的子组件」一般例子并注明 demo 中根组件更新走 componentUpdateFn 而非此函数 |
| `unmount` | `app.unmount()` → 组件分支：unmounted 钩子 → effect.stop → 递归 remove 的真实序列 |
| `unmountChildren` | 卸载 Fragment 的 4 个孩子逐个递归 |
| `queueJob` / `queueFlush` / `flushJobs` | 一次改三项：queueJob 调 5 次、`queue.includes` 去重后队列始终 1 个 job、微任务只 flush 1 次 |
| `nextTick` | 改 message 后 `await nextTick()` 再读 DOM 已是新值 |
| `initProps` / `updateProps` | demo 根组件无 props 声明：initProps 全进 attrs；updateProps 用「父传 msg 的子组件」一般例子并注明 |
| `initSlots` / `normalizeObjectSlots` | demo 根组件 children 非 slots 形态 → `{}`；normalizeObjectSlots 用一般例子 |
| `onMounted` / `onUnmounted` | demo 的 lifeMark 更新回调作为注册例子 |
| `provide` / `inject` | 已有，保持 |
| `publicInstanceProxyHandlers` / `hasPropsChanged` | 已有，微调对齐 demo |
| `createRenderer` / `createAppAPI` | 已有，微调（example 注明与 index.js 装配层的关系） |

**文件头**：覆盖机制注释、断点建议、协作链路描述同步微调（与 example 新形态一致）。

**硬约束**：所有被《Vue3 原理》摘录的函数（4.1 `createRenderer` 头部、4.2 `h`/`createBaseVNode`、4.3 `patch`、4.4 `initProps`、4.5 `setupRenderEffect`/`queueJob` 系列、4.6 `getSequence`/`patchKeyedChildren`、4.7 `onMounted`/`mountComponent`/`unmount`、4.9 `provide`/`inject`），注释变更后文档「摘自」代码块必须逐字符同步。

## 改动面 2：四章 4.5 补齐缺失摘录

4.5「虚拟 DOM：挂载 / 更新 / 卸载」新增摘录块（每个配现有格式的「输入/输出/过程」三行框）：

1. `render`（入口 + `_vnode` 机制）
2. `processElement` + `mountElement` + `mountChildren`（挂载路径）
3. `patchElement` + `patchChildren`（更新路径）
4. `processComponent` + `updateComponent`（组件分流；`mountComponent` 已在 4.7，不重复摘录）

不改动其他小节结构（4.1~4.4、4.6~4.9 仅被动同步摘录内容）。5.3 末尾「关键函数摘录」索引与「配套代码」表格中 4.5 的覆盖范围描述同步更新。

## 改动面 3：5.3 重构为四小节

现有 7 步走读的真实产物数据（compile 产物、setupState 读数、subTree、宿主操作留痕、queueJob 计数、LIS 手推、describeDeps 对照、钩子计数、死写证据）**全部保留**，重新分配进四块。顶部四段总图保留，改造为四小节索引（每段尾标注小节号）。

### 5.3.1 mount('#app')（选择器 + in-DOM 模板编译）

- 调用链图：`mount('#app')` → `document.querySelector` → 读 `innerHTML` → `compile()`（接 5.1：parse→transform→generate→new Function）→ 清空容器 → `render(rootVNode, el)`
- 关键函数：index.js 装配层 `createApp` 包装的 mount——输入（选择器字符串 + 组件对象），输出（根实例代理，页面层按钮全走它写状态）
- 吸收现步骤①（模板 HTML + compile 产物代码串）

### 5.3.2 挂载（processComponent → mountElement 递归）

- 分流讲起：`processComponent(null, vnode)` → `mountComponent` → `createComponentInstance` / `setupComponent` / `setupRenderEffect` 挂载分支（`componentUpdateFn` 的 `isMounted=false` 分支）→ `patch(null, subTree)` → `processFragment`（双锚点）→ `mountElement` 逐层递归
- 每个函数一行「输入 → 输出」（与四章摘录呼应，5.3 不重复摘代码）
- 对应 demo 操作：「加载即挂载」；吸收现步骤②（setupState 经 proxyRefs 解包后的读数 + subTree 真实产物，发生在 setupComponent 期间）与步骤③宿主操作留痕（createElement/setElementText/addEventListener/insert 序列）

### 5.3.3 更新（trigger → queueJob → diff）

- 调用链：`set → trigger → 渲染 effect 的 scheduler → queueJob（去重）→ flushJobs（微任务）→ componentUpdateFn 更新分支 → patch(prev, next)`
- 元素路径：`patchElement`（patchFlag=1 跳过静态）→ `patchChildren` → `patchKeyedChildren`（头尾同步 → key 索引 → source 数组 → LIS）
- 对应 demo 按钮：改 message（步骤④）、一次改三项（步骤⑤ queueJob 计数）、删首项四步手推（步骤⑥前半）、乱序 LIS 实测（步骤⑥后半）

### 5.3.4 卸载（app.unmount → 递归摘除）

- 调用链：`app.unmount()`（index.js 装配层，对 `container._vnode` 调内部 unmount）→ 组件分支：unmounted 钩子 → `update.effect.stop()` → 递归 `unmount(subTree)` → `hostRemove` 序列
- 对应 demo 按钮：「卸载」；吸收现步骤⑦（describeDeps 对照、remove 序列、钩子计数、死写证据、重挂语义）

每小节末尾附该块断点建议（现有断点列表按四块重组）。

## 不改动

- `demo-app.html`（按钮与链路已覆盖四块）
- 其他 lib 文件（shared / reactivity / compiler-core / index.js）
- 文档其他章节的结构（一、二、三章及 4.1~4.4、4.6~4.9 仅被动同步摘录）

## 实施顺序

1. `runtime-core.js`：逐函数补/改 `@example`（改动面 1）
2. 文档四章：4.5 新增摘录块 + 全文「摘自 runtime-core.js」块逐字符同步 lib 新注释（改动面 2 + 连带约束）
3. 文档 5.3：按四小节重构（改动面 3）
4. 更新「关键函数摘录」索引与「配套代码」表
5. 验证（见下）

## 验证

- `node e:\working\tmp\sync-doc-excerpts.cjs` dry-run 无「找不到」→ apply
- node vm 冒烟：加载 5 个 lib 文件 + 跑一遍 demo-app 同构逻辑（mount → 改状态 → 卸载）
- 8899 静态服务实测 demo-app 各按钮（浏览器）
- VitePress 构建通过

## 风险与注意

- 摘录同步量大：几乎每个「摘自 runtime-core.js」块都会因注释变更漂移，需逐块对齐，不能只靠脚本
- example 里的输出必须与 lib 实际行为一致（写完后 vm 冒烟抽查）
- 5.3 重构时真实产物数据不可走样（均来自上轮 dump 实测，只挪位置不改数值）
