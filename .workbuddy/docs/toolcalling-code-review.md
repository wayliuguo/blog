# ToolCalling 篇 · 文档 ↔ 原文 ↔ 配套代码 一致性审查

- 日期：2026-10-08
- 审查对象：`ai/agent-development/ToolCalling让LLM调用程序.md`
- 原文：《前端转 Agent 开发｜Agent Day 2：Tool Calling》楠熠之 2026-09-07（mp.weixin.qq.com/s/zRur14L9UxGtNb1TMjDH3Q）
- 配套代码：`ai/agent-development/code/tool-calling/`（tools-schema.ts、tool-closure.ts）

## 结论

**用户反馈属实**：原文全篇建立在 Day 1 的 NestJS 工程之上（`src/agent` + `src/llm` + 新增 `src/tools` 三模块分层），配套代码却是平铺双脚本 + mockLLM，与原文工程形态不符；且正文对此偏离**未作任何声明**，仅 calculator 一处声明了差异。

## 发现清单（按严重度）

### M1（Major）· 配套代码工程形态与原文不一致，且无声明
- 原文（实测抓取逐字核对）：
  - `nest g module tools` / `nest g service tools`，目录 `src/tools/tools.module.ts + tools.service.ts`
  - `ToolsModule` 显式 `exports: [ToolsService]`（供 AgentModule 注入）
  - 工具实现在 `ToolsService.getWeather / calculator`
  - 执行链在 Agent 侧 service（`switch (toolCall.function.name)` → `this.toolsService.getWeather(args.city)`）
  - 测试接口 `@Post('tools-test')`（POST /agent/tools-test），真实 DeepSeek 调用
- 配套代码现状：`tool-closure.ts` 平铺脚本，`toolMap` 查表 + `mockLLM` 剧本，零依赖，无任何 Nest 分层；README 仅一句「依赖 DeepSeek Key 的真实调用以示意片段呈现」。
- 对照：code/README.md 总表里篇 1 标注「完整 NestJS 工程」、篇 7/8 标注「零依赖镜像」，**篇 2~6 无任何标注**——读者默认其为常规工程，这正是困惑入口。

### M2（Major）· 正文示意与配套代码走向相反
- 正文「真正执行 Tool」小节展示原文的 `switch + this.toolsService`（标注「示意片段（无配套脚本）」），随后说「工具变多后可以升级为 toolMap 查表」；
- 但配套脚本 `tool-closure.ts` **已经是 toolMap**——示意（switch）与实际代码（toolMap）演进方向对不上，读者按正文叙述在配套代码里找不到对应物。

### M3（Minor）· 正文 8 处「摘自 code/tool-calling/…」代码块均出自 mock 脚本
- 判空分支 / Type Narrowing / assistant 回灌 / tool 回灌 / 二次调用 / toolMap / tools schema 全部摘自平铺脚本；若按原文形态重做配套代码，这 8 块需整体重新摘录并过 check-code-sync。

### M4（Minor）· 已声明的差异（合格项，保留）
- calculator 真实求值 vs 固定结果：正文第 55 行已明确声明并保留风险警告——这类「声明式偏离」是合格样板。
- 实跑读数注明 mock 剧本来源——诚实，但正是 M1 未声明导致的违和感来源。

## 调整方案

### 方案 A（推荐）：tool-calling 重做为真实 NestJS 工程，对齐原文分层
- 结构：复制 agent-basics 骨架（agent/llm 两模块 + .env DeepSeek），新增 `src/tools/`（ToolsModule exports ToolsService；getWeather/calculator 进 ToolsService），agent.service 增加 `chatWithTools()` 与 `@Post('tools-test')`，switch 分发。
- 正文：M2 的「升级为 toolMap」叙述回归原文顺序（switch 先行）；8 处代码块改为摘自 `src/agent/agent.service.ts` / `src/tools/tools.service.ts` / `src/llm/...`；实跑读数换真实 DeepSeek 输出；删 mock 相关脚注。
- code/README.md：篇 2 标注更新为「完整 NestJS 工程」。
- 成本：新工程 ~12 文件 + 沙箱 npm install（有既定绕法）+ 正文 8 块重摘 + 三校验。需 DEEPSEEK_API_KEY 实跑。

### 方案 B（保守）：保留零依赖脚本，补齐声明
- 正文「配套代码」节与脚本头注释补一段声明：本篇配套为零依赖镜像，工程形态见原文 Nest 分层/篇 1 工程；M2 的 switch/toolMap 叙述理顺。
- code/README.md 给篇 2~6 统一补「零依赖镜像」标注。
- 成本：约 1 小时内；但不满足「配套代码反映原文工程」的诉求。

（2026-10-08 审查时用户倾向 A——其反馈即「都不是 nest 那一套分层」。待确认范围后执行。）
