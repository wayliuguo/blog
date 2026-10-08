# Agent 是什么：从接入大模型到让 LLM 参与决策

## Agent 到底是什么：从「程序员写规则」到「LLM 参与决策」

普通后端程序的下一步执行什么，完全由程序员提前决定——写好规则，程序照着走：

```
普通后端：  User → Controller → Service → if/else → Database / API → Response

程序员 → 编写规则 → 程序执行
```

而 Agent 的链路里出现了一个关键的新角色：

```
User → LLM → 理解用户目标 → 决定下一步做什么 → 选择 Tool → 执行 Tool
     → 获取结果 → 再次判断 → 继续执行 / 返回答案
```

- **以前**：`if (action === 'weather') return getWeather()`——分支是写死的。
- **现在**：LLM 在运行时理解用户目标，决定下一步调用什么、传什么参数。

这个变化是 Agent 最核心的定义：**LLM 不再只是回答问题，而开始参与决定程序下一步应该做什么**。

## Agent 和普通大模型聊天的区别：一条分界线

普通 LLM 应用是一条单向链路：`User → LLM → Answer`。用户问「西安今天热不热」，模型凭自己的知识回答，可能过时、可能虚构——因为它没有任何获取真实数据的能力。

Agent 则至少多出一个「行动」环节：

```
LLM 应用：  User → LLM → Answer

Agent：     User → LLM → 判断需要天气数据 → getWeather() → 获取真实天气
            → LLM → 生成最终答案
```

复杂任务里，这个「行动」会出现多次：

```
User → LLM → Tool A → LLM → Tool B → LLM → Tool C → LLM → Final Answer
```

| 维度 | 普通 LLM 应用 | Agent |
| ---- | ---- | ---- |
| 谁决定下一步 | 没有「下一步」，一问一答 | LLM（运行时决策） |
| 能否调用外部能力 | 不能 | 能（Tool Calling） |
| 是否需要循环 | 否 | 是（Agent Loop） |
| 数据来源 | 模型参数里的旧知识 | 工具返回的真实数据 |

> 结论先行：LLM 是 Agent 的核心组件，但 LLM 本身不等于 Agent。

分界线清楚了，接下来不动用任何框架，用 NestJS + DeepSeek 从最底层把这条链路亲手搭出来——本篇全部代码来自配套工程 `code/agent-basics/`，拼起来就是一个能 `npm start` 的完整项目。

## 第一步架构决策：把 Agent 和 LLM 拆开

动手之前先分层。把「调用模型」独立成 `LlmModule`，把「Agent 行为」放在 `AgentModule`：

```
src
├── agent
│   ├── agent.module.ts
│   ├── agent.controller.ts
│   └── agent.service.ts
└── llm
    ├── llm.module.ts
    └── llm.service.ts
```

这样拆的原因是，Agent 未来的结构会长成这样：

```
AgentService
      │
  ┌───┼───────────┐
  ▼   ▼           ▼
LLM  Memory      Tools
 │     │           │
 │     ▼           ▼
 │  （第 4 篇起）  （第 2 篇起）
 │
 ▼
LlmService
 │
 ┌──┼──────┐
 ▼  ▼      ▼
DeepSeek OpenAI Claude
```

`LlmModule` 只做一件事：把 `LlmService` 提供出去：

> 摘自 `code/agent-basics/src/llm/llm.module.ts`

```ts
import { Module } from '@nestjs/common'
import { LlmService } from './llm.service'

@Module({
    providers: [LlmService],
    exports: [LlmService]
})
export class LlmModule {}
```

- `AgentModule` 通过 `imports: [LlmModule]` 拿到 `LlmService`；
- `LlmModule` 用 `exports: [LlmService]` 把能力暴露出去。

这一步换来一个长期的自由度：**Agent 不应该和某一家模型厂商强绑定**。以后把 DeepSeek 换成 OpenAI，Agent 本身不需要推倒重写。

## 实现 LlmService：拿到调用模型的能力

DeepSeek 提供 OpenAI 兼容接口，所以直接安装 OpenAI SDK（`npm install openai`），通过 `baseURL` 把请求指到 DeepSeek 网关：

> 摘自 `code/agent-basics/src/llm/llm.service.ts`

```ts
import { Injectable } from '@nestjs/common'
import OpenAI from 'openai'

@Injectable()
export class LlmService {
    private readonly client: OpenAI

    constructor() {
        // 优先 DeepSeek 变量名，回退 OpenAI 变量名
        const apiKey = process.env.DEEPSEEK_API_KEY ?? process.env.OPENAI_API_KEY
        if (!apiKey) {
            throw new Error(
                '未找到 API Key：请在项目根目录 .env 中写入 DEEPSEEK_API_KEY=sk-...（也可写 OPENAI_API_KEY），' +
                    ' Key 在 platform.deepseek.com 申请。'
            )
        }

        // 调用链：NestJS → LlmService → OpenAI SDK → DeepSeek API → LLM
        this.client = new OpenAI({
            apiKey,
            baseURL: 'https://api.deepseek.com'
        })
    }
```

虽然用的是 OpenAI SDK，但 `baseURL: 'https://api.deepseek.com'` 决定了实际请求的是 DeepSeek。API Key 从环境变量读（工程里是 `.env`，见 `.env.example`），不写进代码、不提交 Git。

两处小改动是工程化之后才补上的：

- `DEEPSEEK_API_KEY ?? OPENAI_API_KEY`：换厂商时只换 `.env`，不用改代码；
- `if (!apiKey) throw`：缺 Key 时立刻用中文说清去哪配，而不是等 SDK 抛一句 `Missing credentials` 让你猜。

### 坑：`.env` 里的变量不会自动进 `process.env`

这是新手最容易卡住的一步，而且报错信息完全指不到真因。你在 `.env` 里老老实实写了 `DEEPSEEK_API_KEY=sk-xxxxx`，代码也读的是 `process.env.DEEPSEEK_API_KEY`，但**启动时依然报**：

```
ERROR [ExceptionHandler] Missing credentials. Please pass an `apiKey`, or set the `OPENAI_API_KEY` environment variable.
    at new OpenAI (node_modules/openai/src/client.ts:361:13)
    at new LlmService (src/llm/llm.service.ts:10:19)
```

原因很简单：**NestJS 不读 `.env`，`tsx`/`node` 也不读**。文件躺在磁盘上，和 `process.env` 之间没有任何自动通道，`process.env.DEEPSEEK_API_KEY` 从头到尾就是 `undefined`。官方做法是用 `@nestjs/config`：

> 摘自 `code/agent-basics/src/main.ts`

```ts
// 必须放在第一行：在 Nest 启动之前把根目录 .env 灌进 process.env。
// 否则 NestFactory.create() → LlmService 构造时读到的是 undefined，
// OpenAI SDK 只会抛一句英文 "Missing credentials"，看不出真正原因。
import 'dotenv/config'
```

> 摘自 `code/agent-basics/src/app.module.ts`

```ts
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AgentModule } from './agent/agent.module'

@Module({
    // ConfigModule.forRoot() 会把项目根目录的 .env 读进 process.env。
    // 少了这一行，LlmService 里的 process.env.DEEPSEEK_API_KEY 永远是 undefined。
    // isGlobal: true 表示全应用可见，AgentModule 里不必再单独 import。
    imports: [ConfigModule.forRoot({ isGlobal: true }), AgentModule]
})
export class AppModule {}
```

两行分工不同，别省掉任何一行：`main.ts` 的 `dotenv/config` 负责在 Nest 起来**之前**就把变量灌进 `process.env`（这样启动自检能读到），`app.module.ts` 的 `ConfigModule.forRoot()` 负责把配置纳入 Nest 的模块体系、后面要用 `ConfigService` 时直接从它拿。

> 判断标准：如果 `process.env.X` 在模块构造函数里拿到 `undefined`，先别怀疑注入，先问「谁把 `.env` 读进来了」。

有了 client，第一次调用只需要一个 `messages` 数组：

> 摘自 `code/agent-basics/src/llm/llm.service.ts`

```ts
    async chat(message: string) {
        const response = await this.client.chat.completions.create({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: '你是一个专业的 AI Agent 助手。' },
                { role: 'user', content: message }
            ]
        })

        return response.choices[0].message.content
    }
```

`LlmService` 现在已经拥有调用模型的能力。

## 组装 AgentModule 与第一个接口

接着把「Agent 行为」装进 `AgentModule`：`imports` 引入 `LlmModule`，挂上 Controller 和 Service：

> 摘自 `code/agent-basics/src/agent/agent.module.ts`

```ts
import { Module } from '@nestjs/common'
import { AgentController } from './agent.controller'
import { AgentService } from './agent.service'
import { LlmModule } from '../llm/llm.module'

@Module({
    imports: [LlmModule],
    controllers: [AgentController],
    providers: [AgentService]
})
export class AgentModule {}
```

`AgentService` 注入 `LlmService`。现在看它只是转发一次请求，但未来这里会逐渐长出 Prompt、Context、Tools、Memory、RAG、Agent Loop——**`AgentService` 最终会成为整个 Agent 系统的核心**：

> 摘自 `code/agent-basics/src/agent/agent.service.ts`

```ts
  constructor(private readonly llmService: LlmService) {}

  async chat(message: string) {
    return this.llmService.chat(message)
  }
```

Controller 暴露 `POST /agent/chat`，顺带做参数校验：

> 摘自 `code/agent-basics/src/agent/agent.controller.ts`

```ts
import { BadRequestException, Body, Controller, Post } from '@nestjs/common'
import { AgentService } from './agent.service'
// …

  @Post('chat')
  async chat(@Body('message') message: string) {
    if (!message) {
      throw new BadRequestException('message 不能为空')
    }

    const result = await this.agentService.chat(message)
    return { message: result }
  }
```

### 坑：用 `tsx` 直接跑，依赖注入会静默失效

`tsx src/main.ts` 跑 NestJS，最诡异的故障是这样的：**启动日志一切正常**（`Nest application successfully started`、路由也都 `Mapped` 了），但第一个请求就 500：

```
ERROR [ExceptionsHandler] Cannot read properties of undefined (reading 'handle')
    at AgentController.intent (src/agent/agent.controller.ts:24:30)
```

`this.agentService` 是 `undefined`。Nest 是靠装饰器元数据（`emitDecoratorMetadata` 生成的 `design:paramtypes`）才知道构造函数要注入哪个类型的，而**`tsx` 底层是 esbuild，esbuild 至今不支持 `emitDecoratorMetadata`**。元数据一缺失，Nest 解析不出依赖——关键是它**不报错**，照样把 Controller 建出来，只是里面全是 `undefined`，等到请求进来才炸。

所以 NestJS 工程不要走 `tsx` 这条路径，用 `tsc` 的产物：

```bash
npm run build   # tsc -p tsconfig.json，输出到 dist/
npm start       # tsc -p tsconfig.json && node dist/main.js
```

配套的 `start:dev` 也是 `tsc --watch` 而非 `tsx watch`——Watcher 只重编译、不重跑 Node 进程，DI 元数据同样会丢。

> 判断标准：Nest 报「`undefined` 上读某个方法」而不是「can't resolve dependencies」，先怀疑运行器吃了装饰器元数据。

`npm start` 启动后用 curl 测试：

```bash
curl -X POST http://localhost:3000/agent/chat \
  -H "Content-Type: application/json" \
  -d '{ "message": "什么是 AI Agent？" }'
```

到这里，第一条完整链路终于跑通：

```
User → AgentController → AgentService → LlmService → DeepSeek → Response
```

但要明确：**这一步还不能称为 Agent**，它只是 LLM Application。

## messages 就是模型这一次的 Context

调用模型时最关键的参数是 `messages`——它看起来是个普通数组，实际上是**模型这一次能够看到的对话上下文**。常见角色有四个：

| role | 含义 | 典型内容 |
| ---- | ---- | ---- |
| `system` | 设定模型身份与规则 | 你是谁、任务是什么、有哪些约束、按什么格式输出 |
| `user` | 用户输入 | 「西安今天多少度？」 |
| `assistant` | 模型上一轮的生成内容 | 「西安今天 32 度」 |
| `tool` | 工具执行结果 | `{"city":"西安","temperature":32}` |

`system` 会成为 Agent 行为控制非常重要的一部分——真正的 Agent System Prompt 不只写「你是助手」，还会写「你拥有哪些工具、什么时候该用工具、不要猜测」。

## 模型不会自己记住聊天：多轮对话首先是 Context 管理问题

这是第一个必须建立的认识。第一次请求：

```
user: 我叫张三。        →  assistant: 你好张三。
```

第二次重新调 API，只发一条 `user: 我叫什么？`——**模型没有可靠依据知道你叫张三**。因为对 API 来说，上一次调用已经结束，模型是无状态的。

要让它「记得」，必须把历史重新放进去：

> 摘自 `code/agent-basics/src/llm/llm.service.ts`

```ts
      messages: [
        { role: 'system', content: '你是一个专业的 AI Agent 助手。' },
        // …
```

> 示意片段

```ts
messages: [
  { role: 'user', content: '我叫张三。' },
  { role: 'assistant', content: '你好张三。' },
  { role: 'user', content: '我叫什么？' },
]
```

这时模型才能根据 Context 回答「你叫张三」。所以：

> 所谓多轮对话，本质上首先是 Context 管理问题——而不是模型自带记忆。

## Context Window：这一轮到底该把什么放进去

历史不能无限增长——模型一次能处理的信息存在容量上限，这就是 Context Window。而一个真正 Agent 的 Context 里，很可能同时塞着这些东西：

```
System Prompt
+ Tool Definitions
+ Conversation History
+ Memory
+ RAG Documents
+ Tool Results
+ Current User Message
```

所以做 Agent 之后真正要回答的问题是：**这一轮调用，到底应该把什么内容放进 Context？**——这就是 Context Engineering，后面第 4~6 篇全部围绕它展开。

## Structured Output：让自然语言进入程序逻辑

Context 的形态清楚了，下一个问题是：模型回答的内容程序怎么用？普通调用是「自然语言进、自然语言出」。用户说「帮我查一下西安今天的天气」，模型回「好的，我来帮你查询」——人能看懂，但**程序没法根据这句话做下一步操作**。

程序真正想要的是：

> 示意片段

```json
{ "intent": "weather", "city": "西安", "date": "today" }
```

于是链路发生了质变：

```
自然语言 → LLM → Structured Output → JSON → JavaScript Object → 程序行为
```

实现上是在 System Prompt 里写清约定，并用 API 提供的 JSON 模式约束输出。给 `LlmService` 增加 `parseIntent`：

> 摘自 `code/agent-basics/src/llm/llm.service.ts`

```ts
    async parseIntent(message: string) {
        const response = await this.client.chat.completions.create({
            model: 'deepseek-chat',
            messages: [
                {
                    role: 'system',
                    content: `你是一个用户意图分析器。你必须以 JSON 格式返回结果。
支持以下 intent：
weather: { "intent": "weather", "city": "城市", "date": "日期" }
calculator: { "intent": "calculator", "expression": "数学表达式" }
chat: { "intent": "chat", "message": "用户原始消息" }
只返回 JSON。`
                },
                { role: 'user', content: message }
            ],
            response_format: { type: 'json_object' }
        })

        const content = response.choices[0].message.content
        if (!content) {
            throw new Error('模型返回内容为空')
        }

        return JSON.parse(content) as unknown
    }
```

这一步非常重要：**LLM 开始真正成为后端程序中的一个智能组件**。但 `parseIntent` 的返回值里藏着三个坑。

## 坑一：JSON String 不是 JavaScript Object

模型返回的 `response.choices[0].message.content` 本质是 `string | null`。即使内容长得像对象，对 JavaScript 来说也只是 JSON String——上面代码里的 `JSON.parse(content)` 这一步不能省，否则访问属性只会拿到 `undefined`。

解析链路必须走完整：

```
LLM → JSON String → JSON.parse() → JavaScript Object
```

之后才能真正 `result.intent`、`result.city`、`result.date`。

## 坑二：只靠 Prompt 要求「请返回 JSON」不可靠

如果只在 Prompt 里说「请返回 JSON」，模型可能返回：

```
好的，结果如下：{ "intent": "weather" }
```

甚至包一层 ```` ```json ```` 代码围栏。这些内容人能看懂，`JSON.parse` 却直接报错。所以上面的 `parseIntent` 同时做了两手：Prompt 写清约定 + `response_format: { type: 'json_object' }` 用 API 本身约束——**只要模型 API 支持 JSON Output / Structured Output，就应该用 API 的约束，而不是完全依赖 Prompt**。这也是 Demo 和 Production Agent 的区别之一。

## 定义 TypeScript 类型

模型返回的 JSON 接下来要进入程序逻辑，先给三种意图定义类型（工程里的 `intent.types.ts`）：

> 摘自 `code/agent-basics/src/llm/intent.types.ts`

```ts
// 三种意图的 TypeScript 类型：模式由源文约定，类型只做编译期描述。
export type WeatherIntent = {
  intent: 'weather'
  city: string
  date: string
}

export type CalculatorIntent = {
  intent: 'calculator'
  expression: string
}

export type ChatIntent = {
  intent: 'chat'
  message: string
}

export type IntentResult = WeatherIntent | CalculatorIntent | ChatIntent
```

## 坑三：合法 JSON 不等于 Schema 正确，`as` 断言也不做检查

模型返回 `{ "intent": "get_weather", "location": "西安" }`——是合法 JSON，但程序期待的是 `intent: 'weather'`、`city` 字段。也就是说：

```
JSON Format 正确 ≠ Schema 正确
```

更隐蔽的是 `as` 断言：写 `JSON.parse(content) as IntentResult` 并不代表完成了验证——`as` 只是告诉 TypeScript「相信我」，类型在编译后已被擦除，**运行时没有任何检查发生**。错误的字段名、错误的 intent 值都能穿过断言继续往下走。

所以 **TypeScript Type 和 Runtime Validation 一定要区分开**：类型负责编译期描述，校验必须交给运行时工具。

## 用 Zod 收口：运行时校验才是底线

Structured Output 之后必须接 Runtime Validation，形成可靠链路：

```
LLM → Structured Output → JSON → Zod Schema → Validation → TypeScript Object → Agent
```

工程里的实现是 `intent.schema.ts`——用 `z.discriminatedUnion` 按 `intent` 字段判别三种意图：

> 摘自 `code/agent-basics/src/llm/intent.schema.ts`

```ts
// 运行时校验：JSON 合法 ≠ Schema 正确，必须显式 parse 才进业务系统。
import { z } from 'zod'
import type { IntentResult } from './intent.types'

const WeatherIntentSchema = z.object({
    intent: z.literal('weather'),
    city: z.string().min(1),
    date: z.string().min(1)
})

const CalculatorIntentSchema = z.object({
    intent: z.literal('calculator'),
    expression: z.string().min(1)
})

const ChatIntentSchema = z.object({
    intent: z.literal('chat'),
    message: z.string().min(1)
})

export const IntentResultSchema = z.discriminatedUnion('intent', [
  WeatherIntentSchema,
  CalculatorIntentSchema,
    ChatIntentSchema
])

export function validateIntent(raw: unknown): IntentResult {
    return IntentResultSchema.parse(raw) as IntentResult
}
```

任何不符合 Schema 的输出都会在 `parse` 处抛错，而不是漏进业务系统。

## 第一次让 LLM 参与程序决策

现在把校验后的 Intent 接进程序行为——这是全篇最有「Agent 味道」的一步。`AgentService` 增加 `handle`：

> 摘自 `code/agent-basics/src/agent/agent.service.ts`

```ts
  // 第一次让 LLM 参与程序决策：解析意图 → 校验 → switch 分发。
  async handle(message: string) {
    const intent = validateIntent(await this.llmService.parseIntent(message))

    switch (intent.intent) {
      case 'weather':
        return { action: 'getWeather', city: intent.city, date: intent.date }
      case 'calculator':
        return { action: 'calculate', expression: intent.expression }
      case 'chat':
        return { action: 'chat', message: intent.message }
    }
  }
```

用户说「帮我看看西安今天热不热」，执行过程变成：

```
User → 自然语言 → LLM → { intent: "weather", city: "西安" } → AgentService → getWeather
```

对比以前的手写规则：

```
以前：if (message.includes('天气')) { return getWeather() }
现在：用户自然语言 → LLM 理解意图 → Structured Output → 程序行为
```

LLM 第一次变成了**程序中的智能决策组件**。

## 现在仍然不是 Agent：switch 的扩展性天花板

当前结构是 `User → LLM → Intent → switch → Tool`。问题一眼可见：以后工具从 weather、calculator 增加到 search、email、calendar、database……难道一直 `case 'weather': case 'calculator': ...` 写下去？

更合理的方式是直接告诉模型「你现在拥有哪些工具」，让它自己决定调用谁——这个能力就是 **Tool Calling**。下一章的链路会从 `Intent + switch` 升级为：

```
User → LLM → 不需要工具 → Answer
     └→ 需要工具 → Tool Call → getWeather → Tool Result → LLM → Final Answer
```

那时才会第一次出现 `LLM → Action → Observation → LLM`。

## 配套代码

本篇正文的所有代码片段来自同一个 NestJS 工程，拼起来即可运行（依赖 DeepSeek API Key，配置见工程 `.env.example`）：

| 文件 | 职责 | 对应小节 |
| ---- | ---- | ---- |
| `code/agent-basics/src/main.ts` | `import 'dotenv/config'` 加载 `.env` + 启动自检 | 坑：`.env` 不会自动进 `process.env` |
| `code/agent-basics/src/app.module.ts` | imports [ConfigModule.forRoot(), AgentModule] | .env 加载 / 组装 AgentModule 与第一个接口 |
| `code/agent-basics/src/llm/llm.module.ts` | providers + exports LlmService | 第一步架构决策 |
| `code/agent-basics/src/llm/llm.service.ts` | OpenAI SDK 接 DeepSeek；chat() / parseIntent()；Key 变量回退 + 缺 Key 中文报错 | 实现 LlmService / Structured Output |
| `code/agent-basics/src/llm/intent.types.ts` | 三种意图的 TypeScript 类型 | 定义 TypeScript 类型 |
| `code/agent-basics/src/llm/intent.schema.ts` | Zod discriminatedUnion 运行时校验 | 用 Zod 收口 |
| `code/agent-basics/src/agent/agent.module.ts` | imports [LlmModule] | 组装 AgentModule 与第一个接口 |
| `code/agent-basics/src/agent/agent.service.ts` | 注入 LlmService；handle() 决策 | 第一次让 LLM 参与程序决策 |
| `code/agent-basics/src/agent/agent.controller.ts` | POST /agent/chat、/agent/intent | 组装 AgentModule 与第一个接口 |

运行方式见 `code/agent-basics/README.md`：`npm install` → 配置 `.env` → `npm start` → curl 测 `/agent/chat` 与 `/agent/intent`。注意 `npm start` 跑的是 `tsc` 产物（`dist/`），不是 `tsx src/main.ts`——原因见上文「用 `tsx` 直接跑，依赖注入会静默失效」。
