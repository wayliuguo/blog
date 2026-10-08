# Agent Day 2：手写 Tool Calling（对应博客篇 2）

- 来源：https://mp.weixin.qq.com/s/zRur14L9UxGtNb1TMjDH3Q
- 作者：楠熠之 · 2026-09-07
- 抓取方式：WebFetch 摘要归档（2026-10-02）

## 提纲（原小节）
一、为什么有了 Structured Output 还要 Tool Calling → 二、Tool Calling 是什么 → 三、先准备两个 Tool → 四、实现 getWeather Tool（tools 模块，模拟数据 {city, temperature: 32, weather: '晴'}）→ 五、再实现 Calculator Tool（Function('"use strict"; return (...)')，警示代码执行风险）→ 六、模型怎么知道我们有哪些 Tool → 七、添加 Calculator Tool Schema → 八、第一次让 LLM 自己选择 Tool（chatWithTools：tools + tool_choice 'auto'）→ 九、建立 Tool Calling 测试接口（@Post('tools-test')，/agent/tools-test）→ 十、坑1 为什么还是返回 intent → 十一、Structured Output 与 Tool Calling 彻底区分 → 十二、坑2 Unexpected token '我' → 十三、Tool Calling 什么时候需要 JSON.parse → 十四、模型不一定每次都调用 Tool（判空分支）→ 十五、解析 Tool Call → 十六、坑3 新版 OpenAI SDK 的 TypeScript 类型（ChatCompletionMessageToolCall 联合类型）→ 十七、Type Narrowing（toolCall.type !== 'function' 收窄）→ 十八、现在真正执行 Tool（switch 分发 = Tool Dispatcher）→ 十九、为什么这里还有 switch（模型已选择，程序只执行；未来 toolMap→Tool Registry）→ 二十、Tool Result 为什么重新交给 LLM → 二十一、把 Assistant Tool Call 放回 Context（messages.push(assistantMessage)）→ 二十二、把 Tool Result 放回 Context（push {role:'tool', tool_call_id, content: JSON.stringify(result)}）→ 二十三、tool_call_id 是干什么的（多 Tool Call 关联，call_001/call_002）→ 二十四、第二次调用 LLM → 二十五、执行链串起来 → 二十六~二十七、Tool Calling 本质与和 Structured Output 的区别 → 二十八、仍不是完整 Agent → 二十九、下一步 Agent Loop。

## 核心概念
- Tool Schema 三要素 Name/Description/Parameters（JSON Schema 风格）；Definition ≠ Implementation
- tool_choice: 'auto'；tool_calls 结构 {id, type:'function', function:{name, arguments}}
- function.arguments 是 JSON String 需 JSON.parse；assistantMessage.content 是普通文本不能 parse
- 完整闭环：User → LLM → Tool Call → 程序执行 → Tool Result → LLM → Final Answer（两次调用）
- 三角色：LLM 决策 / Tool 行动 / NestJS 执行环境

## 事实性细节
- nest g module tools / service tools；端口 3000；curl POST /agent/tools-test
- Day 1 的 response_format json_object 不再使用
- 模拟天气 temperature: 32（Day 3 实战篇里是 35，注意篇目差异）

## 踩坑点
1. 坑1 还是返回 intent：走的是旧链路 /agent 而非 /agent/tools-test（要看结果来自哪条链路）
2. 坑2 Unexpected token '我'：对 content 做 JSON.parse
3. 坑3 Property 'function' does not exist on type 'ChatCompletionMessageToolCall'：联合类型需 Type Narrowing
- 模型不一定每次都调 Tool：先判 !toolCalls?.length
- calculator 用 Function() 有代码执行风险，生产需安全表达式解析
- tool_call_id 不可省略（一次多个 Tool Call）
