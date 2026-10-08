# MCP 入门实战：从零实现一个天气查询服务（对应博客篇 9）

- 来源：https://mp.weixin.qq.com/s/7G16kxuZRiL4N6uAmfGaAQ
- 作者：楠熠之 · 2026-09-28
- 抓取方式：WebFetch 摘要归档（2026-10-02）

## 提纲
从普通天气函数说起（跨程序调用需要知道：有哪些工具/参数/结果格式/失败判断）→ MCP = Model Context Protocol 模型上下文协议，统一约定 → Host/Client/Server 三角色 → 三类能力：Tools/Resources/Prompts（本文只实现 Tools）→ 传输方式：stdio（本地）与 Streamable HTTP（远程）；消息约定 JSON-RPC 2.0 → 独立小项目 weather-mcp-demo（Node.js ≥22.19.0）→ server.ts：McpServer + registerTool('get_weather', {description, inputSchema z.enum(['北京','上海','西安'])}, 回调) + StdioServerTransport；Open-Meteo 取数（AbortSignal.timeout(10_000)，zod 校验响应，weather code 映射中文）→ 三个细节：10 秒超时、失败返回 isError: true、stdio 服务端日志必须 console.error（console.log 会污染协议流）→ Inspector 验证（pnpm dlx @modelcontextprotocol/inspector@2.8.0 --cli node dist/server.js --method tools/list / tools/call --tool-name get_weather --tool-arg city=西安；工具发现 Tool Discovery）→ client.ts：Client + StdioClientTransport（command: process.execPath，args 从 import.meta.url 算 server.js 路径，stderr: 'inherit'）→ connect/listTools/callTool/close 四操作；finally 关闭释放子进程 → 接入 Agent 的 7 步流程（工具列表→转模型工具定义→模型提出调用→应用执行→结果回对话→模型作答/继续循环）→ Tool Calling vs MCP vs Agent Loop 职责表 → 调试排查表。

## 核心概念
- MCP 管应用如何发现/调用外部能力并交换上下文；Tool Calling 管模型如何表达工具意愿；Agent Loop 管反复组织调用的循环
- Server 三层：getWeather 业务函数 / registerTool 注册 / StdioServerTransport 传输
- inputSchema 用 zod（z.enum 限城市），SDK 生成 JSON Schema 并在回调前校验；校验≠认证授权
- 官方 TypeScript SDK v2 分包：@modelcontextprotocol/server 与 @modelcontextprotocol/client
- 工具 description 要写明限制（只支持三城市），防模型当万能查询
- isError: true 让客户端区分数据与失败，并反馈给模型
- Server 无模型调用，不需要模型密钥

## 事实性细节（版本重要）
- 依赖：@modelcontextprotocol/server 2.1.0、@modelcontextprotocol/client 2.0.0、zod 4.6.5；devDeps typescript 5.9.3、@types/node 22.20.4
- tsconfig：target ES2022、module NodeNext、rootDir src、outDir dist
- scripts：build=tsc、start=node dist/server.js、client=node dist/client.js
- Open-Meteo：https://api.open-meteo.com/v1/forecast，current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m，celsius、m/s、timezone Asia/Shanghai
- 城市经纬度：北京 39.9042/116.4074、上海 31.2304/121.4737、西安 34.3416/108.9398
- Inspector 2.8.0

## 踩坑点
- stdio 服务端普通日志必须 console.error；console.log 会破坏协议通信（client 侧可以用 console.log）
- 改源码后忘记 build → 找不到 dist/server.js
- fetch failed/超时：MCP 通信成功不代表外部 API 可达
- 原文验证环境未能连通 Open-Meteo，真实天气成功路径留给可访问网络验证
