# LangChain：用框架重写一遍 Agent

## 为什么之前不直接学 LangChain：六个答不上来的问题

直接上框架的「一步到位版」确实很短：

> 示意片段

```ts
const model = new ChatOpenAI({ ... })
const modelWithTools = model.bindTools(tools)
await modelWithTools.invoke(messages)
```

代码能跑，但当时有 6 个问题一个都答不上来：`bindTools` 到底干了什么？Tool 是谁执行的？Tool Result 怎么回给 LLM？为什么还要 ToolMessage？为什么需要 Agent Loop？RAG 和 Tool 什么关系？

前面几篇已经把这些问题全部亲手实现过一遍：LLM → Structured Output → Tool Calling → Tool → ToolRegistry → Agent Loop → Context Trimming → Summary → Memory → Embedding → pgvector → RAG。现在可以给三个 API「祛魅」：

| API | 祛魅后 |
| ---- | ---- |
| `tool()` | 工具名 + 描述 + 参数 Schema + 执行函数的统一封装 |
| `bindTools()` | 把工具能力描述提供给 LLM，**由 LLM 决定是否调用**（不自动执行） |
| `ToolMessage` | 完成 Tool Call → 程序执行 → Result 放回 messages → LLM 继续决策 |

> 直接学框架 = 知其然不知其所以然。不是 LangChain 让我少写了多少代码，而是理解底层之后，它从「黑盒框架」变成了一组可以自由选择的工程抽象。

## 映射表：LangChain 到底封装了我们哪些东西

一张表回答标题问题：

| 之前手写 | LangChain |
| ---- | ---- |
| OpenAI / DeepSeek SDK 调用 | ChatModel |
| 自己维护 messages 类型 | BaseMessage |
| system / user / assistant | SystemMessage / HumanMessage / AIMessage |
| 自己定义 AgentTool | `tool()` |
| Zod 参数校验 | Tool Schema |
| 手动传 tools 给模型 | `bindTools()` |
| 自己解析 tool_calls | `AIMessage.tool_calls` |
| 自己构造工具结果消息 | ToolMessage |
| 自己维护 Agent 循环 | Agent Loop / Agent abstraction |
| JSON 强约束输出 | `withStructuredOutput()` |
| 自己定义 EmbeddingProvider | Embeddings |
| 自己实现 VectorRetriever | VectorStore / Retriever |
| 自己定义知识文档 | Document |
| Prompt 字符串拼接 | ChatPromptTemplate |
| Pipeline 调用 | Runnable / LCEL |

结论：**LangChain 并没有创造另一套完全不同的 Agent，只是对手写的模型、消息、工具、Tool Calling、Agent Loop、Embedding、Retriever、RAG、Structured Output 做了统一抽象。**

## 场景：为什么 App 安全分析适合 Agent，而不是脚本

本篇用一个真实感强的场景串起所有概念：检查 Android App 里「外部 Scheme / Deep Link 输入的 URL，是否最终进入 `WebView.loadUrl()`」——一个最小版安全检测规则。

「搜索 APK 里有没有 loadUrl」普通脚本就够了，根本不需要 Agent。Agent 的价值在**动态多步决策链**：

```
看 Manifest → 发现 MainActivity（exported）→ 读取 → 发现 URL 传给 UrlRouter
→ 决定继续搜 UrlRouter → 读取 → 发现 WebView.loadUrl → 需要安全判断
→ 查企业知识库 → 综合 Evidence + Rule → 生成报告
```

每一步不是写死的，Agent 根据上一步 Observation 决定下一步——又回到了 Reason → Act → Observe，也就是手写的 Agent Loop。反过来说：**别用 Agent 做脚本能确定性完成的事。**

## 封装 LLM：chat.completions.create() → model.invoke()

以前手写时用 OpenAI SDK 的 `chat.completions.create()`；LangChain 统一成 `model.invoke(messages)`。配置不变，还是 DeepSeek + baseURL（示意）：

> 示意片段（无配套脚本）

```ts
this.model = new ChatOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  model: 'deepseek-chat',
  temperature: 0,                                   // 安全分析要可复现
  configuration: { baseURL: 'https://api.deepseek.com' },
})
```

`temperature: 0` 是场景要求：安全分析不想要创造性，要可复现。

## Message：裸对象升级成类，本质没变

手写时是 `{ role: 'system', content: '...' }` 裸对象；LangChain 抽象成统一的消息类（示意）：

> 示意片段（无配套脚本）

```ts
import { SystemMessage, HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages'
const messages = [
  new SystemMessage('你是 Android App 安全分析 Agent'),
  new HumanMessage('分析 demo.apk'),
]
```

system → SystemMessage；user → HumanMessage；assistant → AIMessage；tool result → ToolMessage；统一容器 → BaseMessage。**这些东西本质没变，LangChain 只是把消息协议抽象成了统一对象。**

## tool()：把 name / description / schema / execute 统一封装

手写 AgentTool 接口有四要素；LangChain 的 `tool()` 工厂函数做同样的事——生成可被模型识别的 Schema，并在调用前校验入参。配套脚本用零依赖方式镜像了这个机制：

> 摘自 `code/agent-lab/langchain/langchain-agent.ts`

```ts
// 镜像 LangChain 的 tool()：把「普通函数 + zod schema」包装成结构化工具。
// 真实 LangChain 的 tool() 也做同样的事——生成可被模型识别的 JSON Schema，
// 并在调用前用 schema 校验入参。
type Tool = {
  name: string
  description: string
  schema: z.ZodTypeAny
  invoke: (args: unknown) => Promise<string>
}

function tool(
  fn: (args: any) => Promise<string> | string,
  meta: { name: string; description: string; schema: z.ZodTypeAny },
): Tool {
  return {
    ...meta,
    async invoke(args) {
      const parsed = meta.schema.parse(args) // 对应 LangChain 在调用前用 schema 校验
      return String(await fn(parsed))
    },
  }
}
```

定义一个具体工具：

> 摘自 `code/agent-lab/langchain/langchain-agent.ts`

```ts
const getWeather = tool(
  async ({ city }: { city: string }) => {
    const fake: Record<string, string> = { 西安: '晴 22°C', 北京: '多云 18°C', 上海: '小雨 20°C' }
    return fake[city] ?? '未知城市'
  },
  {
    name: 'getWeather',
    description: '查询某个城市的当前天气',
    schema: z.object({ city: z.string().describe('城市名') }),
  },
)
```

两个要点：

- **Tool description 非常重要**——Agent 选工具不靠 `if (question.includes('manifest'))` 这种关键词匹配，LLM 看到的是 Name + Description + Schema，然后自己判断。**Description 本身也是 Agent Prompt 的一部分**，写糊了直接导致选错工具；
- 返回值统一 `JSON.stringify` 成字符串（ToolMessage content 要求字符串）。

## bindTools 不自动执行：全篇最大的误解

`bindTools()` 不是「自动执行 Tool」，而是「告诉模型：你现在有哪些工具可以调用」。模型返回的调用意愿放在 `response.tool_calls` 里；真正执行 `tool.invoke(...)` 的仍然是我们的程序（示意）：

> 示意片段（无配套脚本）

```ts
const modelWithTools = model.bindTools(tools)
// 模型只表达意愿：AIMessage.tool_calls = [{ name: 'analyze_android_manifest', args: {...} }]
// 执行权在程序：await targetTool.invoke(toolCall.args)
```

与手写 Tool Calling 的原理完全一样——**执行权、错误处理永远在程序侧**。

## ToolRegistry 继续保留

有了 `tool()` 还要 ToolRegistry 吗？要。两者职责不冲突：LangChain Tool 解决「一个 Tool 应该长什么样」，ToolRegistry 解决「系统有哪些 Tool、如何统一管理」。本场景的 Registry 收着五个工具：

```
ApkDecompileTool        APK → JADX 反编译
ManifestAnalysisTool    找外部入口（exported Activity / Scheme）
JadxSearchTool          在反编译源码中搜代码位置
ReadJadxSourceTool      读取真实代码证据
SecurityKnowledgeTool   查询企业安全规则（RAG）
```

> 不要因为用了框架就把注册中心扔掉。

## 踩坑：Tool 执行外部进程，别拼 shell 命令

源文的 App 安全分析场景里，Tool 要调用 `jadx` 这类外部程序。最容易踩的坑是拼 shell 命令：`exec("jadx " + apkPath)`——路径带空格或特殊字符就会被拆断，更糟的是给命令注入留了入口。正确姿势是参数数组化的 `execFile`，再配 `promisify` 与超时：

> 示意片段

```ts
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const { stdout } = await run('jadx', [apkPath], {
  timeout: 120_000, // 不设超时，卡死的子进程会一直挂着
})
```

`execFile` 不经 shell、参数按数组传递，天然避开注入；`timeout` 保证异常时进程能被回收。同时把可执行的 APK 路径限制在允许的 workspace 内——工具能执行什么，本质上是权限设计问题。

## Agent Loop 还是要自己写：未知工具与异常都必须回填

LangChain 没有把 Agent 的底层原理变掉。核心循环与手写版同构（示意），但有三个不能省的细节：

> 示意片段（无配套脚本）

```ts
const MAX_ITERATIONS = 10
for (let i = 0; i < MAX_ITERATIONS; i++) {
  const response = await modelWithTools.invoke(messages)
  messages.push(response)
  const toolCalls = response.tool_calls ?? []
  if (toolCalls.length === 0) {
    return { messages, response }           // 模型给出最终回答 → Loop 终止
  }
  for (const toolCall of toolCalls) {
    const targetTool = toolRegistry.get(toolCall.name)
    if (!targetTool) {
      // 未知工具也要回填 ToolMessage，否则消息序列不完整
      messages.push(new ToolMessage({ tool_call_id: toolCall.id!, content: `Unknown tool: ${toolCall.name}` }))
      continue
    }
    try {
      const result = await targetTool.invoke(toolCall.args)
      messages.push(new ToolMessage({
        tool_call_id: toolCall.id!,
        content: typeof result === 'string' ? result : JSON.stringify(result),
      }))
    } catch (error) {
      messages.push(new ToolMessage({
        tool_call_id: toolCall.id!,
        content: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
      }))
    }
  }
}
throw new Error('Agent exceeded max iterations')
```

1. **未知 tool 和执行异常都必须以 ToolMessage 形式回填** messages——消息序列完整性，模型下一轮才能看到失败原因；
2. **必须有 max iterations 兜底**（手写篇的 Stop Condition 原样适用）；
3. 消息类型从裸对象换成了 ToolMessage 类。

配套脚本镜像了完整消息闭环（human → ai(tool_calls) → tool），可运行观察：

> 摘自 `code/agent-lab/langchain/langchain-agent.ts`

```ts
async function runAgent(userText: string) {
  const messages: Msg[] = [{ type: 'human', content: userText }]
  const ai = mockModelDecide(userText)
  messages.push(ai)
  for (const call of ai.toolCalls) {
    const fn = byName[call.name]
    const result = await fn.invoke(call.args) // 对应 LangChain 的 tool.invoke()
    messages.push({ type: 'tool', content: result, toolCallId: call.id })
  }
  console.log('消息流：')
  for (const m of messages) {
    if (m.type === 'ai') console.log(`  AIMessage  tool_calls=${JSON.stringify(m.toolCalls)}`)
    else if (m.type === 'human') console.log(`  HumanMessage  ${m.content}`)
    else console.log(`  ToolMessage(${m.toolCallId})  ${m.content}`)
  }
}
```

> 原文刻意不用 `createReactAgent` 这类高层 API，就是为了让 Loop 保持在「看得见」的状态——即使未来用更高层的 Agent API，也要知道底层发生了什么。

## 跨文件追踪才是 Agent 的价值：最小 DataFlow

执行剧本走到关键处。普通脚本停在「找到了 `urlRouter.open(url)`」；Agent 会推理「url 被传给了 UrlRouter.open，我需要继续找它的实现」，于是再次搜索、读取，发现 `webView.loadUrl(url)`。四段链闭合：

```
getQueryParameter("url") → url → UrlRouter.open(url) → open(String url) → WebView.loadUrl(url)
                                    Source ──────────────────→ Sink
```

这就是最小版 DataFlow Analysis。另外两个认知纠偏：

- **入口 ≠ 漏洞**——发现 `exported=true + BROWSABLE + demo://open` 只能证明「外部可能进入 MainActivity」，不能证明存在 WebView 漏洞，必须追完整 Source → DataFlow → Validation → Sink；
- **不要自己写 DataFlowEngine**——SourceMatcher、SinkMatcher、AST、CFG 那是完整 SAST 静态分析器的活。学习项目的分工：Tool 提供真实代码，LLM 理解简单 DataFlow，Agent Loop 决定下一步去哪找，RAG 提供安全规则。

## RAG 作为 Tool：retriever.invoke 背后没有魔法

Evidence 已有，「这意味着什么」轮到 RAG。知识库示例规则 WEBVIEW-001：「当外部可控 URL 可以进入 WebView.loadUrl 时，应检查 URL scheme、host、redirect 等校验逻辑。仅发现 Deep Link 或 loadUrl 本身，不足以单独认定漏洞」。三方分工：

```
Tool  = App 里实际上有什么
RAG   = 这些现象按照企业规则意味着什么
LLM   = 结合 Evidence + Rule 进行分析
```

LangChain 把 RAG 组件也抽象了（示意）：

> 示意片段（无配套脚本）

```ts
const embeddings = new OpenAIEmbeddings()                 // 对应手写 EmbeddingProvider
const retriever = vectorStore.asRetriever({ k: 3 })
const documents = await retriever.invoke(query)           // 底层：Embedding → Vector → Similarity → TopK
```

`Document` 结构是 `{ pageContent, metadata }`——本质还是 content + metadata，与手写的 `{ id, title, content }` 没有区别。没手写过 Embedding + pgvector 的话，会以为 `retriever.invoke(query)` 做了什么神奇的事——其实没有。

注意 `search_security_knowledge` 和 `search_jadx_source` 在 Agent 看来都是 Tool，但背后能力完全不同——**RAG 由 Agent 动态决定何时调用，这就是「RAG 成为 Agent 的一种能力」**；写死在流程里就退化成了普通 RAG 应用。

## Prompt 是执行规则，不是人设

安全分析不能「看到 loadUrl → 直接判漏洞」。System Prompt 从「你是一个专业安全专家」升级为执行规则，十条规则里挑关键的：

```
① 仅发现 exported Activity，不能判断漏洞成立
④ 必须追踪 loadUrl 参数来源
⑤ 参数传入其他方法时，应继续查找该方法实现
⑥ 发现 isTrustedUrl / validateUrl 等校验时，必须查看其实现
⑧ 无法证明 Source 到 Sink，标记 DATA_FLOW_INCOMPLETE
⑨ search_security_knowledge 提供的是规则，不能代替 App 中的真实代码证据
⑩ 不得编造未读取到的代码
```

只写人设会导致误判与幻觉；「不得编造未读取到的代码」是反幻觉关键条款。

## Structured Output：withStructuredOutput 一行顶三步

自然语言结论（「这个 App 可能存在 WebView 风险……」）程序没法消费。手写三步：Prompt 要求返回 JSON → `JSON.parse` → try/catch 逐字段验证。LangChain 用 Schema 一步封装（示意）：

> 示意片段（无配套脚本）

```ts
const SecurityFindingSchema = z.object({
  title: z.string(),
  riskFound: z.boolean(),
  entryPoint: z.string(),
  source: z.string(),
  dataFlow: z.array(z.string()),
  validation: z.string(),
  sink: z.string(),
  securityRule: z.string(),
  remediation: z.string(),
})

const structuredModel = model.withStructuredOutput(SecurityFindingSchema)
const finding = await structuredModel.invoke(messages)   // 直接得到 SecurityFinding
```

`withStructuredOutput()` 包办了「Prompt 约束 + JSON 解析 + Schema 验证」。

## 最重要的坑：Structured Output 不要直接替换 Agent Loop

原文作者点名的唯一「我踩到了」的设计点。Agent 执行阶段需要 Tool Calling，如果把 Agent Loop 里的模型直接换成 `withStructuredOutput` 版，模型就失去了调用工具的能力。正确做法是**两阶段分离**：

```
第一阶段（调查）：Agent Loop → Tool Calling → Tool → Observation → 继续 Tool Calling → 完成调查
第二阶段（报告）：调查结果 → withStructuredOutput() → SecurityFinding
```

「先调查，再整理报告」——比一开始就强制模型输出 SecurityFinding 清晰得多。

## LangChain 没有替我们做什么

反向清单更重要。框架没有决定这 9 件事：

```
什么是漏洞？什么是 Source？什么是 Sink？什么时候应该继续追代码？
什么叫证据充分？什么企业规则适用于当前场景？
Tool 应该具备什么能力？什么时候应该使用 RAG？最终报告应该长什么样？
```

这些仍属于「Agent 应用开发」。**会使用 LangChain API，不等于会开发 Agent。**真正重要的是设计 LLM + Prompt + Tool + Agent Loop + RAG + Memory + 业务规则 + 结构化输出之间的关系。最后一条分工原则：

> 能确定性完成的事情交给 Tool，企业知识交给 RAG，需要动态决策、信息关联和综合分析的部分交给 LLM。这比「什么都让大模型做」可控得多。

## 配套代码

| 脚本 | npm script | 对应小节 |
| --- | --- | --- |
| `code/agent-lab/langchain/langchain-agent.ts` | `npm run langchain` | tool() 镜像、schema 校验、消息闭环（human → ai → tool） |

> 正文中的 `new ChatOpenAI` / `bindTools` / `withStructuredOutput` 为真实框架 API，需 API Key 环境，以示意片段呈现；脚本侧用零依赖镜像复刻同构机制。
