# interview 板块并入 frontend 知识体系 实施计划

> 2026-09-17 · 规格：`docs/superpowers/specs/2026-09-17-interview并入frontend知识体系-design.md`
> 执行方式：方案 A 逐模块闭环（每模块：盘点 → 补正文 → 面试题去重转五步法 → 配套代码 → 校验 → 提交）。

## 一、工作项清单

### 1. 基础 6 模块（每模块独立提交，按序执行）

| 序号 | 模块 | interview 来源 | 动作要点 |
| --- | --- | --- | --- |
| M1 | 基础/01-HTML 基础 | html.md | 补缺：HTML5 新特性、表单细节、iframe、meta 等正文缺的知识点；无题库题（quiz HTML/CSS 分区挑 HTML 题并入面试题） |
| M2 | 基础/02-CSS | css.md | 补缺：选择器优先级、隐藏元素、1px、像素密度、BFC 细节等；quiz CSS 分区并入 |
| M3 | 基础/03-JavaScript 核心 | javascript.md + codeconsole.md + writecode.md + quiz JS 分区 | 补缺正文；代码输出/手写题转五步法并入面试题（去重）；迁移 `code/手写代码/`、`code/javascript/` 按需示例 |
| M4 | 基础/04-网络与浏览器 | browser.md + network.md + networkinterview.md + quiz 网络分区 | 补缺：安全（XSS/CSRF/沙箱）、缓存细节、TCP/HTTPS 链路；quiz 题并入 |
| M5 | 基础/05-前端框架-React | quiz 中 React 题 | 仅并入面试题（无知识笔记，正文不补缺）；`code/react/` 按需评估 |
| M6 | 基础/06-前端框架-Vue | vue.md（偏原理部分 → 进阶/04） | 补缺：Vue2 机制、双向绑定细节等基础内容；原理部分留给 M10 |

### 2. 进阶 6 模块（可合并提交，按序执行）

| 序号 | 模块 | interview 来源 | 动作要点 |
| --- | --- | --- | --- |
| M7 | 进阶/01-TypeScript | typescript.md | 补缺：TS 基础映射表、ts-node/tsx 运行等正文缺的知识点 |
| M8 | 进阶/02-前端工程化与构建 | quiz 工程化分区 | 并入面试题；迁移 `code/webpack/`、`code/vite/`、`code/rollup/` 按需示例 |
| M9 | 进阶/03-交付与质量 | quiz 协作分区 | 并入面试题 |
| M10 | 进阶/04-前端框架原理 | vue.md 原理部分 + quiz 原理分区 | 补缺：Vue2 响应式/Object.defineProperty、虚拟 DOM 等；迁移 `code/vue3/`、`code/vue-pratice/` 按需示例 |
| M11 | 进阶/05-性能优化与监控 | performance.md + monitor.md + quiz 性能分区 | 补缺：性能指标细节、监控埋点/上报；迁移 `code/uploadFile/`（大文件上传场景）如适用 |
| M12 | 进阶/06-工程实践与架构 | scenario-design.md + quiz 架构分区 | 场景题转五步法并入面试题；迁移 `code/binary/`、`code/precipitation/` 按需示例 |

### 3. 新增小程序模块（基础/07-小程序）

- 按 miniwechat.md 拆分正文（生命周期、启动优化、分包加载、原生与框架差异等）+ `总结.md` + `面试题.md`。
- 配套代码：无可运行独立 demo 则 `## 配套代码` 写「无独立 demo，见小节 XX」。

### 4. 收尾：删板块 + 清空资源（独立提交）

- 删除 `interview/` 全部（27 md + 8 assets 目录）。
- 删 `.vitepress/config/interview.js`；`config.js` 移除 sidebar；`nav.js` 移除「不止于面试」。
- 清空根 `code/`（迁移所需后删除剩余 12 目录 241 文件）。
- 清空根 `public/`（16 张图片）。
- README.md 如有引用同步更新。

## 二、通用规则（每模块套用）

1. **补缺**：只补正文没有的知识点；已有不重写；无篇目承载则新增篇目或并入最近篇。
2. **面试题**：与现有面试题.md 主题重复跳过；相近合并；统一五步法（结论/原理/边界/追问/场景，结论为判断句）；口径以正文为准；出处 `（第 XX 篇）`。
3. **配套代码**：按需迁移到 `frontend/<模块>/code/<项目名>/`，同步三处（README、scripts、正文配套代码表）；非必需不迁。
4. **正文风格**：小节标题即问题或判断句；结尾 `## 小结 / ## 配套代码 / ## 参考` 顺序不变。
5. **校验**：grep 导航 `text: '0X-` 0 命中、总结无单层残留、面试题无五步法残留 → prettier → vitepress build 无 404 → 精确 git add 提交（不触碰 node/ 与 .workbuddy 其他未提交改动）。

## 三、执行顺序

M1 → M2 → M3 → M4 → M5 → M6（基础，各独立提交）→ M7 → M8 → M9 → M10 → M11 → M12（进阶，可合并）→ 小程序模块 → 收尾删板块清资源 → 全量校验 → 提交。
