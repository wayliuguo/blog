# 运行时讲解流程化重构设计（四章重排 + 注释收敛 + 5.3 瘦身）

> 日期：2026-11-02
> 背景：上一轮（2026-11-02-runtime-doc-design.md）给 runtime-core.js 约 40 个函数都加了 demo 输入输出的 `@example`，文档四章按主题拆节、5.3 按链路串讲并互相引用摘录位置。用户反馈：**讲解太复杂、注释大量 example 难看**；期望：注释按逻辑分支组织（如 patch 的不同分支），文档沿 demo 组件渲染流程拆解讲解。

## 一、目标

1. runtime-core.js 注释从「每函数一个多行 @example」收敛为「仅主干函数保留分支式 example，其余一句话职责」。
2. 文档四章运行时部分按 demo 渲染流程重排为八个小节，函数讲解嵌入流程阶段。
3. 5.3 瘦身为总览图 + 索引，不再重复四章内容。
4. demo 行为零变化；真实产物数据（compile 产物、queueJob 计数、LIS 手推、describeDeps、钩子计数等）原样搬运不改数值。

## 二、改动面 1：runtime-core.js 注释收敛

### 保留 @example 的主干函数名单（11 个，全在 demo 链路上）

`h` / `createBaseVNode` / `patch` / `mountComponent` / `setupComponent` / `setupRenderEffect` / `mountElement` / `patchElement` / `patchKeyedChildren` / `queueJob` / `unmount`

注：`patchKeyedChildren` 当前可能没有 @example，若无则按下面风格新增一条精简的（删首项 + 乱序两分支各一行）。

### 保留者的 example 风格：按逻辑分支组织

每个分支两行（调用 + `// →` 结果），示例：

```js
 * @example
 *   // 分支① n1=null 挂载：demo 加载即触发
 *   patch(null, rootVNode, container)           // → processComponent 建组件 → mountElement 递归长出 DOM
 *   // 分支② 同类型更新：改 message 后微任务里触发
 *   patch(prevSubTree, nextSubTree, container)  // → patchElement 只动 patchFlag 标记的文本
 *   // 分支③ 类型变化：demo 单组件走不到
 *   patch(oldDivVNode, newSpanVNode, container) // → unmount 旧的 + mount 新的
```

各函数分支划分参考（实现时以函数体实际 if/else 为准）：

| 函数 | 分支 |
| --- | --- |
| h | 对象组件 / 元素+props+children |
| createBaseVNode | shapeFlag 位落位（ELEMENT/TEXT_CHILDREN/ARRAY_CHILDREN/COMPONENT） |
| patch | ① n1=null 挂载 ② 同类型更新 ③ 类型变化卸旧挂新 |
| mountComponent | （单分支：建实例 → setup → effect → 钩子；一条即可） |
| setupComponent | initProps → initSlots → setupStatefulComponent 三步 |
| setupRenderEffect | ① isMounted=false 挂载分支 ② 更新分支 |
| mountElement | createElement → 落孩子 → patchProp → insert 四步 |
| patchElement | props diff + patchChildren 组合 |
| patchKeyedChildren | 头同步/尾同步命中 vs 中间乱序（LIS） |
| queueJob | 去重命中 vs 首次入队（+ queueFlush 闸门一行） |
| unmount | 组件分支 / 元素分支 / Fragment 分支 |

### 其余约 30 个函数

- 删除整个 `@example` 段，JSDoc 回到「一句话职责 + 过程简述（可保留原有的分支说明文字）+ @param」。
- 「demo-app 走不到」类说明撤出 lib，其知识挪到文档正文（见改动面 2 各小节）。
- 五个 lib 文件头断点建议：更新对应关系（引新小节号）。

## 三、改动面 2：四章按流程重排（八小节）

| 新小节 | 流程阶段 | 主干函数（三行框+摘录） | 一句带过 |
| --- | --- | --- | --- |
| 4.1 入口与装配 | mount('#app') 前置 | createRenderer / index.js 装配层（createApp / mount / app.unmount） | nodeOps / patchProp |
| 4.2 创建 VNode | render 执行时 | h / createBaseVNode | createVNode / normalizeVNode / isSameVNodeType |
| 4.3 patch 分发 | 一切调用的枢纽 | render（入口，讲清 render → patch 关系）/ patch（三分支） | 各 processXxx 一览表（表格形式） |
| 4.4 组件初始化与渲染 effect | processComponent 分支 | mountComponent / setupComponent / setupRenderEffect | createComponentInstance / initProps / handleSetupResult / finishComponentSetup / renderComponentRoot / publicInstanceProxyHandlers |
| 4.5 元素挂载 | processElement 分支 | mountElement / mountChildren | processElement 本体 / processText / processComment / processFragment |
| 4.6 更新与 diff | trigger → 微任务 → patch | queueJob / flushJobs / patchElement / patchChildren / patchKeyedChildren+getSequence | queueFlush / nextTick / updateComponent |
| 4.7 卸载 | app.unmount | unmount | unmountChildren |
| 4.8 流程之外的横向机制 | — | — | updateProps / initSlots / provide / inject |

### 内容搬运映射（剪切为主，数值与摘录一字不改）

| 现位置 | 去向 |
| --- | --- |
| 现 4.1（createRenderer + 装配层） | 保留为 4.1 |
| 现 4.2（h/createVNode/createBaseVNode/normalizeVNode/isSameVNodeType） | 4.2 创建 VNode；后两者一句带过 |
| 现 4.3（shapeFlag + patch + processXxx） | 4.3 patch 分发；processXxx 改一览表 |
| 现 4.4（initProps/setupComponent/setupStatefulComponent/proxyHandlers/handleSetupResult/finishComponentSetup） | 4.4 组件初始化；initProps 留此，updateProps 挪 4.8 |
| 现 4.5 四组摘录（render / 元素 / patchElement / 组件分流）与三行框 | render 组归 4.3 开头；元素组归 4.5；patchElement+patchChildren 归 4.6；processComponent 归 4.4，updateComponent 归 4.6 |
| 现 4.6（patchKeyedChildren/getSequence） | 4.6 更新与 diff |
| 现 4.7（mountComponent/unmount/钩子时序） | mountComponent 归 4.4；unmount+钩子归 4.7 |
| 现 4.8/4.9（updateProps 等 / provide/inject） | 合并 4.8 横向机制 |
| 5.3 的 compile 产物 + 模板 | 4.2（创建 VNode 的输入） |
| 5.3 的 setupState 读数 + subTree 产物 | 4.4 |
| 5.3 的挂载期宿主留痕 + 对照规律 | 4.5 |
| 5.3 的改 message 留痕 + 批处理计数 + 删首项手推 + LIS 乱序 | 4.6 |
| 5.3 的 describeDeps + 卸载序列 + 钩子计数 + 死写证据 | 4.7 |
| 5.3 的断点建议（旧 6 条已分散在各小节者） | 四章对应小节末尾，每节 1~2 条 |

### 函数讲解粒度

主干函数（上表列出的）配「输入/输出/过程」三行框 + 摘录；支线函数只在正文一句带过（不配框不配摘录）。

## 四、改动面 3：5.3 瘦身

瘦身后 5.3 只剩：

1. **四段总览图**（demo 一生一条线，每段 2~3 行）：

```
① mount('#app') → 4.1~4.2    页面加载即执行；compile 产物（4 个根 → Fragment）
② 挂载 → 4.3~4.5             无需点击；subTree + 宿主留痕（createElement/insert 序列）
③ 更新 → 4.6                 改 message / 一次改三项 / 删首项；queueJob 5 次调 1 job + LIS
④ 卸载 → 4.7                 卸载/重挂按钮；describeDeps 清空 + 钩子计数
```

2. **demo 入口行**（保留现状 `./code/vue3/mini-vue/demo/demo-app.html`）。
3. **删除**：5.3 现有的三行框、调用链块、断点建议、真实产物数据块（已搬四章）；旧「关键函数摘录」索引替换为一句「主干函数摘录与断点建议已嵌入 4.2~4.7 各流程小节」。

## 五、交叉引用处理

- 全文 grep「见 4.X」「详见 4.X」按新编号逐处更新（二章/三章图内标注、五章开头、配套代码表、demo 页断点标注核对）。
- runtime-core.js 文件头断点建议同步更新。
- 配套代码表 runtime-core.js 行「对应小节」列改为新范围（仍为 4.2~4.9 形式，按实际核对）。

## 六、实施顺序

1. 改动面 1：runtime-core.js 注释收敛（先删 ~30 个 @example，再改 11 个主干 example 为分支式；vm 冒烟）
2. 改动面 2：四章八小节重排（逐节剪切搬运；每完成一节跑 sync dry-run 防漂移）
3. 改动面 3：5.3 瘦身（四段总览图 + 删重复内容）
4. 交叉引用更新（全文 grep 替换）
5. 验证四件套 + 引用检查

## 七、验证

| 步骤 | 通过标准 |
| --- | --- |
| sync 脚本 dry-run/apply | 除 Vue Router 篇既有警告外无新增「找不到」；apply 后幂等 |
| vm 冒烟（node vm 加载 5 个 lib） | `window.MiniVue` 32 个导出完整 |
| 浏览器实测 demo-app（8899 静态服务） | 挂载/改 message/批处理/卸载/重挂全 PASS，控制台无报错 |
| VitePress 构建 | 构建成功 |
| grep 引用检查 | 全文无失效「见 4.X」引用 |

## 八、风险与对策

- **四章重排手术大**（约 1500 行）：整块剪切既有文本，不改写；分小节逐个 Edit。
- **摘录漂移**：lib 注释改动先完成并稳定后，再重排文档；每节搬运后跑 sync dry-run。
- **小节编号变更引发断链**：最后统一 grep 清算；VitePress 构建兜底。
