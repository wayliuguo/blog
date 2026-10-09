# Tool Calling：让 LLM 直接选择并调用程序能力

## 为什么有了 Structured Output，还要 Tool Calling

上一篇的链路是：`User → LLM → Structured Output → Intent → switch → 执行业务逻辑`。只有两个能力时没什么问题，但 Agent 的能力清单会不断变长——weather、calculator、search、email、calendar、database……每加一个能力，就得多写一个 `case`，人工维护 Intent Router 的成本线性上涨，系统越来越复杂。

Tool Calling 换了一个思路：不再让模型描述「用户想干什么」，而是直接让模型决定「**下一步该调用哪个工具、传什么参数**」：

```
User → LLM → Tool Call → 程序执行对应 Tool → Tool Result → LLM → Final Answer
```

- LLM 说：「我要调 getWeather，参数是 city=西安」；
- 程序说：「好，我来真正执行」。

做到这里，Agent 才真正开始有点 Agent 的感觉。

## Tool Calling 到底是什么：LLM 并不会执行你的函数

先立一个最重要的认知：**LLM 并不会真正执行我们的 JavaScript 函数**。模型不会进入你的服务器运行 `getWeather('西安')`，它真正做的只是返回一段结构化描述，表达「我认为现在应该调用 getWeather，参数是 city=西安」：

> 示意片段

```json
{
  "tool_calls": [{
    "id": "call_xxx",
    "type": "function",
    "function": { "name": "getWeather", "arguments": "{\"city\":\"西安\"}" }
  }]
}
```

核心关系链贯穿全篇，后面的每一步都是在实现它：

```
LLM 负责决策 → Tool Call 描述行动 → 程序真正执行 → Tool Result 返回结果
```

## 准备两个最简单的 Tool

重点是理解机制，不是接真实天气 API。原文在 Day 1 的 NestJS 工程上新增一个 tools 模块（`nest g module tools` / `nest g service tools`；`ToolsModule` 必须 `exports: [ToolsService]`，Agent 模块才能注入），两个工具都实现为 `ToolsService` 的方法：

> 摘自 `code/tool-calling/src/tools/tools.service.ts`

```ts
@Injectable()
export class ToolsService {
    // 模拟数据：重点在理解 Tool Calling 机制，不在接真实天气 API。
    // 以后换成真实天气 API，对 Agent 侧完全透明。
    getWeather(city: string) {
        return { city, temperature: 32, weather: '晴' }
    }

    // 真实求值：new Function 等价于执行用户输入的任意 JS——存在代码执行风险，
    // 只允许本地 Demo 这样写，生产必须换安全的表达式解析方案。
    calculator(expression: string) {
        const result = new Function(`"use strict"; return (${expression})`)() as number
        return { expression, result }
    }
}
```

这里有一个视角转换：**Agent 不关心 `getWeather()` 内部是调第三方 API、查数据库还是读缓存，它只需要知道「存在一个叫 getWeather 的工具，能根据城市查天气」**。以后把模拟数据换成真实天气 API，对 Agent 侧完全透明。

注意 calculator 是真实求值——`new Function('"use strict"; return (...)')` 这种写法等于执行用户输入的任意 JS，**存在代码执行风险，只允许在本地 Demo 使用**，生产必须换安全的表达式解析方案。

## 模型怎么知道我们有哪些 Tool：Tool Schema

代码里写了 `getWeather()`，但 DeepSeek 根本不知道这个函数存在。必须通过请求的 `tools` 参数告诉模型「我这里有哪些工具」。

第一次看到 tools 代码容易误会「把函数传给了模型」——完全不是。传的只是 **Tool Schema**：Name / Description / Parameters 三件事。配套工程把 Schema 单独放在 `src/tools/tools.schema.ts`，与 `ToolsService` 的实现分开——Definition ≠ Implementation 直接落到文件组织上：

> 摘自 `code/tool-calling/src/tools/tools.schema.ts`

```ts
export const tools: ChatCompletionTool[] = [
    {
        type: 'function',
        function: {
            name: 'getWeather',
            description: '查询指定城市的天气',
            parameters: {
                type: 'object',
                properties: {
                    city: { type: 'string', description: '城市名称，例如西安、北京' }
                },
                required: ['city']
            }
        }
    },
```

> 摘自 `code/tool-calling/src/tools/tools.schema.ts`

```ts
    {
        type: 'function',
        function: {
            name: 'calculator',
            description: '计算数学表达式',
            parameters: {
                type: 'object',
                properties: {
                    expression: { type: 'string', description: '数学表达式，例如 123 * 456' }
                },
                required: ['expression']
            }
        }
    }
]
```

关键区分：**Tool Definition ≠ Tool Implementation**。

| | 给谁看 | 内容 |
| ---- | ---- | ---- |
| Tool Definition（Schema） | LLM | 工具名、描述、参数结构 |
| Tool Implementation | 程序 | 真正执行的 JS 函数 |

LLM 只看得到定义，永远看不到实现。注意措辞的变化：我们不是告诉模型「用户问天气时返回 weather」（上一篇 Prompt 的写法），而是「这里有一个真正可以查询天气的工具，你需要的时候可以调用它」——**这就是和 Structured Output 最大的区别**。

## 第一次让 LLM 自己选工具：tools + tool_choice: 'auto'

请求时把 Schema 数组传进去，并把「用不用工具」的决策权交给模型：

> 摘自 `code/tool-calling/src/llm/llm.service.ts`

```ts
    // Tool Calling 专用：没有 response_format，也没有「你必须返回 JSON」的 Prompt——
    // 用 tools + tool_choice: 'auto' 把「用不用工具」的决策权交给模型。
    async chatWithTools(messages: ChatCompletionMessageParam[], tools: ChatCompletionTool[]) {
        const response = await this.client.chat.completions.create({
            model: 'deepseek-chat',
            messages,
            tools,
            tool_choice: 'auto'
        })

        return response.choices[0].message
    }
```

`tool_choice: 'auto'` 意味着：用户说「你好」，模型可以直接回答；说「帮我查西安今天的天气」，模型会判断「需要外部数据，我该调用 getWeather」。**Agent 的「决策」能力从这里开始出现。**

## 建立 Tool Calling 测试接口

原文在 AgentController 上挂了一个独立的测试接口，与上一篇的意图链路彻底分开：

> 摘自 `code/tool-calling/src/agent/agent.controller.ts`

```ts
    // Tool Calling 测试接口：与上一篇 Structured Output 的 /agent/intent 链路彻底分开
    @Post('tools-test')
    async testToolCalling(@Body('message') message: string) {
        if (!message) {
            throw new BadRequestException('message 不能为空')
        }

        return { message: await this.agentService.testToolCalling(message) }
    }
```

调用方式：`POST /agent/tools-test`，body 传 `{ "message": "..." }`。

## 坑一：Structured Output 和 Tool Calling 必须彻底分开

实际测试时第一个坑就来了：接口返回的还是 `{"intent":"weather",...}`。原因很简单——**程序还在走上一篇 Structured Output 的链路**：

```
上一篇：POST /agent            → parseIntent()      → Structured Output
这一篇：POST /agent/tools-test → testToolCalling() → chatWithTools() → DeepSeek + Tools
```

所以 `chatWithTools()` 里必须去掉 `response_format: { type: 'json_object' }`，也不能沿用「你是一个意图分析器，请返回 JSON」的 Prompt——否则实际上还是在做 Intent Parsing，而不是 Tool Calling。两条机制链要背下来：

```
Structured Output：User → LLM → response_format → JSON → Intent
Tool Calling：     User → LLM → tools → tool_calls → Function
```

> 做 Agent 不能只看「接口有没有返回结果」，必须知道结果经过哪条链路产生。

## 坑二：Unexpected token '我'——content 不能 JSON.parse

修完链路，又报错了：

```
Unexpected token '我', "我来帮您查询西安今天的天气。" is not valid JSON
```

看到 `Unexpected token '我'` 基本可以断定：**程序正在对普通中文文本执行 `JSON.parse()`**。根因是上一篇残留的代码——上一篇可以这样做，是因为它明确要求模型必须返回 JSON；而 Tool Calling 下模型可能返回自然语言、也可能返回 tool_calls，不能再无脑 parse `content`。

那到底什么时候需要 JSON.parse？两个字段分清楚：

| 字段 | 内容形态 | 怎么处理 |
| ---- | ---- | ---- |
| `assistantMessage.content` | 自然语言文本 | 直接用，**不要 parse** |
| `toolCall.function.arguments` | JSON 字符串（`"{\"city\":\"西安\"}"`） | **必须 `JSON.parse`** |

## 模型不一定每次都调用工具

用户说「你好，很高兴认识你」，模型返回的 message 里可能根本没有 `tool_calls`——这是完全正常的，不是所有问题都需要工具。所以代码不能假设「每次都存在 tool_calls」：

> 摘自 `code/tool-calling/src/agent/agent.service.ts`

```ts
        // 第一次调用：模型决定「调什么、传什么」
        const assistantMessage = await this.llmService.chatWithTools(messages, tools)

        // 模型不一定每次都调工具：没有 tool_calls 就直接返回文本（判空分支）
        const toolCalls = assistantMessage.tool_calls
        if (!toolCalls?.length) {
            return assistantMessage.content ?? ''
        }
```

逻辑分成两条分支：

```
LLM → 不需要 Tool → 直接返回 content
LLM → 需要 Tool   → 返回 tool_calls → 程序执行 Tool
```

> Agent 的重要特点：不是程序提前规定每句话走哪个分支，而是模型根据当前任务选择是否使用工具。

## 解析 Tool Call：Type Narrowing

拿到 `tool_calls[0]` 之后要读 `toolCall.function.name`，但新版 OpenAI SDK 里 `ChatCompletionMessageToolCall` 是联合类型——只有 `function` 型的调用才有 `function` 属性，直接访问会报：

```
Property 'function' does not exist on type 'ChatCompletionMessageToolCall'.
```

先判断类型再访问，TypeScript 就能收窄（Type Narrowing）到安全的形态：

> 摘自 `code/tool-calling/src/agent/agent.service.ts`

```ts
        const toolCall = toolCalls[0]
        // 新版 SDK 的 tool_calls 是联合类型：只有 function 型才有 function 字段 → Type Narrowing
        if (toolCall.type !== 'function') {
            throw new Error(`暂不支持的工具类型: ${toolCall.type}`)
        }

        // function.arguments 是 JSON 字符串，真正需要 JSON.parse 的地方在这里
        const args = JSON.parse(toolCall.function.arguments) as {
            city?: string
            expression?: string
        }
```

这里同时发生了两件事：类型收窄保证编译期安全；`JSON.parse(function.arguments)` 把 JSON 字符串转成真正的对象。**Discriminated Union + Type Narrowing** 是 Agent 开发会反复用到的 TypeScript 组合。

## 真正执行 Tool：switch 的角色已经变了

到了执行环节，`switch (toolCall.function.name)` 按名字分发，工具函数真正跑在 `ToolsService` 里：

> 摘自 `code/tool-calling/src/agent/agent.service.ts`

```ts
        // 模型已经做了决定，程序只负责按名字分发执行（Tool Dispatcher，不是 Intent Router）
        let result: unknown
        switch (toolCall.function.name) {
            case 'getWeather':
                result = this.toolsService.getWeather(args.city ?? '')
                break
            case 'calculator':
                result = this.toolsService.calculator(args.expression ?? '')
                break
            default:
                throw new Error(`未知工具: ${toolCall.function.name}`)
        }
```

读者一定会问：上一篇 `switch (intent)`，今天怎么还是 `switch (toolName)`？区别是本质性的：

| | 谁做决定 | 程序的角色 |
| ---- | ---- | ---- |
| `switch (intent)` | 程序根据意图决定调什么 | 决策者 |
| `switch (toolName)` | **模型已经决定**调什么 | 只是找到函数并执行 |

这个 switch 已经不是 Intent Router，而是 **Tool Dispatcher**。工具变多后可以升级为 `toolMap` 查表，再往后就是第 3 篇的 Tool Registry。

## Tool Result 回灌 Context：assistant 与 tool 两条消息

现在 `getWeather` 已经真正执行，拿到了 `{"city":"西安","temperature":32,"weather":"晴"}`。直接把这个 JSON 扔回给用户，功能可用，但不像 AI 助手——用户想看到的是「西安今天晴，32℃，天气比较热，外出注意防晒补水」。所以还有最后一步：**把 Tool Result 重新放回 Context，再次调用 LLM**。

回灌分两步。第一步，模型返回的 `assistant(tool_calls)` 消息本身也是 Context 的一部分，必须先放回去——下一次请求时，模型需要知道「刚才是我自己决定调用 getWeather 的」：

> 摘自 `code/tool-calling/src/agent/agent.service.ts`

```ts
        // 关键时序：assistant(tool_calls) 这条消息本身也是 Context 的一部分，
        // 必须在 tool 结果之前放回去——模型需要知道「刚才是我自己决定调用的」
        messages.push({ role: 'assistant', content: assistantMessage.content ?? '', tool_calls: toolCalls })
```

第二步，把执行结果以 `role: 'tool'` 放进去：

> 摘自 `code/tool-calling/src/agent/agent.service.ts`

```ts
        // tool 结果消息三要素：role: 'tool' + tool_call_id（与 call 的 id 配对）+ JSON 字符串内容
        messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result)
        })
```

Context 至此演变为四段：

```
system → user → assistant(tool_call) → tool(result)
```

`tool_call_id` 是干什么的？**模型一次不一定只调用一个工具**——可能同时产生 `call_001 → getWeather` 和 `call_002 → calculator`。程序执行完必须靠 ID 建立对应关系，模型才能知道「这个结果是刚才哪次调用的」。Tool Result 消息的三要素：`role: 'tool'` + `tool_call_id` + `content`（JSON 字符串）。

## 第二次调用 LLM：闭环完成

带着完整 Context 再次请求，模型此刻知道三件事：用户问什么、我刚决定调什么、工具返回了什么——于是生成最终的自然语言回答：

> 摘自 `code/tool-calling/src/agent/agent.service.ts`

```ts
        // 第二次调用：模型看到完整链路（问题 → 我的决策 → 工具结果）→ 生成最终回答
        const final = await this.llmService.chatWithTools(messages, tools)
        return final.content ?? ''
```

实跑读数（`npm start` 后执行 `curl -X POST http://localhost:3000/agent/tools-test -H "Content-Type: application/json" -d '{ "message": "帮我看看西安今天热不热" }'`，真实 DeepSeek 输出，2026-10-08 实测）：

```
HTTP 201
{"message":"西安今天**挺热的** ☀️\n\n- 天气：晴\n- 气温：**32℃**\n\n晴天加上 32℃ 的高温，体感会比较晒、比较闷热。出门的话建议：\n\n- 做好防晒（帽子、墨镜、防晒霜）\n- 多喝水，尽量避开中午 12 点到下午 3 点的高温时段\n- 穿轻薄透气的衣服\n\n需要我再帮你查一下未来几天的天气，或者看看其他城市的情况吗？"}
```

注意与第一次调用的差别：这次模型返回的是 `content`，而不是 `tool_calls`。

## 十步链路：Tool Calling 的全部机制

写了不少代码，但真正需要记住的就是这一条链：

```
① 用户发送自然语言
② LLM 理解用户目标
③ LLM 判断是否需要 Tool
④ 如需要，生成 tool_calls（含 JSON 字符串形式的 arguments）
⑤ 程序读取 Tool Name 和 Arguments（JSON.parse）
⑥ 程序真正执行 Tool
⑦ 得到 Tool Result
⑧ 把 assistant(tool_calls) 与 tool(result) 放回 messages
⑨ 再次调用 LLM
⑩ 返回 Final Answer
```

概念压缩成一句话：**Tool Calling 本质上是 LLM 为调用程序能力生成的一种结构化协议**。三个角色一定不能混：

```
LLM = 决策      Tool = 行动能力      程序 = 执行环境
```

LLM 不是真的在执行 `getWeather()`，它只是在说「我认为下一步应该执行 getWeather」；真正拥有系统权限、数据库权限、网络请求能力的，**始终是我们的应用程序**。

## 与 Structured Output 的最终对照

| | 第 1 篇：Structured Output | 第 2 篇：Tool Calling |
| ---- | ---- | ---- |
| 请求参数 | `response_format: json_object` | `tools` + `tool_choice` |
| 模型返回 | JSON Intent | `tool_calls` |
| 谁决定调什么 | 程序（switch intent） | 模型（tool_calls） |
| 模型的表达 | 「用户的意图是 weather」 | 「我要调用 getWeather，参数是西安」 |

最大变化：**模型开始直接选择程序能力，而不仅仅是描述用户意图**。这一步对理解 Agent 非常关键。

## 但这仍然不是完整 Agent：单轮撑不起依赖链

今天只处理了**一轮** Tool Calling。真实复杂任务往往不止一次——用户说「帮我看看西安明天的天气，如果下雨，再帮我找一个适合带孩子去的室内活动」，真实执行过程是：

```
LLM → getWeather() → LLM（判断是否下雨）→ searchActivity() → LLM → Final Answer
```

不能假设调一次 Tool 任务就结束；Agent 必须根据 Tool Result 再次决策「任务完成了吗？下一步还需要调用什么？」——这就需要循环：

> 示意片段（无配套脚本）

```ts
let steps = 0
while (steps++ < MAX_STEPS) {
  const response = await callLLM(messages)
  if (!response.tool_calls?.length) {
    return response.content          // 模型认为任务完成
  }
  const results = await executeTools(response.tool_calls)
  messages.push(...results)
}
```

当程序具备这种「决策 → 行动 → 观察 → 再决策」的循环能力时，才算拥有 Agent Runtime。下一章就亲手把它写出来。

## 配套代码

本篇正文的所有代码片段来自同一个 NestJS 工程（沿用第 1 篇的 agent / llm 分层，按原文新增 tools 模块；依赖 DeepSeek API Key，配置见工程 `.env.example`）：

| 文件 | 职责 | 对应小节 |
| ---- | ---- | ---- |
| `code/tool-calling/src/main.ts` | `import 'dotenv/config'` 加载 `.env` + 启动自检 | 工程骨架 |
| `code/tool-calling/src/app.module.ts` | imports [ConfigModule.forRoot(), AgentModule] | 工程骨架 |
| `code/tool-calling/src/llm/llm.module.ts` | providers + exports LlmService | 第一次让 LLM 自己选工具 |
| `code/tool-calling/src/llm/llm.service.ts` | OpenAI SDK 接 DeepSeek；chatWithTools()：tools + tool_choice 'auto'，无 response_format | 第一次让 LLM 自己选工具 / 坑一 |
| `code/tool-calling/src/tools/tools.schema.ts` | 两个 Tool 的 Schema（Definition，给模型看） | 模型怎么知道我们有哪些 Tool |
| `code/tool-calling/src/tools/tools.service.ts` | getWeather 模拟数据 / calculator 真实求值（Implementation，程序执行） | 准备两个最简单的 Tool |
| `code/tool-calling/src/tools/tools.module.ts` | providers + exports ToolsService | 准备两个最简单的 Tool |
| `code/tool-calling/src/agent/agent.module.ts` | imports [LlmModule, ToolsModule] | 工程骨架 |
| `code/tool-calling/src/agent/agent.service.ts` | testToolCalling()：判空 → Type Narrowing → switch 分发 → 回灌 → 二次调用 | 解析 Tool Call / 真正执行 Tool / 回灌 Context / 第二次调用 |
| `code/tool-calling/src/agent/agent.controller.ts` | POST /agent/tools-test | 建立 Tool Calling 测试接口 / 坑一 |

运行方式见 `code/tool-calling/README.md`：`npm install` → 配置 `.env` → `npm start` → curl 测 `/agent/tools-test`。注意 `npm start` 跑的是 `tsc` 产物（`dist/`），不是 `tsx src/main.ts`——原因同第 1 篇「用 `tsx` 直接跑，依赖注入会静默失效」。
