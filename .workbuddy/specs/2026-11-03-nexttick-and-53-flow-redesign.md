# 设计：nextTick 补讲 + demo 演示 + 5.3 按小节重整

日期：2026-11-03
状态：设计已获用户确认（nextTick→4.5.2 末尾；demo 改 message 加 nextTick；5.3 六小节、IO 用独立产物块、不重复编译与响应式）
修订（实施中获用户反馈更新）：① 5.3 引言精简为 demo 一句 + 三行总图，删配方说明；② 流程图改两列——主流程一列、关键函数内部逻辑（如 mountComponent 的四步）在第二列展开；③ "产物块"升级为**关键函数的「目的 / 输入 / 输出」代码块**（实测产物并入对应函数的输出行），全节统一此配方。

## 背景与目标

1. `nextTick` 在 lib 已实现并导出（runtime-core.js L236，`currentFlushPromise` 由 queueFlush 创建），但四章未讲，5.3 批处理里的 `await nextTick()` 无源。
2. 5.3 现状乱：mount 与挂载拆两步、每操作重复上下文、结尾长函数索引冗余；更新段缺少「改 message」的真实 diff 分发链（用户断点实测：patch 的 n1/n2 为同一 p 的新旧 VNode，比对发生在 processElement → patchElement → patchChildren）。
3. 表达方式：要流程图 + 关键流程输入输出（产物独立成块、块头标注产生它的函数）+ 断点建议；不重复编译（指 5.1）与响应式单函数机制（指三章 3.3）。

## 改动 1：4.5.2 末尾补 nextTick 段

- 小节标题不动（`4.5.2 调度器：queueJob / queueFlush / flushJobs`），末尾追加。
- `nextTick` 逐字摘录（runtime-core.js L236~239：`currentFlushPromise || resolvedPromise` 后挂 fn）+ 三行框（输入回调 fn / 返回 Promise / 过程：挂 currentFlushPromise 后面，resolve 时 flushJobs 已跑完，拿到的必是更新后的 DOM）。
- 一句点睛：`await nextTick()` 是"等渲染落定"的官方姿势，与 5.3 批处理实测呼应。

## 改动 2：demo-app.html「改 message」加入 nextTick

- `#btnMessage` 处理器改 async：点击时同步读 `<p>` 文本（旧值）→ 写入 → 再同步读（仍是旧值，DOM 未动）→ `await M.nextTick()` → 再读（新值）。
- 操作面板加一行状态 `#tickMark`（含样式），展示对照：`同步读=「Hello vue!」→ await nextTick() 后读=「Hello MiniVue!」`。
- 演示价值：同步读永远拿旧值、nextTick 后 DOM 已落定——读真实 DOM，非探针，不破坏"纯渲染演示"。

## 改动 3：5.3 重写为六小节

配方固定：**1 张流程图（每行标函数名 + 所在文件）+ N 个产物块（块头标"函数名 产物/副作用"，代码块呈现真实数据，与流程图步骤对应）+ 1~2 行断点**；文字每小节 ≤3 句；compile 步骤标注"产物见 5.1"、trigger/ref 写入标注"机制见三章 3.3"。

### 5.3.1 挂载
- 图：`mount('#app') → createVNode → patch(null, …) → processComponent → mountComponent → setupComponent → setupRenderEffect → effect 首跑 → subTree = render() → patch(null, subTree) → processFragment → mountChildren → mountElement ×4 → insert`（index.js / runtime-core.js）
- 产物块：根 VNode（createVNode：type=组件对象 → shapeFlag=2）；setupState 真实读取（setupComponent）；subTree 产物（setupRenderEffect）；宿主留痕节选（mountElement/insert + 对照规律一句）
- 断点：index.js mount / mountComponent

### 5.3.2 更新 · 改 message（diff 全链，首个操作给全链）
- 图：`root.message 写入（trigger 机制见 3.3）→ queueJob → 微任务 flushJobs → componentUpdateFn 更新分支 → patch(prevSubTree, nextSubTree)（两个 Fragment）→ processFragment（n1 有值）→ patchChildren → patchKeyedChildren 头同步 → 4 孩子逐个 patch → processElement → patchElement → patchChildren`
- 产物块：4 孩子比对结果（patchKeyedChildren 层：p1 文本变 1 写入 / p2 "count = 0" 相同 0 操作 / button onClick 闭包变重绑 / ul→li 全同 0 操作）；宿主留痕两行（setElementText ×1 + addEventListener ×1，即 patchElement→patchChildren 的副作用）；demo 的 nextTick 读写对照
- 断点：patch / processElement / patchElement（标注"用户已断点验证 n1/n2 为同一 p 的新旧 VNode"）

### 5.3.3 更新 · 一次改三项（批处理 + nextTick）
- 图：`3 次同步写入 → trigger ×3 → queueJob 去重（5 调 1）→ 微任务 flushJobs 执行 1 次 → 一轮 patch 落定`
- 产物块：同步窗口证据（写入后立刻看渲染 +0、DOM 旧值）；queueJob 调用计数；flushJobs 留痕（setElementText ×2 + remove ×1）
- 断点：queueJob / flushJobs

### 5.3.4 更新 · 删首项（keyed diff）
- 手推流程（文本块）：①头同步 key=1 vs 2 断 ②尾同步 key=3、key=2 逐个 patch，e2 越头 ③新列表耗尽判定 ④unmount(li#1)
- 产物块：宿主留痕 remove ×1、#2/#3 原样复用（0 setText）；有 key vs 无 key 对照块（删首项 5 次 vs 1 次；纯重排 6 次就地改写 vs 3 次搬移）+ 串位警告 + LIS 非零成本一句
- 断点：patchKeyedChildren

### 5.3.5 更新 · 乱序重排（LIS）
- 图/流程：`[a,b,c] → [c,a,b]：头尾同步全断 → keyToNewIndexMap → source=[3,1,2]（逆序 → moved=true）→ getSequence → LIS=[1,2] → 从后往前：仅 #3 一次 insert`
- 产物块：source 数组、LIS 返回下标、最终 li 顺序（真实产物）、0 createElement / 0 remove
- 断点：getSequence

### 5.3.6 卸载
- 图：`app.unmount() → unmount 组件分支 → unmounted 钩子 → update.effect.stop() → 递归 unmount(subTree) → unmountChildren → hostRemove 序列`
- 产物块：describeDeps 卸载前后对照（dep 1 个 effect → 空）；remove 序列（孩子先、锚点最后）；钩子计数 `{"mounted": 1, "unmounted": 1}`；死写证据（卸载后写 count 宿主操作为空）
- 重挂一句：重新 createApp().mount，模板从容器的缓存取，旧 effect 不复活
- 断点：unmount 组件分支

结尾：仅一行 demo 入口（`./code/vue3/mini-vue/demo/demo-app.html`）。现长"关键函数摘录索引"段删除（流程图已标函数与文件）。实测数据全部保留、按小节归位。

## 联动

- 配套代码表：runtime-core 行内容列补 `nextTick`；demo 表 demo-app 行交互描述补 nextTick 演示。
- lib 文件头注释：4.5 小节映射若未含 nextTick 则补词（只动注释）。
- 其余章节不动。

## 验证

1. `npm run build` 成功。
2. 浏览器实测 demo-app：挂载 / 改 message（tickMark 显示同步旧值 → nextTick 新值）/ 批处理 / 删首项 / 卸载 / 重挂 全部符合预期。
3. grep 确认 5.3 无编译产物长解释（指向 5.1）与响应式机制重复讲解（指向 3.3）。
