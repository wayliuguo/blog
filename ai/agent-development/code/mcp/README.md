# mcp

《Agent 开发》第 9 篇《MCP：从零实现天气查询服务》的配套脚本（真实 MCP SDK v2，stdio 传输）。

## 运行

```bash
npm install
npm run mcp-server   # 天气 MCP Server：registerTool + StdioServerTransport
npm run mcp-client   # 天气 MCP Client：connect / listTools / callTool 全链路
```

- Server 日志只能写 `console.error`（stdout 承载协议消息，混入普通日志会破坏通信）。
- `mcp-client` 全链路真实跑通（Open-Meteo 实时天气，需外网）；工具发现与参数校验不依赖网络。
- 数据来自 Open-Meteo 公开接口，无需天气 API Key。
