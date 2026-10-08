# Agent 实战篇：从 Tool Calling 到 Agent Loop（对应博客篇 3）

- 来源：https://mp.weixin.qq.com/s/igNHu_I5rA7NE2QHMjLgWA
- 作者：楠熠之 · 2026-09-09
- 抓取方式：WebFetch 摘要归档（2026-10-02）

## 提纲（原小节，有省略）
一、Tool Calling 并不等于 Agent → 二、什么是 Agent Loop → 三、为什么 Agent Loop 必须设置最大次数（MAX_ITERATIONS=10，Stop Condition）→ （四~七，网页摘要有省略：第一版 Agent Loop run()，多轮循环 push assistantMessage/tool 消息）→ 八、Tool 一多 AgentService 开始失控（几十个 if）→ 九、统一 AgentTool（name/description/schema: z.ZodType/execute() 四要素；WeatherTool implements AgentTool）→ 十、Tool Registry（内部 Map，getDefinitions() + 查找 Tool）→ （十一~十四省略：Zod 校验等）→ 十五、Tool 执行失败为什么不直接 HTTP 500（错误作为 Observation 返回给模型 → Self-Correction）→ 十六、重新理解 Agent：Action 与 Observation → 十七、目前 Agent 架构图 → 十八、今天最大的收获（5 点）→ （十九省略）→ 二十、下一步：让 Agent 拥有 Memory。

## 核心概念
- Agent = LLM + Tools + Context + Agent Loop + Stop Condition
- while 管多轮、for 管一轮内多个 tool_call
- MAX_ITERATIONS=10 超限 throw 'Agent 超过最大执行次数'
- AgentTool 统一协议四要素：name/description/schema/execute()；schema 为 z.ZodType
- ToolRegistry：Map 收口 invoke；Zod 校验失败不抛 500，而是把错误 JSON push 回 messages → Self-Correction
- Action = tool_call；Observation = Tool Result（Tool Error 也是 Observation）
- LLM 输出是不可信外部数据：JSON.parse + Schema Validation
- 第一版 run() 代码：messages(system+user) → while → create({model:'deepseek-v4-pro', messages, tools: toolRegistry.getDefinitions()}) → 无 tool_calls 返回 content；有则 for 每个 toolCall：type!=='function' continue；JSON.parse(function.arguments)；toolRegistry.invoke；push {role:'tool', tool_call_id, content: JSON.stringify(result)}

## 事实性细节
- NestJS + TypeScript + DeepSeek；无框架手写
- 模型名：deepseek-v4-pro（原文如此）
- Tool 示例：get_weather（返回 temperature 35/weather 晴/humidity 48）、search_indoor_places（陕西自然博物馆、西安科技馆）
- 多轮任务示例：查西安天气，超 30℃ 再推荐室内遛娃地点

## 踩坑点
- Tool Calling ≠ Agent：模型只表达意愿，执行/上下文/循环属于 Agent Runtime
- 不设 Stop Condition → 死循环 + Token 消耗 + 第三方 API 持续调用
- if 分发不可扩展 → AgentTool 协议 + Registry 解耦
- 参数校验失败直接 HTTP 500 是传统思维；错误应成为 Observation
