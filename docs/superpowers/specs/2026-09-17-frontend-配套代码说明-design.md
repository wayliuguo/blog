# 前端文档：配套代码说明与模块总结精简 设计

> 日期：2026-09-17
> 关联：`frontend/`（基础 + 进阶 两级目录，VitePress 博客）

## 1. 背景与目标

用户对 `frontend/` 现有 48 篇知识文章与 12 个模块 `总结.md` 提出 3 项需求：

1. **每篇增加配套代码**：主题值得可运行演示的文章配专属 demo（达到一定复杂度），并在文档中说明。
2. **每篇增加配套代码说明，参考 node 篇**：即 node 文章末尾的 `## 配套代码` 章节模式（仓库路径 + 文件表格 + 运行方式）。
3. **模块级总结去掉代码与自测入口**：删除 12 个模块 `总结.md` 中的 `## 代码与自测入口` 段。

### 已确认决策（brainstorming 澄清结果）

- **按复杂度补齐**：值得可运行演示的主题补写专属 demo；纯概念/规范类文章只写简要说明或注明无需独立 demo。
- **总结之前**：`## 配套代码` 放在每篇文章 `## 总结` 之前，保持「总结是最后一段」的既有约定。
- **脚本 + 代理**：临时脚本机械清理/插入骨架 + 并行子代理补写 demo 与完善说明（与上次「去层化与总结统一」同一套流程）。
- **补写范围**：3 个新 demo —— 前端安全 `xss-demo.html`、React 使用 TS `react-types.ts`、React 使用 CSS `css-styles.html`。
- **node 模块总结不在范围**：仅处理前端 12 个模块。

## 2. 现状盘点（探索阶段实测）

- **前端 48 篇文章均无 `## 配套代码`**；文末唯一章节是 `## 总结` 结构树（最后一段，无 `---` 分隔、无 `## 参考` 段）。
- **node 篇模式基准**（`node/Redis/02-Redis 持久化与淘汰策略.md`）：

  ```markdown
  ## 配套代码

  本篇的可运行示例在仓库 `node/Redis/code/redis-demo`。

  | 文件 | 演示什么 |
  | --- | --- |
  | `02-expire.js` | TTL、过期行为观察与淘汰策略 |

  运行方式见 `redis-demo/README.md`。
  ```

- **路径一律用反引号行内代码**而非 markdown 链接：code 目录不参与 VitePress 构建，链接会 404。
- **前端 code 目录现状**：模块级 `code/` = `server.js`（零依赖静态服务器）+ `package.json` + `site/*.html` demo；**无 README**，运行方式需直接写在段落里。
- **demo 资产盘点**（详见 §4 映射表）：48 篇中 39 篇已有可映射 demo、3 篇需补写、6 篇属纯概念/规范类。
- **端口**（各模块 `总结.md` 的 `## 代码与自测入口` 段内记录）：HTML=5174、CSS=5175、JS=5176、网络=5177、TS=5178、工程化=5179、React=5180、Vue=5181、框架原理=5182、性能=5182、交付=5183、架构=5184。**不硬编码，一律由脚本从 `总结.md` 提取**。
- **框架原理模块 code 与基础 React/Vue 模块重复**（mini-runtime/hooks-demo/vdom-diff/mini-reactive/compiler-demo/vdom-vue-diff 副本均存在）：文章指向本模块 `code` 即可，不新增。

## 3. `## 配套代码` 章节模板

位置：每篇文章 `## 总结` 之前，作为正文后、总结前的最后一个内容章节。

### 模板 A（有 demo 可映射）

```markdown
## 配套代码

本篇的可运行示例在仓库 `frontend/基础/04-网络与浏览器/code/site/`。

| 文件 | 演示什么 |
| --- | --- |
| `fetch-status.html` | 常见 HTTP 状态码交互演示 |

启动方式：在 `code` 目录执行 `node server.js`（即 `npm start`），打开 `http://localhost:5177/`。
```

要点：

- 仓库路径写**模块级**（`frontend/基础/XX/code/site/` 或子目录），用反引号行内代码。
- 文件表格：`文件` 列填 demo 相对路径，`演示什么` 列用一句话说明该 demo 演示本篇哪个知识点。
- 启动方式写完整（`node server.js` 即 `npm start`）+ 端口；端口为脚本从 `总结.md` 提取的实际值。
- 简单篇（demo 单一、无需表格）可退化为一句：「本篇的可运行示例在仓库 `frontend/XX/code/site/`；启动方式：在 `code` 目录执行 `node server.js` 后按端口访问。」——由代理按 demo 复杂度裁量。

### 模板 B（纯概念/规范类篇，无需独立 demo）

```markdown
## 配套代码

本篇为纯概念/规范类内容，不提供独立可运行示例；动手验证方式见正文。
```

## 4. 48 篇映射与补写范围

| 模块 | 篇数 | 有 demo 可映射 | 补写新 demo | 注明无需 |
| --- | --- | --- | --- | --- |
| 基础/01 HTML 基础 | 2 | 01 语义化与结构 → `code/site/semantic-blog/`；02 表单与标签 → `code/site/register-form/` | — | — |
| 基础/02 CSS | 6 | 01 基础与选择器 → `specificity.html`；02 布局 → `flex-grid.html` + `bfc.html`；03 响应式 → `responsive.html`；04 动画 → `animation.html`；05 BEM → `bem-card.html`；06 综合实战 → `project/` | — | — |
| 基础/03 JavaScript 核心 | 6 | 01 数据类型 → `clone.html`；02 作用域闭包 → `scope-closure.html`；03 原型继承 → `prototype-new.html`；04 事件循环 → `event-loop.html`；05 内存 GC → `weakmap.html`；06 手写实现 → `debounce-throttle.html` | — | — |
| 基础/04 网络与浏览器 | 4 | 01 HTTP/HTTPS → `fetch-status.html`；02 渲染原理 → `block-render.html`；03 存储缓存 → `storage-demo.html` | **04 前端安全 → `xss-demo.html`**（XSS 注入/转义对比 + CSRF 示意） | — |
| 基础/05 前端框架-React | 6 | 01 核心概念 → `mini-runtime.html`；02 Hooks → `hooks-demo.html`；03 路由 → `vdom-diff.html`（说明：路由切换为何不是整页重建）；04 状态管理 → `hooks-demo.html`（说明：状态按调用顺序存取） | **05 使用 TS → `react-types.ts`**（check.ts 模式：类型推导/泛型组件）；**06 使用 CSS → `css-styles.html`**（内联/className/样式隔离方案对比） | — |
| 基础/06 前端框架-Vue | 3 | 01 核心基础 → `compiler-demo.html`；02 组件 → `mini-reactive.html`（响应式 data/props）；03 路由与状态 → `vdom-vue-diff.html` + `mini-reactive.html` | — | — |
| 进阶/01 TypeScript | 2 | 01 类型系统 → `structural.html` + `union-intersection.html` + `generic-infer.html`；02 工程实践 → `utility-practice.html` + `check.ts` | — | — |
| 进阶/02 前端工程化与构建 | 5 | 02 模块化规范 → `tree-shaking.html` + `deps-demo.html`；03 构建工具 → `mini-bundler.html` + `mini-dev-hmr.html`；04 脚手架 → `scaffold-cli.html` | — | 01 前端工程化全景、05 Monorepo 工程化 |
| 进阶/03 交付与质量 | 6 | 01 代码规范 → `lint-demo.html`；04 CI/CD → `pipeline-demo.html` | — | 02 Git 与协作、03 调试技巧、05 质量体系与测试、06 发布灰度与监控 |
| 进阶/04 前端框架原理 | 2 | 01 React 原理 → 本模块 `mini-runtime.html` + `hooks-demo.html` + `vdom-diff.html`；02 Vue3 原理 → 本模块 `compiler-demo.html` + `mini-reactive.html` + `vdom-vue-diff.html` | — | — |
| 进阶/05 性能优化与监控 | 4 | 01 指标评估 → `perf-reader.html`；02 优化实践 → `lazy-load.html` + `fps-frames.html`；03 监控平台 → `error-report.html` + `monitor.html` + `agent.html`；04 企业级工程 → `enterprise-server.js` | — | — |
| 进阶/06 工程实践与架构 | 2 | 01 设计模式 → `pubsub.html` + `module-loader.html`；02 组件设计 → `store.html` + `pubsub.html`（状态与发布订阅在组件协作中的运用） | — | — |
| **合计** | **48** | **39** | **3** | **6** |

说明：

- 「有 demo 可映射」的 39 篇：写模板 A，文件表格的 `演示什么` 列由子代理核对 demo 实际内容后填写。
- 「注明无需」的 6 篇：写模板 B（全景/Monorepo 为概念篇；Git/调试/质量体系/发布灰度为操作流程或规范篇，正文已有示例代码）。
- 映射中的 demo 文件名仅供骨架预填，代理需以 code 目录实际文件为准核对修正。

## 5. 模块总结.md 删除规则

对 12 个前端模块的 `总结.md` 统一执行：

- 删除 `## 代码与自测入口` 段：从该 `##` 标题到下一个 `##` 标题（即 `## 参考`）之前，整体删除（含端口信息与 demo 列表）。
- 保留 `## 参考` 段（含各篇链接与面试题链接）不动。
- node 模块 `总结.md` 不处理。

## 6. 实施分工

### 6.1 临时脚本（Node，一次性，执行后删除）

1. **删段**：遍历 12 个模块 `总结.md`，删除 `## 代码与自测入口` 段；删除前用正则提取其中的 `http://localhost:PORT/` 端口。
2. **插骨架**：按 §4 映射表，在 48 篇文章 `## 总结` 标题前插入 `## 配套代码` 骨架：
   - 模板 A：仓库路径 + 文件表格（`文件` 列已填、`演示什么` 列留待代理补全）+ 启动方式（端口用步骤 1 提取值）。
   - 模板 B：注明无需独立 demo。
   - 骨架插入位置规则：`## 总结` 行之前，与正文末尾之间隔一个空行。

### 6.2 并行子代理（4 个）

| 代理 | 职责 | 覆盖文章 |
| --- | --- | --- |
| A | 补写 `xss-demo.html`（XSS 注入/转义对比 + CSRF 示意），更新网络模块 `code/site/index.html` 目录页链接，完善网络模块 4 篇说明 | 基础/04（4 篇） |
| B | 补写 `react-types.ts`（check.ts 模式，含 `npx tsc --noEmit` 说明）与 `css-styles.html`，更新 React 模块 `code/site/index.html` 目录页链接，完善 React 模块 6 篇说明 | 基础/05（6 篇） |
| C | 完善基础其余模块说明（核对 demo 实际内容、填表格） | 基础/01、02、03、06（17 篇） |
| D | 完善进阶模块说明（核对 demo 实际内容、填表格） | 进阶/01-06（21 篇） |

代理职责共同点：对每篇文章，读对应 demo 文件确认「演示什么」描述准确；路径与端口与 code 目录实际一致；模板 B 文章确认归类无误。

### 6.3 验证

- `grep` 复查：48 篇文章均含 `## 配套代码` 且位于 `## 总结` 之前；12 个 `总结.md` 无 `## 代码与自测入口` 残留。
- 3 个新 demo 文件存在，且所在模块 `code/site/index.html` 目录页有对应链接。
- `npx vitepress build` 通过、无 404 警告（文章内新增的反引号路径不参与构建，不会产生死链）。

## 7. 验证标准（验收）

1. 48 篇文章均有 `## 配套代码` 段，位置在 `## 总结` 之前。
2. 12 个模块 `总结.md` 均无 `## 代码与自测入口`，`## 参考` 段保留。
3. 3 个新 demo 存在且目录页有入口；新 demo 为可运行/可检查的演示，复杂度与主题匹配。
4. `npx vitepress build` 通过，无 404 警告。
5. 工作树提交前 `prettier --write .` 格式化（pre-commit 钩子依赖），新增代码文件符合 prettier。

## 8. 非目标

- 不给前端 code 目录新增 README（运行方式直接写入文章段落）。
- 不重写 6 篇「注明无需」文章的内容，仅加模板 B 说明。
- 不处理 node 模块 `总结.md` 的 `## 代码与自测入口`。
- 不新增其它模块级 demo（框架原理与基础 React/Vue 的重复副本维持现状）。
