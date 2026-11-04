# 设计：《Vue3 原理》四章按组件渲染流程精简 + 删除状态管理/Router 两篇

日期：2026-11-02
状态：设计已获用户逐项确认（精简粒度=主流程 4~5 节；摘录=命中分支片段不写全函数；实测集中 5.3；删除范围=彻底删含配套代码）

## 背景与目标

现行四章（4.1~4.8 八小节，约 1600 行）按 demo 渲染流程展开、整函数全文摘录，用户反馈**太复杂繁琐**。改为：

1. 以**组件渲染流程**为主线——`index.js` 装配层 `createApp` 返回的 `mount` 三行就是总入口：

```js
mount(rootContainer) {
    const vnode = createVNode(rootComponent, rootProps)
    render(vnode, rootContainer)
    return vnode.component.proxy
}
```

2. **每个逻辑步骤只放该步骤实际命中的分支片段**（逐字截取自 lib，但不贴全函数）——如首次 patch 分发，第一次执行命中的是 `processComponent` 分支，就只展示 `n1 == null` + STATEFUL_COMPONENT 分发那几行 + processComponent；完整函数给 lib 位置与断点指引。
3. **5.3 与 5.1/5.2 同构**：链路总图 → 分步实例走读（真实输入/输出）→ 关键函数摘录索引 → 断点建议 → demo 入口；实测数据全部集中于此。
4. 删除《Vue3 状态管理原理与实现》《Vue Router 原理》两篇及其全部配套。

## 硬约束

1. 分支片段仍须**逐字**来自 lib 对应函数（可截取片段，不改字符）；片段上方标注"首次执行命中路径"。
2. 每个片段保留或新配三行框（输入/输出/过程）。
3. 实测数据（真实产物数值、宿主操作序列、钩子计数）**只出现在 5.3**，四章不重复。
4. 各节断点建议保留。

## 改动面 1：四章重构（Vue3 原理.md L1388~2995）

### 新结构（5 节，每节 = 引言 + 命中分支片段 + 三行框 + 断点建议）

| 新节 | 逻辑步骤 | 首次执行命中路径（片段选取依据） | 来源 |
| --- | --- | --- | --- |
| 章引言 | 总纲 | mount() 三行总图（三行各指向 4.1~4.3；更新/卸载指向 4.4/4.5）；装配层一段文字带过（createRenderer/nodeOps：平台无关靠注入）+ `mount()` 摘录作锚点 + provide/inject 一句带过 | 原 4.1 压缩 + 原 4.8 删除后承接 |
| **4.1 创建 VNode 与 patch 分发** | mount 第 1~2 行 | `h`/`createBaseVNode`（demo 首个 VNode 是 App 组件 → STATEFUL_COMPONENT 落位路径）；`render` 入口 = `patch(null, vnode, container)`；patch 首次命中：`n1 == null` + component 分支 → processComponent（只贴这几行） | 原 4.2 + 4.3 合并 |
| **4.2 组件初始化与渲染 effect** | processComponent 深入 | mountComponent → setupComponent/setupStatefulComponent（setup 取返回值、proxyRefs）→ setupRenderEffect **首次走挂载分支**（subTree = render()，patch(null, subTree)）；更新分支留到 4.4 讲 | 原 4.4 |
| **4.3 元素挂载** | subTree 落地 | subTree 是 Fragment → processElement/mountElement 片段（createElement/patchProp/insert）→ mountChildren 递归 | 原 4.5 |
| **4.4 更新与 diff** | 数据变化后 | queueJob/queueFlush/flushJobs；componentUpdateFn **更新分支** → updateComponent（hasPropsChanged）→ patchElement → patchChildren → patchKeyedChildren 片段 | 原 4.6 |
| **4.5 卸载与生命周期** | unmount() | unmount 片段（递归卸载 → onUnmounted → effect.stop()） | 原 4.7 |

- 各节标题重编号；节内衔接句、"见 4.X" 引用按新编号改写。
- 原 4.8 整节删除（props/slots 由 4.2 setupComponent 片段覆盖，provide/inject 章引言一句带过）。

## 改动面 2：5.3 重写为 5.1/5.2 同构（L3249~3263）

新 5.3《整体运行链路：mount('#app') → 挂载 → 更新 → 卸载》：

1. 开头一段：对应 demo（demo-app.html，官网 CDN 用法）。
2. 链路总图（ASCII，每步标函数名 + 所在文件）。
3. **分步实例走读**（四章迁来的全部实测数据按步归位，真实输入/输出）：
   - 步骤① mount：输入 `createApp(App).mount('#app')` → 编译产物 4 个根 → Fragment、根 VNode（shapeFlag）
   - 步骤② 挂载：subTree 结构 + 宿主留痕（createElement/insert 序列）
   - 步骤③ 更新：改 message（patchFlag 更新）/ 一次改三项（queueJob 5 次调 1 job）/ 删首项、删中间项（keyed diff + LIS）
   - 步骤④ 卸载：describeDeps 清空 + remove 序列 + 钩子计数 `{"mounted": 1, "unmounted": 1}` + 死写证据
4. 关键函数摘录索引（指向 4.1~4.5 的片段位置与 lib 完整函数）。
5. 断点建议、demo 入口。

## 改动面 3：全文联动

- 全文 `见 4.X` / `详见 4.X` 等交叉引用按映射改号：4.2/4.3→4.1，4.4→4.2，4.5→4.3，4.6→4.4，4.7→4.5，4.1→章引言，4.8→删。
- 配套代码表（L3268~3280）"对应小节"列同步改号。
- `lib/runtime-core.js`、`lib/index.js` 文件头注释的小节映射改为新五节（只动注释）。

## 改动面 4：删除两篇（含配套）

| 动作 | 对象 |
| --- | --- |
| 删文件 | `frontend/vue/Vue3 状态管理原理与实现.md`、`frontend/vue/Vue Router 原理.md` |
| 删目录 | `frontend/vue/code/vue3/mini-pinia/`、`frontend/vue/code/vue3/mini-router/` |
| 侧边栏 | `.vitepress/config/frontend.js` 删 L66-67 两项 |
| Vue3 原理.md | 尾部"下一篇：Vue3 状态管理原理与实现"（L3286）删除 |
| React 侧三篇 | `手写 mini-react.md`（L685-686）、`React 高级与原理.md`（L566）、`React 状态管理原理与实现.md`（多处）——删指向 Vue3 两篇的链接，相关行文一句话收尾 |
| 总结.md | 顶部条目 5/6 与 "## 5. 状态管理原理与实现"、"## 6. Router 原理" 两章删除，编号顺延修正 |

## 验证四件套

1. grep 全仓无死链：`状态管理原理与实现`、`Router 原理`、`mini-pinia`、`mini-router` 仅允许出现在历史 spec/plan 文档。
2. vm 冒烟：Node 加载 lib 四件，`window.MiniVue` 导出齐全（lib 只动注释，行为不变）。
3. 浏览器实测 demo-app：挂载 / count+1 / 改 message / 卸载 四项 PASS。
4. `npm run build` 成功（VitePress）。

## 明确不做

- 不改三章（响应式）、二章（编译）内容。
- 不改 mini-vue 配套代码行为（只动文件头注释）。
- 不删《Vue 路由与状态.md》（与 Router 原理是两篇不同文档）。
