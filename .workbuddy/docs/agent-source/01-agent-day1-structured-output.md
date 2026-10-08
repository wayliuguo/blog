# Agent Day 1：从调用大模型到 Structured Output（对应博客篇 1）

- 来源：https://mp.weixin.qq.com/s/7Dd3rcsFi-noWpkO2Atdxw
- 作者：楠熠之 · 2026-09-04
- 抓取方式：WebFetch 摘要归档（2026-10-02）

## 提纲（原小节）
一、Agent 到底是什么 → 二、Agent 和普通大模型聊天的区别 → 三、项目结构：Agent 和 LLM 分开 → 四、安装 SDK（npm install openai，DEEPSEEK_API_KEY，.env 进 .gitignore）→ 五、创建 LlmModule（nest g module llm / service llm，exports LlmService）→ 六、实现 LlmService（new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com' })）→ 七、第一次调用 LLM（chat.completions.create，messages: system+user）→ 八、创建 AgentModule（nest g module/controller/service agent，imports LlmModule）→ 九、实现 AgentService（注入 LlmService 转发）→ 十、实现第一个接口（@Post('chat')，BadRequestException 校验，curl POST localhost:3000/agent/chat，npm run start:dev）→ 十一、messages 是什么（= 模型本次可见上下文；角色 system/user/assistant/tool）→ 十二、system prompt → 十三、user 和 assistant → 十四、模型不会记住之前聊天（多轮 = Context 管理）→ 十五、Context Window（System Prompt+Tool Definitions+History+Memory+RAG+Tool Results）→ 十六、开始 Structured Output（自然语言→JSON→程序行为）→ 十七、实现 Intent Parser（system prompt 列 intent schema + response_format: { type: 'json_object' }，JSON.parse(content)）→ 十八、JSON String ≠ Object → 十九、为什么不能只靠 Prompt 要求 JSON（要用 API 约束）→ 二十、合法 JSON ≠ Schema 正确（需要 Runtime Validation，未来引 Zod）→ 二十一、定义 TypeScript 类型（WeatherIntent/CalculatorIntent/ChatIntent 联合；as 断言无运行时检查）→ 二十二、第一次让 LLM 参与程序决策（AgentService.handle：switch intent → action）→ 二十三、仍不是真正 Agent（switch 不可扩展 → 引出 Tool Calling）→ 二十四、下一步 Day 2 Tool Calling / Agent Loop 预告。

## 核心概念
- LLM 不只回答问题，参与决定程序下一步 → Agent 的本质变化
- Agent ≠ LLM；LLM 是核心组件
- messages = Context；多轮对话本质是 Context 管理问题
- Structured Output：response_format json_object；JSON.parse；合法 JSON ≠ Schema 正确；TS 类型断言 ≠ 运行时校验（未来 Zod）
- 架构：AgentService 与 LlmService 分模块，Agent 不与模型厂商强绑定

## 事实性细节
- 技术栈 NestJS + DeepSeek（OpenAI 兼容 SDK），baseURL https://api.deepseek.com
- 环境变量 DEEPSEEK_API_KEY；.env 必须进 .gitignore
- 端口 3000；curl -X POST http://localhost:3000/agent/chat
- intent 枚举：weather（city/date）/ calculator（expression）/ chat（message）
- 模型名用占位「你当前实际使用的 DeepSeek 模型」

## 踩坑点
- .env 不自动进 process.env（博客 agent-nest 的 dotenv/config 坑与之对应）
- JSON.parse(content) 对 string|null；as IntentResult 只是编译期断言
- 只靠 prompt 要求 JSON 会被「好的，结果如下：{...}」或 ```json 围栏破坏
