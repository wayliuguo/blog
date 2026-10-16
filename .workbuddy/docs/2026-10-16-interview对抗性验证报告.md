# interview/ 对抗性验证报告（2026-10-16）

> 验证对象：interview/ 下前端 7 篇 + 后端 1 篇 + AI 1 篇（共 9 篇）。
> 方法：对照矩阵（面试题知识域 ↔ 博客知识体系目录）+ 逐题三问（高频？准确？与简历自洽？）+ WebSearch 校准 2025-2026 市场高频题行情。
> 结论执行口径已经用户确认：React 补一篇、后端按知识体系拆分、经验 + WebSearch 抽查校准。

## 一、对照矩阵与市场校准结论

| 面试题篇目 | 对应知识体系 | 覆盖判定 | 市场高频判定 |
| --- | --- | --- | --- |
| JS与TS基础 | frontend/js、ts | ✅ 完整 | 全部高频（闭包/事件循环/手写清单均为必考） |
| 浏览器与网络 | 浏览器原理、网络 | ✅ 完整 | 全部高频（输入URL/缓存/HTTPS/跨域必考） |
| Vue | frontend/vue | ✅ 完整 | 高频（响应式细节是滴滴级追问重点，现有 Q1-Q3 已到依赖结构层） |
| 性能优化 | 性能优化 | ✅ 完整 | 高频（LCP/INP/CLS、首屏、虚拟列表均在校准结果内） |
| 自动化测试 | 测试体系 | ✅ 完整 | 中高频（与简历强绑定，作为差异化卖点合适） |
| 监控系统 | 前端监控 | ✅ 完整 | 中高频（简历自研 SDK 经验的支撑篇，保留） |
| 工程构建 | 构建体系、工程实践与架构 | ✅ 完整 | 高频（Vite 原理、tree-shaking、微前端均在校准结果内） |
| 后端·Node.js服务端（1篇94行） | node 6 大模块 | ⚠️ 过度压缩：11 个模块压成 1 篇，MySQL/Redis 各仅 2~3 题 | 高频，但深度撑不起赴演记全栈项目的追问 |
| AI·Agent开发 | ai/agent-development 9 篇 | ✅ 逐章对齐 | 准确性与体系一致；缺 Coding Agent/Skills 视角（简历主打） |
| （缺失）React | frontend/react 9 篇 | ❌ 0 篇覆盖 | 简历写「掌握 React」+ 赴演记 React 19，必被问 |
| （缺失）CSS 与移动端 | frontend/css、html | ❌ 0 篇覆盖 | 简历第一条技能写「移动端适配与响应式」，BFC/1px/rem/vw 高频 |

WebSearch 校准（2025-2026 行情）：Fiber/Hooks 链表与调用顺序/闭包陷阱、React18 并发与 startTransition、Vue3 effect-track-trigger 与 WeakMap 依赖结构、虚拟列表、Vite 插件、LCP/CLS 优化均为高频考题——现有题库方向吻合；「AI 集成与全栈能力」已进入趋势考点，支撑 AI 篇补 AI 研发工程化视角。

## 二、逐篇三问结论

### 前端 7 篇：全部保留，个别修订

- **JS与TS基础** ✅ 准确性核过：原始类型 7 种、typeof null、structuredClone 限制、微任务清单（MutationObserver 属微任务）均正确；「Q7 每轮取一个宏任务→清空微任务」表述正确。无需修订。
- **浏览器与网络** ✅ defer/async/module、状态码、HTTPS 三防、CORS 预检均准确。无需修订。
- **Vue** ✅ Q13「Vue3 中 v-if 优先级高于 v-for」正确（Vue2 相反，答案里已含对比逻辑）；Q4 生命周期父子顺序正确；Q2 依赖结构 WeakMap<target, Map<key, Set<effect>>> 与 2025 追问重点（WeakMap 选型原因）吻合——补一条「为什么用 WeakMap（target 销毁依赖随之 GC）」答点。
- **性能优化** ✅ 指标达标值（LCP≤2.5s/INP≤200ms/CLS≤0.1）、HTTP2/3、缓存实践均准确；红线与简历口径自洽。无需修订。
- **自动化测试** ✅ 红线明确（不提未落地目标值）；Cypress vs Playwright、flaky 治理为行业口径。无需修订。
- **监控系统** ✅ Script error 归因与解法（crossorigin + ACAM）正确；白屏检测、告警收敛准确；红线自洽。无需修订。
- **工程构建** ✅ CJS/ESM 差异、tree-shaking sideEffects、Babel 三段均准确；微前端口径与进阶模块改造方向一致。无需修订。

### 后端 1 篇：拆分为 3 篇（对齐 node 6 大模块）

- **面试题-Node核心与运行环境.md**（模块一·运行环境 + 模块二·网络底层）：承接原 Q1 事件循环/Q2 Stream/Q3 进程集群/Q4 内存泄漏，补 Buffer 与编码、uncaughtException/unhandledRejection 兜底。
- **面试题-NestJS与Web框架.md**（模块三·Web框架基础 + 模块五·后端架构）：承接原 Q5 NestJS/Q6 Koa洋葱/Q7 RESTful/Q8 JWT/Q16 WebSocket，补 DI 反射原理、DTO 校验、双 Token 刷新（对齐知识体系「认证进阶-双Token与多设备会话」篇）。
- **面试题-数据库缓存与部署.md**（模块四·数据与缓存 + 模块六·工程化与拓展）：承接原 Q9-Q12 数据库缓存、Q13-Q15 日志限流部署、Q17 CLI/npm，补连接池与慢查询定位。

### AI 篇：保留主体，头部补「AI 研发工程化」节

- 9 组题与 agent-development 9 篇逐章对齐 ✅，技术表述与博客实跑结论一致 ✅。
- 补 3 题：Coding Agent 工作流（Claude Code/Codex 怎么用出效率）、规格驱动开发（规格→AI实现→人工评审的落地与质量门禁）、Skill 沉淀方法论——对应简历「AI 研发」技能行与项目面试题里的证据链。

### 项目面试题.md（任务 1 产物，不在本次验证范围）

已重写为追问链版：追问链 + 数字盘问（1h→10min/百万PV/5h→30min 口径）+ 压力假设题 + 红线区集中。

## 三、落地清单

1. 新建 `interview/前端/面试题-React.md`
2. 新建 `interview/前端/面试题-CSS与移动端.md`
3. 新建 3 篇后端（替换原 1 篇）
4. AI 篇补「AI 研发工程化」节；Vue 篇补 WeakMap 追问点
5. 更新 `.vitepress/config/interview.js` 侧边栏
6. vitepress build 验证
