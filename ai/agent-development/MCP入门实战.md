# MCP：从零实现天气查询服务

给 LLM 接工具，写 Function Calling 就够了；但工具一多、跨项目复用时，每个应用都要为每个工具写一遍接入代码——M 个应用 × N 个工具 = M×N 份胶水代码。MCP（Model Context Protocol，模型上下文协议）把这件事协议化：工具实现一次成 Server，任何支持 MCP 的应用都能即插即用，M×N 变成 M+N。本篇整体按源文章的推进顺序（开头的 M×N 困境与 USB-C 类比为本地补充的引入），从「为什么需要协议」讲到「亲手写出一对能真实查天气的 Server 与 Client」。

## 先看问题：没有协议时的 M×N 困境

- 应用 A（你的 Agent）要用天气工具：写一遍 Function Calling 的 schema + 调用 + 错误处理。
- 应用 B（同事的 IDE 插件）也要天气：再写一遍。
- 工具侧每多一个消费方，接入代码就多一份；工具本身改了参数，所有消费方跟着改。
- 这是典型的集成爆炸：**每新增一个应用或一个工具，工作量都是乘法**。

问题的根源：工具的定义（schema）、执行（HTTP 调用）、传输（怎么把结果送回模型）全部耦合在每个应用里。解法和数据库驱动、LSP 一样——**抽出一层协议**，把「工具是什么」和「工具怎么被调用」标准化。

## MCP 是什么：AI 应用的 USB-C

- MCP 是 Anthropic 2024 年开源的协议，定位是「AI 应用的 USB-C 接口」：任何 AI 应用（Host）通过统一协议连接任何工具提供方（Server）。
- 类比已成功的先例：LSP（Language Server Protocol）把「编辑器 × 语言」的 M×N 变成 M+N，MCP 把「AI 应用 × 工具」做同一件事。
- 协议本身基于 JSON-RPC 2.0，传输层可插拔——本地进程走 stdio，远程服务走 Streamable HTTP。

## 架构三角色：Host、Client、Server

| 角色 | 是谁 | 职责 |
| ---- | ---- | ---- |
| Host | AI 应用本体（Claude Desktop、IDE、你的 Agent） | 管理会话、决定何时调工具、把结果喂给 LLM |
| Client | Host 内部的连接器 | 与某个 Server 保持 1:1 连接，转发协议消息 |
| Server | 工具提供方进程 | 声明自己有哪些能力（工具/资源/提示），执行并返回结果 |

- 一个 Host 可以同时连多个 Server（文件系统 Server + 数据库 Server + 天气 Server），每个 Server 对应一个 Client。
- Server 不接触 LLM：它只回答「我有什么工具」和「工具执行结果是什么」，**「要不要调、怎么拼进 Context」是 Host 的事**。这条边界让 Server 可以做到极薄。

## Server 能提供什么：三类能力

- **Tools（工具）**：模型可主动调用的函数——本篇的 `get_weather` 属于这类，由模型决策触发。
- **Resources（资源）**：可读取的数据（文件、数据库行），由应用侧拉取，不由模型触发。
- **Prompts（提示模板）**：Server 预定义的提示词模板，供用户显式选择。
- 本篇只实现 Tools——它对应前几篇 Function Calling 的能力，也是最常见的接入形态。

## 传输方式：先选 stdio

- **stdio**：Server 作为 Host 的子进程启动，协议消息走标准输入输出。零网络配置、天然隔离，本地工具首选。
- **Streamable HTTP**：Server 独立部署，支持流式交互的 HTTP 传输，适合远程共享服务。
- 传输层与业务代码解耦：同一份工具实现，换一行传输即可从本地迁到远程。

## 动手：从零实现天气 MCP Server

先写业务函数：查 Open-Meteo 的实时天气。城市表硬编码三个（重点是协议形态，不是数据源），响应用 zod 校验——外部 API 的返回同样不可信。

> 摘自 `code/agent-lab/mcp/server.ts`
```ts
const cities = {
  北京: { latitude: 39.9042, longitude: 116.4074 },
  上海: { latitude: 31.2304, longitude: 121.4737 },
  西安: { latitude: 34.3416, longitude: 108.9398 },
}
```

> 摘自 `code/agent-lab/mcp/server.ts`
```ts
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
```

注意两点：`AbortSignal.timeout(10_000)` 给外部调用兜底超时——工具挂起会拖死整个 Agent Loop；返回值是**结构化对象**而不是一段拼接文案，怎么呈现留给 Host。

### 用 registerTool 把函数注册成 MCP 工具

- `McpServer` 是 SDK 提供的 Server 封装：`registerTool(name, config, handler)` 三步把普通函数变成协议工具。
- `description` 是给 LLM 看的——它决定模型能不能选对工具，写清「查什么城市、返回什么、数据来源」。
- `inputSchema` 用 zod 定义参数：SDK 会把它转成 JSON Schema 随工具列表下发，Host 侧的 LLM 照此生成参数，Server 侧自动完成校验。

> 摘自 `code/agent-lab/mcp/server.ts`
```ts
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
```

- 工具执行失败**不要抛异常了事**：返回 `isError: true` + 文本说明，让 LLM 把失败当观察（呼应 Agent Loop 篇的「错误即观察」）——模型看到失败原因还能重试或换参数。
- 返回里的 `weatherNames` 是「天气代码 → 中文描述」的映射表，定义在配套代码 `server.ts` 顶部，正文不再重复贴出。
- `z.enum(['北京', '上海', '西安'])` 把合法值收敛进 schema：模型传错城市会被校验层直接拦下，到不了业务函数。
- 校验只保证「输入满足规则」，**不等于身份认证或权限检查**——谁能调用这个工具，要在 Host / 业务层另行控制。

### 连上 stdio 传输

`connect(new StdioServerTransport())` 之后，Server 就挂在标准输入输出上等协议消息；进程保持存活，直到 Host 断开。

> 摘自 `code/agent-lab/mcp/server.ts`
```ts
async function main() {
  await server.connect(new StdioServerTransport())
  console.error('Weather MCP Server 已启动')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

**踩坑：stdio 通道上禁止 `console.log()`。** stdio 传输的协议消息和普通输出共用同一条管道——`console.log` 的内容会混进 JSON-RPC 消息流，直接破坏通信。普通日志一律走 `console.error`（stderr），这也是源文章反复强调的第一坑。

## 再写一个自己的 Client

Client 侧四步：构造 `Client` → `connect(transport)` 启动 Server 子进程并握手 → `listTools()` 发现工具 → `callTool()` 调用。这里让 Client 用 tsx 把 Server 作为子进程拉起（源码态直跑；编译后走 node 直启）。

> 摘自 `code/agent-lab/mcp/client.ts`
```ts
import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import { fileURLToPath } from 'node:url'

async function main() {
  const client = new Client({ name: 'weather-client', version: '1.0.0' })

  // tsx 直跑（源码态）启动 server.ts 需经 tsx；编译后（dist 态）直接 node server.js
  const isTs = import.meta.url.endsWith('.ts')
  const serverPath = fileURLToPath(
    new URL(isTs ? './server.ts' : './server.js', import.meta.url),
  )
  const tsxCli = fileURLToPath(
    new URL('../node_modules/tsx/dist/cli.mjs', import.meta.url),
  )
  const transport = isTs
    ? new StdioClientTransport({
        command: process.execPath,
        args: [tsxCli, serverPath],
        stderr: 'inherit',
      })
    : new StdioClientTransport({
        command: process.execPath,
        args: [serverPath],
        stderr: 'inherit',
      })
```

`stderr: 'inherit'` 让 Server 的普通日志透传到本进程终端——排障时能看到「Weather MCP Server 已启动」。

### 发现工具与调用

> 摘自 `code/agent-lab/mcp/client.ts`
```ts
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

实跑输出（`npm run mcp-client`）：

```txt
可用工具： [ 'get_weather' ]
{
  "city": "西安",
  "time": "2026-09-30T14:30",
  "timezone": "Asia/Shanghai",
  "weather": "多云",
  "temperature": "18.4 °C",
  "humidity": "62%",
  "windSpeed": "2.1 m/s",
  "source": "Open-Meteo"
}
```

天气数据是 Open-Meteo 的实时返回——这不是 mock：从 Client 发起 JSON-RPC、Server 收到 `tools/call`、zod 校验参数、fetch 外部 API、结果按协议回传，全链路都是真的。

- `listTools()` 返回的工具描述（含 JSON Schema）就是将来塞给 LLM 的 Function 定义——**Host 侧不需要为天气工具写任何 schema**，协议已经带过来了。
- 这就是 M×N → M+N 的兑现：Server 写一次，Claude Desktop、Cursor、你自己的 Agent 都能直接 `listTools` + `callTool`。

## 用 Inspector 调试

不想写 Client 也能调试 Server——官方 Inspector 提供图形界面：

```bash
npx @modelcontextprotocol/inspector tsx mcp/server.ts
```

- 启动后浏览器打开本地页面，左侧填传输方式（stdio）与启动命令，Connect 后能看工具列表、手动填参调用、查看每条协议消息。
- 排查「工具没被列出」「参数校验失败」时，Inspector 的消息面板比日志直观得多。

不想开浏览器也可以走 CLI 模式，直接完成 Tool Discovery 与 Tool Call：

```bash
npx @modelcontextprotocol/inspector --cli tsx mcp/server.ts --method tools/list
npx @modelcontextprotocol/inspector --cli tsx mcp/server.ts --method tools/call --tool-name get_weather --tool-arg city=西安
```

`tools/list` 的返回就是 Tool Discovery 的产物：工具名、描述与 JSON Schema 参数——将来接入真 Agent 时，交给 LLM 的 Function 定义就是这份清单。

## Client 与 Agent Loop 的关系

- 本篇的 Client 是「人肉 Host」：什么时候调、调什么参数，由我们硬编码。
- 真正的 Host 把这两步交给 LLM：`listTools()` 的结果转成 Function 定义放进请求，模型回 `tool_calls` 后由 Host 执行——**把 `callTool` 换成「模型选的工具 + Client 调用」，就是前面手写的 Agent Loop**。
- 换句话说：MCP 没有替代 Function Calling，它替换的是**工具的分发与接入层**。模型侧的决策循环一点没变。

## 什么时候自己写 Server

- 团队内部有稳定的业务能力（订单查询、内部 API 网关），多个 AI 应用都要用——包一层 MCP Server，一次实现处处接入。
- 第三方能力优先找现成 Server（官方仓库已有文件系统、GitHub、数据库等），不要重复造轮子。
- 只有一个应用、一个工具的简单场景，直接 Function Calling 更轻——协议本身也有握手、进程管理的成本。

## 配套代码

| 脚本 | npm script | 对应小节 |
| ---- | ---- | ---- |
| `code/agent-lab/mcp/server.ts` | `npm run mcp-server` | 动手：从零实现天气 MCP Server |
| `code/agent-lab/mcp/client.ts` | `npm run mcp-client` | 再写一个自己的 Client |

`mcp-client` 全链路真实跑通（Open-Meteo 实时天气）；工具发现与参数校验不依赖网络。
