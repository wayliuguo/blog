# 项目长期约定（E:\working\blog）

## 仓库概览
VitePress 博客站（`base: '/blog/'`，构建 130s 左右）。内容分 `ai/` `alg/` `frontend/` `interview/` `node/` 五个板块，导航与侧边栏在 `.vitepress/config/*.js`。

## node/ 体系目录（2026-09-16 去附录 + 去编号后）
```
01-运行环境(8)  03-网络编程与实时通信(5)  04-Express 与 Koa(6)  05-数据库(7)  06-Redis(5)
07-NestJS 入门(7)  08-NestJS 进阶(12)  09-部署与工程化(9)  10-脚手架开发(1)  11-进阶主题(7)
12-面试方法论(1)
```
- **目录编号只作文档 ID**，真实阅读顺序以侧边栏为准（模块编号与目录编号并不对齐）
- `node/index.md`、`node/90-附录/`、`node/00-学习路径图.md` 均已删除
  - 附录 9 文件 3774 行 → 备份 `C:\Users\10855\.workbuddy\tmp\bak-90-附录`
  - 学习路径图 328 行、自测记录表 87 行 → 备份 `C:\Users\10855\.workbuddy\tmp\bak-学习路径图`、`bak-自测记录表`
- **`/node/` 下没有根级落地页**；顶部导航「Node 后端」直达模块一第一篇 `/node/01-运行环境/01-Node.js 是什么`（与 AI→`/ai/claudeCode`、算法→`/alg/array` 的「直达首篇」约定一致）
- 首页 `index.md` 的「😊快速开始」按钮指向 `/ai/claudeCode`

## 元页面命名（2026-09-16 起，用户要求）
- **面试题页与总结页一律不带编号**：`<模块主目录>/面试题.md`、`<模块主目录>/总结.md`
- 6 个模块各一份，位置同模块的「面试题页」所在目录：
  `01-运行环境` · `03-网络编程与实时通信` · `04-Express 与 Koa` · `05-数据库`（模块四跨 06-Redis）· `07-NestJS 入门`（模块五跨 08-NestJS 进阶）· `09-部署与工程化`（模块六跨 10/11）
- `12-面试方法论/01-面试方法论.md` 保留编号（它是知识篇，不是元页面）

## 模块面试题页
- **面试题按模块集中**，6 页：`01-运行环境`(54 题) · `03-网络编程与实时通信`(34) · `04-Express 与 Koa`(23) · `05-数据库`(66) · `07-NestJS 入门`(62) · `09-部署与工程化`(49)
- 各篇正文**不再自带 `## 面试题` 小节**；每篇 `## 参考` 首两行是 `- 本模块总结：[总结](./总结.md)`、`- 本模块面试题：[面试题](./面试题.md)`
- 面试题页结构：`## 一、基础概念` → `## 二、机制与原理` → `## 三、排障与选型` →（模块二/四/五/六另有）`## 四、场景设计题`；每题末尾标出处（如 `（第 03 篇）`）
- 面试题页引言只写「用法 / 怎么用」与「题目来源」两行，**不写「覆盖本模块 N 篇……」的篇目清单**

## 模块总结页（2026-09-16 新增）
- 定位：**篇级小结的模块版本**，把模块内每篇的知识点压成可回查清单。固定结构（标题不带中文数字编号）：
  `## 知识主线` → `## 分篇知识点` → `## 核心速查表` → `## 见 X 想 Y` → `## 易错点汇总` → `## 与相邻模块的接口` → `## 代码与自测入口` → `## 参考`
- `## 分篇知识点` 是一篇一个 `###`，条目格式 `- **知识点名**：一句话概括`，知识点名要能当搜索关键词
- 跨目录模块（四/五/六）的 `###` 标题与速查表出处必须带目录区分（`### 数据库 01-MySQL 基础`、`09-部署/02 篇`）
- 规范原件：`C:\Users\10855\.workbuddy\tmp\模块总结规范.md`

## 篇级小结（2026-09-16 已完成）
- **64 篇正文各有一个 `## 小结`**，放在 `## 配套代码` 之前（无该节则放 `## 参考` 之前；若该标题前紧邻 `---` 分隔线，小结插到分隔线之前）
- 形态 = 模块总结「分篇知识点」的同一份内容：`- **知识点名**：一句话概括`，一篇 4~17 条
- **不加**的 3 篇：`01-运行环境/08-运行机制收束`、`03-网络编程与实时通信/00-导读与全景图`、`03-网络编程与实时通信/04-一次请求完整经历了什么`
- **做法（可复用）**：模块总结的 `## 分篇知识点` 就是篇级小结的模块版本 → 用脚本解析 6 份总结、按「两位编号 + 标题」匹配真实文件、把条目原样插回各篇，两级口径天然一致（脚本 `C:\Users\10855\.workbuddy\tmp\b2_insert.py`，幂等，已有 `## 小结` 的篇跳过）
- 长篇另做定向增补：`07-进程线程与优雅退出`(17 条) / `03-事件循环（上）`(14) / `06-Buffer 与 Stream`(14) / `TCP 与 Socket`(14) / `07-NestJS 入门/05-请求处理链`(14) / `08-NestJS 进阶/10-项目模板`(12)
- 22 篇没有 `## 配套代码` 小节的篇目（MongoDB 3 / NestJS 进阶 3 / 部署 8 / 脚手架 1 / 进阶主题 7）**用户要求后面再补**
- `02-模块系统与包管理` 的**代码缺口已补齐**（新增 `09-parse-time.mjs` / `10-sync-vs-async.mjs` + 3 个 lib 模块）；事件循环补了 `18-eventloop-phases.js`。补法：先拿该篇 `## ` 小节清单当覆盖检查表，找出「正文讲了、代码里没有」的点，再逐个写可跑脚本并**实跑确认输出**

## 文档体例（2026-09-16 起生效）
1. 首行是 `# <篇标题>`，正文**直接从第一个知识小节开始**
2. **不写** `> 承上：` / `> 启下：` 两行导航；**不写** `## 开篇：这篇到底要解决什么` 小节
3. 小节标题**即问题或判断句**（`## Node.js 真的是单线程吗？`），不写名词罗列
4. 结尾固定两节、顺序不可变：`## 配套代码` → `## 参考`（批次 2 后在其前加 `## 小结`）
5. `## 配套代码` 的路径以**文本**给出（如 `` `./code/node-basics/src/04-eventloop-order.js` ``），不做成链接
6. **ASCII 图一律用裸 ```` ``` ```` 围栏，不要写 ```` ```text ````** —— vitepress beta.6 未加载 `text` 语言，会刷 100+ 条高亮告警（实测）
7. 篇内引用别篇写「见第 X 篇」，不重复讲

## 配套代码位置（2026-09-16 起生效）
**代码与文档同目录**：`node/<模块目录>/code/<项目名>/`。根目录 `code/node/` 已废弃（目录已删）。
```
node/01-运行环境/code/node-basics          net-lab 在 03-网络编程与实时通信/code/
node/04-Express 与 Koa/code/{express-mini,koa-mini,express-template,koa-template}
node/05-数据库/code/mysql-demo             node/06-Redis/code/redis-demo
node/07-NestJS 入门/code/nestjs-mini       node/08-NestJS 进阶/code/{nestjs-template,microservice-demo}
```
（共 11 个项目；模块六 `09-部署与工程化` 没有独立 code 项目）
- 必须靠 `.vitepress/config.js` 的 `srcExclude` 把 `code/` 排除出页面集合（已加 `'**/code/**'`）
- `node-basics` 是零依赖项目，主脚本 `00`~`18` 编号 + `src/module-realm/` 模块系统实验组（`01`~`10`），`package.json` 里每个脚本一条 npm script
- **脚本 ↔ 正文的对应口径（用户明确要求）**：
  - `02-模块系统与包管理` 的配套代码必须覆盖正文那四个核心差异，表格就按这个顺序排：**解析时机**（`module-realm/09-parse-time.mjs`）/ **加载语义**（`03-cjs-value-vs-esm-binding.mjs`）/ **同步 vs 异步加载**（`10-sync-vs-async.mjs`）/ **互操作**（`04` `05` `06`）；其余脚本（缓存 `01`、`exports` 陷阱 `02`、解析算法 `07`、`type` 开关 `08`）排在其后
  - `03-事件循环（上）` 的 `18-eventloop-phases.js` 是**唯一的「多阶段观测」脚本**（timers / poll / check / close callbacks 依次点亮），用途是看阶段、不是推输出顺序；`08-运行机制收束` 的连跑清单里也列了它
  - `module-realm/lib/` 的公共模块：`counter.cjs` `counter.mjs` `store.cjs` `only-esm.mjs` `tla-esm.mjs` `eval-trace.mjs`（解析时机用）`slow.cjs` `slow.mjs`（同步/异步加载用）
- **新增脚本必须同步三处，缺一处就自相矛盾**：lab 的 `README.md`（该文件有**两张表**：脚本清单 + 运行与预期输出，都要加行）、`package.json` 的 `scripts`、对应篇正文的 `## 配套代码` 表格

## 校验三件套（改完 node/ 必跑）
```powershell
& "<node.exe>" ".workbuddy/scripts/check-links.cjs"              # 正文相对链接 + 导航/侧边栏 + 落地页
& "<node.exe>" ".workbuddy/scripts/check-sidebar-coverage.cjs"   # node/ 下每篇是否都能从侧边栏到达
& "<node.exe>" "node_modules/vitepress/bin/vitepress.js" build   # 死链 + 渲染（约 130s）
```
- `check-sidebar-coverage.cjs` 已改为**跳过 `code` 目录**（否则会把 code 项目里的 README 当成漏配的文档页）
- `check-links.cjs` 会遍历 `node/` 下**包括 code/** 的所有 md，所以 code 项目 README 里的相对链接也要保持可达
- `check-links.cjs` 已修目录链接盲点：指向目录的链接必须落在 `index.md` 上，否则 VitePress 判死链而脚本会放过
- 构建输出目录是 **`.vitepress/dist`**（不是根目录 `dist`）

## 已知遗留（非 node 范围，未处理）
- `frontend/` 目录在 2026-09-16 两次会话之间被更换过内容（现为 11 个目录，`frontend/index.md` 与 `90-附录-面试体系/` 已不存在），而 `.vitepress/config/frontend.js` 与 `nav.js` 仍指向旧路径 → `check-links.cjs` 报 **73 处 frontend 死链**。需要单独修 frontend 侧配置。

## 本机执行约定
- bash 工具 PATH 是坏的（`ls`/`dirname`/`mkdir`/`head` 全 not found）→ 用 Python 全路径执行脚本，或 PowerShell 工具
- PowerShell 不回显中文 stdout（GBK 乱码）→ 一律 `Out-File` 落文件再用 Read 读
- git 用 `"E:\Program Files\Git\cmd\git.EXE"` 全路径
- 临时脚本/中间产物一律放 `C:\Users\10855\.workbuddy\tmp\`，别落在仓库里
