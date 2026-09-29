# MCP：从零实现一个天气查询服务

## MCP 解决的是"工具怎么被统一发现与调用"：它站在 Tool Calling 上一层

前面几篇从普通工具调用开始，逐步接触了 Agent 循环、记忆、RAG，以及 LangChain 和 LangGraph。新的问题随之出现：如果写好了一个天气工具，想让自己的 Agent、其他支持 MCP 的应用都能使用，应该怎么把它提供出去？

MCP（Model Context Protocol，模型上下文协议）就是为"应用与外部工具、数据之间的交互"提供统一约定。它**不替你写业务逻辑**——天气查询怎么请求、怎么解析仍由我们实现；它只负责让调用方以统一方式"发现能力、调用能力、交换上下文"。对前端开发者而言，可以把它理解为：给已有的天气函数加一层标准化调用接口，这层接口除了执行函数，还提供工具名称、用途和参数结构，便于应用把它接入模型的工具调用流程。

```
手写工具：    函数就在同一程序里，直接 await getWeather('西安')
MCP 工具：    函数跑在独立 Server，调用方先"发现"再"调用"，协议统一
```

> 结论先行：Tool Calling 解决"模型怎么表达要用的工具和参数"；MCP 解决"应用怎么发现、调用外部能力并交换上下文"——后者站在前者上一层。

## 三个角色：Host / Client / Server 决定调用关系

弄清 Host、Client、Server，调用关系就清楚了：Host 承载对话和模型调用并决定如何使用工具结果；Client 连接服务、发现并调用工具；Server 提供 `get_weather` 这类能力。以后接入 Agent 时，Host 可以是我们编写的 NestJS 应用，MCP Client 是其中的一个组件，天气 Server 则作为独立程序运行。模型只负责"调用哪个工具、传入什么参数"，真正发送调用、接收结果并把结果放回对话的，是应用程序。

| 角色 | 中文含义 | 天气示例中负责什么 |
| ---- | ---- | ---- |
| Host | 宿主应用 | 承载对话和模型调用，决定如何使用工具结果 |
| Client | 客户端组件 | 连接天气服务，发现并调用工具 |
| Server | 服务端程序 | 提供 `get_weather`，请求天气接口并返回结果 |

## MCP 提供三类能力：Tools / Resources / Prompts

MCP 服务可以提供三类常用能力，本文实际只实现 Tools，另外两类是帮助理解的设计示例（下面的服务没有注册它们）：Tools 是可执行的操作（调用 `get_weather` 查某个城市）；Resources 是应用可以读取的上下文数据（读取 `weather://supported-cities` 了解支持哪些城市）；Prompts 是可获取并复用的提示词模板（获取"根据天气给出出行建议"的模板）。资源需要由应用读取并按需加入上下文，提示词模板也不会自动调用模型——应用负责组织这些步骤。

| 能力 | 含义 | 天气场景中的例子 |
| ---- | ---- | ---- |
| Tools | 可执行的操作 | 调用 `get_weather` 查询某个城市 |
| Resources | 应用可读取的上下文数据 | 读取 `weather://supported-cities` |
| Prompts | 可复用的消息模板 | 获取"根据天气给出出行建议"的模板 |

## 两种传输：stdio 与 Streamable HTTP

MCP 把"消息约定"和"传输方式"分开。消息采用 JSON-RPC 2.0（即使两个程序在同一台机器，也可以用这种调用约定）。常用传输方式有两种：stdio 让客户端启动子进程、通过输入输出流交换消息，适合本地工具和学习调试；Streamable HTTP 支持流式交互，适合远程部署、供多个应用访问。本文使用 stdio，不需要 Express，也不需要监听 HTTP 端口；天气 Server 自己通过 HTTP 请求 Open-Meteo，与 Client/Server 之间使用 stdio 并不冲突。

| 方式 | 如何通信 | 适用场景 |
| ---- | ---- | ---- |
| stdio | 客户端启动子进程，通过输入输出流交换消息 | 本地工具和学习调试 |
| Streamable HTTP | 客户端访问 HTTP 服务端点 | 远程部署，供多个应用访问 |

## 写 Server：把天气函数封装成 MCP 工具

为了把重点放在 MCP 上，示例先支持北京、上海、西安三个城市，直接内置经纬度；天气数据来自无需 Key 的 Open-Meteo。整段 `server.ts` 可以分成三层：业务函数 `getWeather(city)` 请求天气接口并校验整理数据；`server.registerTool(...)` 注册工具名称、说明、参数和执行函数；`StdioServerTransport` 通过标准输入输出与客户端通信。业务函数仍然是普通函数，以后换天气提供方主要改 `getWeather()`，对外仍可保持 `get_weather` 这个工具接口。`inputSchema` 用 `z.enum()` 限定城市，SDK 据此生成机器可读的 JSON Schema 并在执行前校验参数——参数校验只保证输入满足规则，不等于身份认证或权限检查。

> 摘自 `code/agent-lab/mcp/server.ts`（运行：`npm run mcp-server`；需先 `npm install` 安装 `@modelcontextprotocol/server`）

```ts
/**
 * 天气 MCP Server（stdio 传输）
 * 文章正文「从零实现一个天气查询服务」的配套代码。
 * 运行前需安装 SDK：npm install（已加入 @modelcontextprotocol/server / client）。
 *   npm run mcp-server   # 启动服务（stdio，需配合 Inspector 或 Client 调用）
 * 真实天气查询需要可访问 Open-Meteo 的网络；工具发现 / 参数校验无需网络。
 */
import { McpServer } from '@modelcontextprotocol/server'
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio'
import { z } from 'zod'

const cities = {
  北京: { latitude: 39.9042, longitude: 116.4074 },
  上海: { latitude: 31.2304, longitude: 121.4737 },
  西安: { latitude: 34.3416, longitude: 108.9398 },
}

const weatherNames: Record<number, string> = {
  0: '晴', 1: '大部晴朗', 2: '局部多云', 3: '阴',
  45: '雾', 48: '雾凇',
  51: '小毛毛雨', 53: '中等毛毛雨', 55: '强毛毛雨',
  56: '轻微冻毛毛雨', 57: '强冻毛毛雨',
  61: '小雨', 63: '中雨', 65: '大雨', 66: '轻微冻雨', 67: '强冻雨',
  71: '小雪', 73: '中雪', 75: '大雪', 77: '米雪',
  80: '小阵雨', 81: '中等阵雨', 82: '强阵雨',
  85: '小阵雪', 86: '强阵雪',
  95: '雷暴', 96: '雷暴伴小冰雹', 97: '强雷暴', 99: '雷暴伴大冰雹',
}

async function getWeather(city: keyof typeof cities) {
  const location = cities[city]
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.search = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
    temperature_unit: 'celsius',
    wind_speed_unit: 'ms',
    timezone: 'Asia/Shanghai',
  }).toString()

  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!response.ok) throw new Error(`天气接口返回 HTTP ${response.status}`)

  const data = z.object({
    current: z.object({
      time: z.string(),
      temperature_2m: z.number(),
      relative_humidity_2m: z.number(),
      weather_code: z.number(),
      wind_speed_10m: z.number(),
    }),
  }).parse(await response.json())

  const current = data.current
  return {
    city,
    time: current.time,
    timezone: 'Asia/Shanghai',
    weather: weatherNames[current.weather_code] ?? `未知天气代码 ${current.weather_code}`,
    temperature: `${current.temperature_2m} °C`,
    humidity: `${current.relative_humidity_2m}%`,
    windSpeed: `${current.wind_speed_10m} m/s`,
    source: 'Open-Meteo',
  }
}

const server = new McpServer({ name: 'weather-server', version: '1.0.0' })
server.registerTool(
  'get_weather',
  {
    description: '查询北京、上海或西安的当前天气、温度、湿度和风速。数据来自 Open-Meteo 天气模型。',
    inputSchema: z.object({ city: z.enum(['北京', '上海', '西安']).describe('要查询的城市') }),
  },
  async ({ city }) => {
    try {
      const weather = await getWeather(city)
      return { content: [{ type: 'text', text: JSON.stringify(weather, null, 2) }] }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('天气查询失败：', message)
      return { isError: true, content: [{ type: 'text', text: `天气查询失败：${message}` }] }
    }
  },
)

async function main() {
  await server.connect(new StdioServerTransport())
  console.error('Weather MCP Server 已启动')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

代码里还有三个容易忽略的细节：第一，`AbortSignal.timeout(10_000)` 给天气请求设了 10 秒超时，避免工具无限等待；第二，接口请求失败会返回 `isError: true`，客户端可据此区分天气数据与工具执行失败；第三，stdio 服务端的普通日志写到 `console.error()`——`console.log()` 会写入标准输出，而标准输出已承载协议消息，混入普通日志可能破坏通信。

## 用 Inspector 验证：Tool Discovery 与 Tool Call

先用官方调试工具 MCP Inspector 手动调用服务，验证工具发现与调用，这两种方式都可以在没有模型密钥的情况下验证工具。先编译生成 `dist/server.js`，再让 Inspector 启动 Server 并查询工具列表，这一步叫 **Tool Discovery（工具发现）**，结果应包含 `get_weather` 及其说明和参数结构；接着查询西安天气，客户端会启动 Server 子进程并通过 stdio 发送请求，返回 `content[0].text` 是一段 JSON 文本。`"`、`\n` 属于字符串转义：我们把 JSON 文本放进了 MCP 的文本内容块，它与独立的结构化结果字段是两个概念。

```
pnpm run build
pnpm dlx @modelcontextprotocol/inspector@2.8.0 --cli node dist/server.js --method tools/list
pnpm dlx @modelcontextprotocol/inspector@2.8.0 --cli node dist/server.js --method tools/call --tool-name get_weather --tool-arg city=西安
```

想用浏览器界面，执行 `pnpm dlx @modelcontextprotocol/inspector@2.8.0 node dist/server.js`，打开终端给出的地址，连接服务后在工具页选择 `get_weather` 并填写城市即可。

## 写自己的 Client：看清协议调用过程

Inspector 帮我们完成了连接、发现工具和发起调用，现在把这些操作写进程序，看清协议调用过程。`client.ts` 有四个关键操作：`client.connect(transport)` 启动 Server 子进程并建立 MCP 通信；`client.listTools()` 获取工具名称、用途和参数结构；`client.callTool(...)` 调用指定工具并等待结果；`finally` 中的 `client.close()` 关闭连接并清理子进程。这里 `process.execPath` 获取当前 Node 可执行文件路径，服务端文件路径根据当前客户端模块位置计算，运行时不会依赖终端恰好位于哪个目录；调用中途出错时仍需要释放连接和子进程。客户端示例的 `console.log()` 可以使用，因为它通过子进程的管道与 Server 通信，需要避免写普通日志的是 Server 的协议输出流。

> 摘自 `code/agent-lab/mcp/client.ts`（运行：`npm run mcp-client`；需先 `npm install` 安装 `@modelcontextprotocol/client`）

```ts
/**
 * 天气 MCP Client（stdio 传输）
 * 文章正文「再写一个自己的 Client」的配套代码。
 *   npm run mcp-client   # 启动 Client：连接 Server → 列出工具 → 调用 get_weather(西安)
 * 注意：stdio 服务端的普通日志写到 console.error()，不要用 console.log() 输出普通日志，
 *       否则会混入协议消息流、破坏通信。
 */
import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import { fileURLToPath } from 'node:url'

async function main() {
  const client = new Client({ name: 'weather-client', version: '1.0.0' })
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL('./server.js', import.meta.url))],
    stderr: 'inherit',
  })

  try {
    await client.connect(transport)
    const { tools } = await client.listTools()
    console.log('可用工具：', tools.map((tool) => tool.name))

    const result = await client.callTool({
      name: 'get_weather',
      arguments: { city: '西安' },
    })

    if (result.isError) {
      console.error('工具执行失败：')
      process.exitCode = 1
    }

    for (const block of result.content) {
      if (block.type === 'text') console.log(block.text)
    }
  } finally {
    await client.close()
  }
}

main().catch((error) => {
  console.error('客户端运行失败：', error)
  process.exitCode = 1
})
```

## 接到 Agent：MCP Client 放在调用工具的节点

当前客户端写死了"查询西安"。接入模型后，城市和调用时机可以由模型根据用户问题提出，再由应用检查并执行。假设用户问"西安现在天气怎么样，出门需要注意什么"，应用可以这样组织流程：① 通过 MCP Client 获取工具列表；② 将工具名称、说明、参数结构转换成所用模型 API 支持的工具定义；③ 把用户问题和工具定义交给模型；④ 模型提出调用 `get_weather`，参数是 `city: "西安"`；⑤ 应用校验并执行调用，通过 MCP Client 获取天气结果；⑥ 按模型 API 的要求，把结果作为对应的工具消息放回对话；⑦ 模型基于天气数据生成回答，如果还要调用其他工具，应用继续执行循环。

```
模型工具调用  →  决定"调什么、传什么"
MCP           →  决定"应用怎样发现、调用外部能力并交换上下文"
Agent Loop    →  决定"应用怎样反复组织模型调用、工具执行和终止判断"
```

LangGraph 可以组织这些执行步骤，MCP Client 可以放在调用工具的节点中；循环次数、超时、成本预算和人工审核仍由应用控制。这个天气 Server 自身没有调用模型，所以不需要模型密钥，以后在 Host 中接入 DeepSeek 时再配置相应的模型调用即可。

## 调试清单：先查这几处

调试时优先检查这几处：启动 Server 后一直没有结果，通常是 stdio 服务在等客户端请求，用 Inspector 或 Client 发起调用即可；提示找不到 `dist/server.js`，检查是否在修改源码后执行了 `pnpm run build`；参数校验失败，检查城市是否为"北京/上海/西安"之一；提示 `fetch failed` 或超时，检查当前网络能否访问天气接口（MCP 通信成功不代表外部 API 一定可达）；客户端提示消息解析失败，检查 Server 是否用 `console.log()` 输出了普通日志。

| 现象 | 优先检查 |
| ---- | ---- |
| 启动 Server 后一直没有结果 | stdio 服务正在等客户端请求，用 Inspector 或 Client 发起调用 |
| 提示找不到 `dist/server.js` | 是否在修改源码后执行了 `pnpm run build` |
| 参数校验失败 | 城市是否为"北京""上海""西安"之一 |
| 提示 `fetch failed` 或超时 | 当前网络能否访问天气接口；MCP 通信成功不代表外部 API 一定可达 |
| 客户端提示消息解析失败 | Server 是否使用了 `console.log()` 输出普通日志 |

## 一个判断：Server 不调用模型，密钥在 Host 配

MCP Server 只负责把"能力"标准化暴露出去，它自己不调用模型，因此不需要模型密钥；真正把 MCP 工具接入 Agent 的是 Host 应用，模型密钥（如 DeepSeek）在 Host 里配置。这样职责清晰：工具的实现与暴露归 Server，模型的决策与编排归 Host，二者通过 MCP 解耦。

## 配套代码

| 脚本 | npm script | 对应小节 |
| --- | --- | --- |
| `code/agent-lab/mcp/server.ts` | `npm run mcp-server` | 写 Server：把天气函数封装成 MCP 工具 |
| `code/agent-lab/mcp/client.ts` | `npm run mcp-client` | 写自己的 Client：看清协议调用过程 |

## 参考

- [Agent 模块总结](./总结.md)
- [Agent 模块面试题](./面试题.md)
- 上一篇见第 8 篇：LangGraph 有状态的流程编排；回到 [Agent 模块总结](./总结.md) 看全景
