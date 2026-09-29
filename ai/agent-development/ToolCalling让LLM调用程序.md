# Tool Calling：让 LLM 直接选择并调用程序能力

## Tool Calling 不是"返回意图"，而是"模型选工具"

Structured Output 是让模型"描述用户想干什么"（返回 intent），程序再根据 intent 决定下一步；Tool Calling 是让模型"直接决定调用哪个工具、传什么参数"，程序直接执行。这一步让 Agent 第一次真正产生行动——模型负责"调用什么"，真正执行代码的仍然是应用程序。

```
Structured Output：User → LLM → { intent: "weather" } → 程序 if/else
Tool Calling：     User → LLM → tool_call(getWeather, 西安) → 程序执行 → 结果
```

## 把工具以 function schema 告诉模型

关键区别：不是告诉模型"用户问天气时返回 weather"，而是告诉它"这里有一个真正可调用工具 `getWeather(city)`"。工具以 OpenAI 兼容的 `function` schema 描述：`name / description / parameters(JSON Schema)`。`description` 是 Agent Prompt 的一部分，模型据此选工具，写得准不准直接决定调用质量。

> 摘自 `code/agent-lab/tool-calling/tools-schema.ts`（工具 schema 示例）

```ts
export const tools = [
  {
    type: 'function' as const,
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
  {
    type: 'function' as const,
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

## 解析 tool_calls 并分发执行

模型返回的不是纯文本，而是 `tool_calls: [{ name, arguments(JSON 字符串) }]`。程序取出 `toolCall.function.name` 与 `JSON.parse(arguments)`，分发到真实实现执行，再把结果放回 Context 让 LLM 继续。

> 示意片段（无配套脚本）

```ts
// 真正该解析的是 toolCall.function.arguments，不是 content
const toolCalls = assistantMessage.tool_calls
if (!toolCalls?.length) return { type: 'text', content: assistantMessage.content }

const toolCall = toolCalls[0]
const args = JSON.parse(toolCall.function.arguments)
return { type: 'tool_call', toolName: toolCall.function.name, args }
```

要点：
- 模型不一定每次都调用工具（无 `tool_calls` 时直接当答案返回）。
- 新版 SDK 的 Tool Call 类型需要做 Type Narrowing（`toolCall.type !== 'function'` 要报错）。
- `Tool Definition`（schema）和 `Tool Implementation`（execute）是完全不同的东西。

## 与 Structured Output 的本质区别

| 维度 | Structured Output（第 1 篇） | Tool Calling（本篇） |
| ---- | ---- | ---- |
| 输出 | `response_format` → JSON → intent | `tools` → `tool_calls` → Function |
| 模型做的事 | 描述用户意图 | 直接选择工具 + 生成参数 |
| 程序做的事 | 根据 intent 写 `if/else` | 直接执行模型选中的 Tool |

> 两者不要混用：用了 `tools` 就不要再带 `response_format: json_object` 做意图解析，否则本质上还是在做 Intent Parsing，而不是 Tool Calling。

## 常见坑

- 把 Structured Output 和 Tool Calling 写在一起，模型到底在"描述意图"还是"调用工具"会乱。
- `JSON.parse(content)` 把普通回答当 JSON 解析而报错——真正该解析的是 `toolCall.function.arguments`。
- 模型不一定每次都调用 Tool，必须有"无 tool_calls → 直接返回答案"的分支。
- 类型未做 Narrowing，导致 `tool_call.function` 访问不到 `arguments`。

## 一个判断：Tool Calling 仍不等于 Agent

单次 Tool Calling 只是"模型表达希望调用哪个工具"；真正执行 Tool、管理上下文、决定是否继续循环的是 **Agent Runtime**。再加上循环，才是下一篇要手写的 Agent Loop。

## 配套代码

| 脚本 | npm script | 对应小节 |
| --- | --- | --- |
| `code/agent-lab/tool-calling/tools-schema.ts` | （工具 schema 示例） | 把工具以 function schema 告诉模型 |

## 参考

- [Agent 模块总结](./总结.md)
- [Agent 模块面试题](./面试题.md)
- 上一篇见第 1 篇：Agent 是什么；下一篇见第 3 篇：Agent Loop
