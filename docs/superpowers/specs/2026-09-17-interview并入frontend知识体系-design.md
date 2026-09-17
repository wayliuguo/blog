# 设计：interview 板块并入 frontend 知识体系

> 日期：2026-09-17
> 状态：待实施
> 关联规范：《文档组织规范》（`.workbuddy/docs/文档组织规范.md`）

## 1. 背景与目标

仓库当前有两大知识板块：`frontend/`（基础 6 模块 + 进阶 6 模块 + 面试方法论，共 48 篇正文）与 `node/`（11 模块）。此外还有一个独立的 `interview/` 板块（「不止于面试」，27 个文件），是历史遗留的前端面试复习体系，内容与 frontend 知识体系高度重叠但形态不一致（知识复习笔记 + 分级题库 + 题型训练 + 过程类内容）。

**目标**：把 interview 板块中有价值的技术内容**并入 frontend 知识体系**，评估并补充缺失知识点，然后**整体删除 interview 板块**，并清空历史遗留的 `public/` 图片与根 `code/` 示例代码。完成后仓库只保留 frontend / node 两大知识体系。

## 2. 现状盘点

### 2.1 interview 板块构成（27 个文件）

| 分类 | 文件 | 内容要点 |
| --- | --- | --- |
| 知识复习笔记 | html.md / css.md / javascript.md / typescript.md / vue.md | 主题与 frontend 基础/进阶模块重叠 |
| 知识复习笔记 | browser.md / network.md / networkinterview.md | 浏览器渲染、安全、网络协议 |
| 知识复习笔记 | miniwechat.md | 微信小程序（frontend 无对应模块） |
| 知识复习笔记 | performance.md / monitor.md | 性能指标、监控埋点 |
| 知识复习笔记 | lightspot.md | 项目难点亮点（过程类） |
| 自测题库 | quiz-basic.md（44 题）/ quiz-intermediate.md（45 题）/ quiz-advanced.md（36 题） | 只出题，按主题分区 |
| 题库答案 | answers-basic.md / answers-intermediate.md / answers-advanced.md | 对应参考答案 |
| 题型训练 | codeconsole.md / writecode.md / scenario-design.md | 代码输出题、手写题、场景设计题 |
| 方法论 | methodology.md | 面试流程、自我介绍、STAR、薪资谈判、复盘 |
| 过程类 | softskill.md / experience.md / experience-summary.md / tracking-sheet.md | 软技能、面经、自测记录表 |
| 首页 | index.md | 板块导航 |

### 2.2 frontend 知识体系现状

- 基础 6 模块：01-HTML 基础、02-CSS、03-JavaScript 核心、04-网络与浏览器、05-前端框架-React、06-前端框架-Vue
- 进阶 6 模块：01-TypeScript、02-前端工程化与构建、03-交付与质量、04-前端框架原理、05-性能优化与监控、06-工程实践与架构
- 进阶根目录：面试方法论.md
- 每模块结构：正文文章 + `总结.md` + `面试题.md`（五步法：结论/原理/边界/追问/场景）
- 各模块已有 `code/site/` 配套代码体系

### 2.3 配套资源现状

- 根 `code/`：241 个文件，12 个目录（手写代码、javascript、browser、react、vue3、webpack、vite、rollup、uploadFile、binary、precipitation、vue-pratice）——历史遗留示例
- 根 `public/`：16 张图片（css/html/javascript/react/typescript 子目录），仅被 interview 的 css/javascript/html 三篇笔记引用，**frontend 正文零引用**
- interview 内部还有 8 个 assets 图片目录（browser.assets、network.assets 等）

## 3. 关键决策（已与用户确认）

1. **板块去留**：知识内容全部并入 frontend 后，interview 板块整体删除
2. **笔记合并方式**：补缺式合并——interview 笔记中 frontend 正文没有的知识点才补入，已有内容不重复写
3. **小程序**：新增 `frontend/基础/07-小程序` 模块（基础层）
4. **自测体系**：quiz 分级题、代码输出题、手写题、场景设计题**全部转为五步法格式**并入对应模块面试题.md
5. **过程类内容**（面经/软技能/自测记录表/难点亮点/首页）直接删除
6. **方法论**：interview/methodology.md 独有章节（薪资谈判、复盘清单等）**不补进** frontend 面试方法论，整个文件删除；frontend/进阶/面试方法论.md 维持现状
7. **配套代码**：根 code/ 中「能加深理解」的示例按主题迁移到对应模块 `code/` 目录（按需迁移，非全部）；迁移后根 code/ 清空
8. **public/ 图片**：工作完成后清空（frontend 正文零引用，安全）

## 4. 模块映射表

| interview 来源 | 目标模块 | 动作 |
| --- | --- | --- |
| html.md | 基础/01-HTML 基础 | 补缺式并入正文 |
| css.md | 基础/02-CSS | 补缺式并入正文 |
| javascript.md + codeconsole.md + writecode.md | 基础/03-JavaScript 核心 | 补缺 + 题目转五步法并入面试题 |
| browser.md + network.md + networkinterview.md | 基础/04-网络与浏览器 | 补缺式并入正文 |
| quiz 中 React 题 | 基础/05-前端框架-React | 仅并入面试题（无 React 知识笔记） |
| vue.md | 基础/06-前端框架-Vue + 进阶/04-前端框架原理 | 偏原理部分进原理模块，其余补缺 |
| miniwechat.md | **新增 基础/07-小程序** | 新建模块（正文+总结+面试题+配套代码） |
| typescript.md | 进阶/01-TypeScript | 补缺式并入 |
| quiz 工程化分区 | 进阶/02-前端工程化与构建 | 并入面试题 |
| quiz 协作/原理分区 | 进阶/03-交付与质量、进阶/04-前端框架原理 | 并入面试题 |
| performance.md + monitor.md | 进阶/05-性能优化与监控 | 补缺式并入 |
| scenario-design.md | 进阶/06-工程实践与架构 | 场景题转五步法并入面试题 |
| methodology.md | — | 删除（不并入） |
| lightspot/softskill/experience/experience-summary/tracking-sheet/index | — | 删除 |

## 5. 逐模块闭环流程

每个模块一个完整工作单元，做完一个再下一个：

```
① 盘点对比 → ② 补正文缺口 → ③ 面试题去重转五步法 → ④ 配套代码迁移/登记 → ⑤ 校验 → 提交
```

### 5.1 盘点对比（①）

- 读该模块 interview 对应笔记/题库分区，与 frontend 该模块正文逐篇对比
- 产出两份清单：**缺的知识点**（正文没有的）、**缺的面试题**（面试题.md 没有的）

### 5.2 补正文缺口（②）

- 只补「frontend 正文没有」的知识点，插到对应篇目合适小节，**不重复已有内容**
- 知识点缺但无篇目承载的：新增篇目（如小程序模块）或并入语义最近篇
- 插入内容遵循正文风格：知识小节标题即问题或判断句，配小结两级树

### 5.3 面试题去重转五步法（③）

- 从 interview 题库（quiz/codeconsole/writecode/scenario-design）抽取对应模块题目
- **去重**：与现有面试题.md 题目主题重复的跳过；相近主题合并
- **格式**：统一转五步法（结论/原理/边界/追问/场景），结论为可背的判断句
- **口径**：答案以 frontend 正文为准（规范第 6 章），出处标注 `（第 XX 篇）` 映射到实际篇目
- **数量**：每题固定五条子弹，顺序不可变

### 5.4 配套代码迁移/登记（④）

- 根 code/ 中与并入知识点相关、能加深理解的示例 → 迁移到 `frontend/<模块>/code/<项目名>/`
- 迁移后同步三处（规范第 7 章）：项目 README.md、package.json scripts、对应篇正文 `## 配套代码` 表
- 非必需不迁：正文代码块标准形态（出处标注 + 逐字摘录 + 实测输出）按规范执行
- 小程序模块若无可运行示例，`## 配套代码` 写「无独立 demo，见小节 XX」

### 5.5 校验（⑤）

1. grep：导航 `text: '0X-` 0 命中；总结无单层残留；面试题无五步法残留格式
2. `npm run prettier`
3. `npx vitepress build` 无 404 警告

## 6. 收尾：删除板块与清空资源

所有模块合并完成后执行：

1. 删除 `interview/` 整个目录（27 个 md + 8 个 assets 目录）
2. 删除 `.vitepress/config/interview.js`；`config.js` 移除 interview sidebar；`nav.js` 移除「不止于面试」入口
3. 清空根 `code/`（12 目录 241 文件，迁移所需后删除剩余）
4. 清空根 `public/`（16 张图片）
5. README.md 更新（如有引用 interview/ 或 code/ 的描述）
6. 全量校验：grep 无 `/interview/` 链接残留 → prettier → build 无 404

## 7. 执行顺序

基础 6 模块（01-HTML → 02-CSS → 03-JS → 04-网络浏览器 → 05-React → 06-Vue，每模块独立提交）→ 进阶 6 模块（01-TS → 02-工程化 → 03-交付质量 → 04-框架原理 → 05-性能监控 → 06-工程实践，可合并提交）→ 新增小程序模块 → 删除板块与清空资源收尾提交。

## 8. 验证标准

- interview 板块完全删除，无 `/interview/` 链接残留，build 无 404
- 根 code/ 与 public/ 清空
- 各模块面试题无主题重复（与原有题去重），全部五步法格式
- 正文无重复知识点（补缺式合并不引入重复）
- frontend / node 导航正常，规范第 8 章校验全过

## 9. 非目标

- 不合并 node/ 侧内容
- 不重写 frontend 已有正文，只做补缺
- 不迁移 interview 的 assets 图片（并入时只抽取文字知识点）
- 不保留 interview 板块的任何残影（含软素质/面经内容）
