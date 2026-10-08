# Agent 开发 · 配套代码

《ai/Agent 开发》模块的配套代码，**一章一个项目、同一层级**，目录名对齐章节主题（顺序以侧边栏为准，目录不带编号）：

| 篇 | 章节 | 项目 |
| --- | --- | --- |
| 1 | Agent 是什么：从接入大模型到让 LLM 参与决策 | `agent-basics/`（完整 NestJS 工程） |
| 2 | Tool Calling | `tool-calling/` |
| 3 | Agent Loop | `agent-loop/` |
| 4 | 上下文与记忆 | `context-memory/` |
| 5 | Embedding 与向量检索 | `embedding/` |
| 6 | RAG | `rag/` |
| 7 | LangChain | `langchain/`（零依赖镜像） |
| 8 | LangGraph | `langgraph/`（零依赖镜像） |
| 9 | MCP | `mcp/`（真实 MCP SDK） |

每个项目独立 `package.json`，先 `npm install` 再按其 README 或正文「配套代码」表运行；
脚本名与各篇正文「运行：npm run xxx」逐字一致。
除 `agent-basics`（需 DeepSeek Key）与 `mcp`（mcp-client 需外网）外，其余脚本无 Key、无数据库即可跑。
