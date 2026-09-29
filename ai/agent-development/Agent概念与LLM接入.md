# Agent 是什么：从接入大模型到让 LLM 参与决策

## Agent 不等于 LLM：它让模型开始参与程序决策

普通大模型应用是"用户 → LLM → 答案"的单向链路；Agent 多出一条循环：LLM 决策 → 选工具 → 执行 → 结果回灌 → 再判断。最关键的差异是——**LLM 不再只回答，而开始参与决定程序下一步做什么**。这一步让"调用什么工具、传什么参数"由模型在运行时决定，而不是程序员写死的 `if/else`。

```
普通应用：  User → 程序(if/else) → 结果
LLM 应用：  User → LLM → Answer
Agent：     User → LLM → 决策 → Tool → 执行 → Observation → LLM → ...
```

| 维度 | 普通 LLM 应用 | Agent |
| ---- | ---- | ---- |
| 谁决定下一步 | 程序员（写死分支） | LLM（运行时决策） |
| 能否调用外部能力 | 不能（或靠人接） | 能（Tool Calling） |
| 是否需要循环 | 否 | 是（Agent Loop） |

> 结论先行：LLM 是 Agent 的核心组件，但 LLM 本身不等于 Agent。

## 先接入大模型：把"调用模型"独立成一层

Agent 本质是一个真实运行在服务端的软件系统，仍然需要 API、数据库、鉴权、部署。所以先不急着上框架，而是用 `NestJS + DeepSeek` 从最底层理解它怎么跑起来。

第一步是把"调用模型"独立成 `LlmModule`，通过依赖注入与 `exports` 暴露 `LlmService`，再把 Agent 行为放在 `AgentModule`。这样做到**模型厂商与 Agent 解耦**：换 DeepSeek / OpenAI / Claude 不推倒重写。

> 示意片段（无配套脚本）

```ts
// LlmModule：把"调用模型"这一层独立出来，exports 给 AgentModule 用
@Module({
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
```

Key 走环境变量（如 `DEEPSEEK_API_KEY`），不进代码、不提交 Git；用 OpenAI 兼容 SDK + `baseURL` 指向 DeepSeek 网关，零成本切换厂商。

> 示意片段（无配套脚本）

```ts
// LlmService：通过 baseURL 指向兼容网关，实际请求的是 DeepSeek
private readonly client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
})
```

## messages 就是 Context：多轮对话本质是上下文管理

调用模型时，最关键的参数是 `messages`——它就是模型这一次能看到的对话上下文。常见角色有 `system / user / assistant / tool`。

```
system   你是什么、任务是什么、约束是什么
user     用户输入
assistant 模型上一轮生成的内容
tool     工具执行结果
```

所谓"多轮对话"首先是 **Context 管理问题**：API 每次调用都是无状态的，上一轮对话不会自动保留。如果希望模型记得"我叫张三"，必须把历史消息重新放进 `messages`：

> 示意片段（无配套脚本）

```ts
// 多轮对话本质 = 把历史重新塞回 messages
const messages = [
  { role: 'user', content: '我叫张三。' },
  { role: 'assistant', content: '你好张三。' },
  { role: 'user', content: '我叫什么？' },
]
```

而 `Context Window` 有容量上限，一轮调用到底该把什么放进 Context（System + Tool 定义 + 历史 + 记忆 + RAG 文档 + 工具结果 + 当前消息），正是后面 Context Engineering 要解决的。

## Structured Output：让自然语言进入程序逻辑

自然语言 → LLM → 自然语言，程序很难直接行动；Structured Output 把链路变成 自然语言 → LLM → JSON → 程序对象 → 行为。

```
自然语言 → LLM → { intent: "weather", city: "西安" } → 程序行为
```

优先用模型 API 自带的 `response_format: { type: 'json_object' }` 约束输出，而不是只靠 Prompt 说"请返回 JSON"——后者模型可能包一层"好的，结果是：{...}"导致 `JSON.parse` 报错。

> 示意片段（无配套脚本）

```ts
// 用 API 自带的 json_object 约束，比纯 Prompt 可靠
const response = await client.chat.completions.create({
  model: 'deepseek-chat',
  response_format: { type: 'json_object' },
  messages: [{ role: 'system', content: '你是一个意图分析器，只返回 JSON。' }],
})
const result = JSON.parse(response.choices[0].message.content)
```

## JSON 合法不等于 Schema 正确：运行时要校验

模型返回的 `content` 本质还是字符串，`JSON.parse` 后只是 JavaScript 对象；但"JSON 格式正确"不等于"结构正确"——字段名、类型可能错。所以 Structured Output 之后还要做 **Runtime Validation**（用 Zod 定义 Schema 并显式 `parse`）。

> 摘自 `code/agent-lab/llm-access/intent-schema.ts`（运行：`npm run intent`）

```ts
export const WeatherIntent = z.object({
  intent: z.literal('weather'),
  city: z.string(),
  date: z.string()
})
export const CalculatorIntent = z.object({
  intent: z.literal('calculator'),
  expression: z.string()
})
export const ChatIntent = z.object({
  intent: z.literal('chat'),
  message: z.string()
})
export const IntentResult = z.discriminatedUnion('intent', [
  WeatherIntent,
  CalculatorIntent,
  ChatIntent
])

// 运行时校验：JSON 合法 ≠ Schema 正确，必须显式 parse 才进业务系统。
export function parseIntent(raw: unknown): z.infer<typeof IntentResult> {
  return IntentResult.parse(raw)
}
```

> 示意片段（无配套脚本）

```ts
// 反例：as IntentResult 只是编译期断言，运行时零检查
const bad = JSON.parse(content) as IntentResult // 危险：类型与校验必须分开
```

形成完整链路：`LLM → Structured Output → JSON → Zod Schema → 校验 → TS 对象 → Agent`。类型（`type`）与运行时校验（`parse`）必须分开——`as X` 不会做任何运行期检查。

## 一个判断：现在还不是真正的 Agent

仅用 "LLM → Structured Output → intent → `switch` → Tool" 仍不是 Agent：业务分支会随工具增多无限膨胀（`case 'weather'`、`case 'calculator'`、`case 'search'`…）。更合理的是直接告诉模型"你有这些工具"，让它自己决定调用——这正是下一篇 Tool Calling 要做的事。

## 配套代码

| 脚本 | npm script | 对应小节 |
| --- | --- | --- |
| `code/agent-lab/llm-access/intent-schema.ts` | `npm run intent` | JSON 合法不等于 Schema 正确 |

## 参考

- [Agent 模块总结](./总结.md)
- [Agent 模块面试题](./面试题.md)
- 下一篇见第 2 篇：Tool Calling 让 LLM 真正调用程序
