# 设计文档：mini-vue demo 拆分 + 文档「关键执行链路」章节

日期：2026-10-23
状态：设计已确认（用户逐项拍板），待实施

## 1. 背景与目标

现状：`frontend/vue/code/vue3/mini-vue/demo/` 只有 demo-vue.html（8 步骤全链路导览页，~590 行，含断点卡/要点/日志时间线/双探针，vm 冒烟 32/32 通过）。用户认为教学讲解应回归文档，demo 应回归纯渲染演示。

目标：
1. demo 目录拆分为 **5 个单主题 demo**，每个只负责该主题的渲染演示（纯结果展示，无日志/探针/动效/教学文案）
2. 《Vue3 原理.md》文末新增整章 **「五、关键执行链路」**，与 5 个 demo 一一对齐，解析每条链路的关键执行步骤

## 2. 已确认决策（用户逐项拍板）

| # | 决策点 | 结论 |
|---|--------|------|
| 1 | demo-vue.html 去留 | 拆分替换：删除，不保留 |
| 2 | 拆分粒度 | 5 个，按执行链路划分 |
| 3 | 新章节位置 | 文末整章，插在「配套代码」之前 |
| 4 | demo 辅助元素 | 纯渲染：只有操作按钮 + 渲染区，无日志无探针 |
| 5 | 时序效果可视化 | 纯结果展示，零动效；时序/复用教学点全部由文档文字承担 |
| 6 | 断点卡内容 | 精简融入文档：每小节末 2-4 条断点建议，不用五行卡 |

## 3. demo 规格（5 个页面）

统一结构：`h1 标题 + 一句话说明 + 操作按钮 + 渲染区`。统一脚手架：lib 五文件按序 `<script src>` 加载（shared → reactivity → compiler-core → runtime-core → index），`window.MiniVue` 使用方式与现 demo-vue.html 相同；计数渲染器不需要，直接用 `M.createApp`。页面样式从 demo-vue.html 裁剪（保留 panel/pre/button 基础样式，删除 bp/step/log/probes 相关）。

### 3.1 demo-compiler.html（编译链路）
- 操作：textarea 编辑模板（预置与现 demo 相同的 app-head 模板）→「编译」按钮
- 渲染区：三栏并排 pre——`AST`（parse 产物）/ `静态标记`（transform 产物，含 patchFlag）/ `render 代码`（generate 产物）
- 纯产物展示，无执行 render 步骤（挂载页管执行）
- 复用：demo-vue.html 步骤 1 的 btnCompile 逻辑（compile + ast1/marks1/code1 三栏填充）

### 3.2 demo-reactivity.html（响应式链路）
- 操作按钮：count+1（ref）、改嵌套属性（reactive 深层）、改 title、强制读 computed、stop watch 后再改
- 渲染区四块：reactive 对象 / ref / computed（double）/ watch 结果区（新值 ← 旧值，由 watch 回调写入，属渲染结果）
- 复用：demo-vue.html 深入卡 A/B/C 的核心代码（effect 分支重跑、computed 缓存计数、watch stop）

### 3.3 demo-mount.html（挂载链路）
- 操作：「挂载应用」按钮
- 渲染区：左栏 VNode 树 pre（编译产物展开后的树形结构），右栏真实 DOM（带样式的完整应用树：app-head + 有/无 key 双列表 + 主题条）
- 组件内含 setup 状态与「onMounted 已触发」标记
- 复用：demo-vue.html 的 App 组件全树（编译产物展开成一等孩子的修复必须保留：`...roots` 展开），KeyedList/NokeyList/主题条组件原样保留（与 demo-diff、demo-unmount 同源复用）

### 3.4 demo-diff.html（更新链路：批处理 + 列表 diff）
- 操作：删首项 / 删中间 / 追加 / 重置 / 「同一 tick 连改 3 次」
- 渲染区：**有 key 与无 key 双列表对照**（核心演示：删首项后无 key 列表内容错位、有 key 列表正确——结果对比即教学点）；「连改 3 次」只呈现最终值
- 复用：demo-vue.html 的 KeyedList/NokeyList 组件与 act() 操作（nextTick 后刷新由组件响应式自动完成，无需 deltas 统计）

### 3.5 demo-unmount.html（卸载链路）
- 操作：挂载（初始自动）/ 卸载 / 重挂 / 「卸载后改 count」
- 渲染区：挂载点本体；卸载后容器清空、「卸载后改 count」点击后无任何变化（无变化即演示结果）
- 复用：demo-vue.html 的 appRender(null, box) 卸载与 remount 流程

## 4. 文档新章节「五、关键执行链路」

- 位置：《Vue3 原理.md》`## 配套代码`（现 L2270）之前
- 章首：一张 ASCII 总图，标出 ①→⑤ 五条链路、衔接点（数据形态变换：模板串→render 函数→VNode→真实 DOM→…）与 5 个 demo 文件的对应关系

5 小节与四段式结构：

| 小节 | 链路 | 对应 demo |
|------|------|-----------|
| 5.1 | 编译：parse → transform.walk → generate → new Function → render() | demo-compiler.html |
| 5.2 | 响应式：track → trigger → effect 重跑 → scheduler → computed/watch | demo-reactivity.html |
| 5.3 | 挂载：createApp().mount → mountComponent → setupComponent → componentUpdateFn → patch → mountElement | demo-mount.html |
| 5.4 | 更新：set → trigger → queueJob → flushJobs → nextTick → patchElement → patchChildren → patchKeyedChildren | demo-diff.html |
| 5.5 | 卸载：render(null) → unmount → onUnmounted → effect.stop → hostRemove（含重挂） | demo-unmount.html |

每小节固定四段：
1. **链路 ASCII 图**：函数名 + 所属文件 + 数据变换标注
2. **分步「输入/输出/处理」紧凑注释块**（用户偏好格式，禁用表格）：
   ```
   /*
    * 步骤② transform.walk —— 静态标记
    * 输入：AST 树（root + children）
    * 处理：递归遍历，isStatic 判定 → patchFlag 落位、静态节点提升
    * 输出：带 patchFlag 的 AST
    */
   ```
   每小节配 2-3 段关键函数代码摘录（与 lib 带注释版逐字一致，走 sync-doc-excerpts 同步规则）；已在其他小节出现过的摘录用「见 3.2 节」式引用，不重复贴
3. **断点建议**：2-4 条，每条一句（断在哪个函数、断住看什么），沿用 F12 → Sources 按函数名搜的用法
4. **demo 入口**：指向 `code/vue3/mini-vue/demo/demo-xxx.html` 的相对链接

## 5. 同步影响面

1. 删除 `frontend/vue/code/vue3/mini-vue/demo/demo-vue.html`
2. 《Vue3 原理.md》：
   - L3 附近的 demo 链接引用改为指向 `demo-diff.html`（与上下文的全链路代表性最匹配；硬约束：链接有效且 check-links 通过）
   - L2284-2297「配套代码」章的 8 步骤 demo 表格改写为 5 demo 对照表
3. 侧边栏（VitePress config）：demo html 不入侧边栏，无改动；确认无死链
4. 新章节代码摘录进同步工具校验范围；「缺标注」存量（interview/ai 90 处）不受影响
5. 项目 memory：demo 结构变化（多 demo 纯渲染 + 文档章节对齐）与「编译产物数组必须展开」教训需在完成后更新

## 6. 验证计划

1. **vm 冒烟**（每 demo）：node vm + DOM 桩 + id 自动全局 + 提取内联脚本；模拟点击 → 断言渲染区最终状态。方法论沿用 2026-10-22 教训（ASI 分号、id 驼峰、桩 closest/nextSibling）
2. **8899 浏览器实测**：Playwright（playwright-core + 系统 Edge，e:\working\tmp\node_modules 已装）；URL 根目录即 `frontend\vue`，路径 `http://localhost:8899/code/vue3/mini-vue/demo/demo-xxx.html`（不带 /frontend/vue/ 前缀）
3. **三件套**：check-code-sync / check-links（442+ 链接）/ check-sidebar-coverage
4. **VitePress 构建** exit 0
5. 注意：`.workbuddy/specs/` 下 md 不在板块扫描范围，三件套不受 spec 文件影响（已确认 check-sidebar-coverage 只扫板块目录）

## 7. 明确不做（YAGNI）

- 不做 demo 间导航页/索引页
- 不做动效、日志时间线、探针、断点卡
- 不改 lib 源码（含 createVNode 的 children 归一化——demo 侧展开已解决）
- 不动其他原理文档（Pinia/Router）
- 不新建 markdown 文档以外的文件（spec 文件仅此一份）

## 8. 风险与已知坑

- 编译产物是根节点数组：任何把 `compiled.render(...)` 直接嵌进 children 的写法都会复现「更新静默跳过 + 卸载崩溃」bug——5 个 demo 中凡嵌编译产物处必须 `...roots` 展开（demo-mount 最相关）
- ASI 陷阱：内联脚本语句后紧跟 `(` / `[` 开头行必须写分号并注释
- demo 内联脚本裸标识符引用元素时，id 不能带连字符（统一驼峰）
- http-server 测试服务需 `-c-1`（8899 现役服务已按此启动）
