# agent-lab

《Agent 开发》模块配套的**核心可运行代码**，按篇目拆成子模块（`code/agent-lab/<子模块>/<文件>.ts`）。
这里只放「不依赖外部 API / 数据库就能跑通核心机制」的真实文件；文章里依赖 DeepSeek Key、PostgreSQL + pgvector 的业务代码以「示意片段」形式呈现，不在此处复现。

## 运行

```bash
npm install          # 装 tsx / typescript / zod / @modelcontextprotocol/*
npm run intent       # Structured Output + Zod 意图解析
npm run tool-calling # Tool Calling 的 function schema
npm run agent-loop   # 最小 Agent Loop（mock LLM）
npm run context      # 按轮次裁剪上下文
npm run cosine       # 余弦相似度
npm run vector-store # 内存向量库 + TopK
npm run rag          # RAG 检索本质（伪 embedding）
npm run langchain    # LangChain 风格工具封装 + 消息闭环（零依赖镜像）
npm run langgraph    # LangGraph 风格状态图（零依赖镜像）
npm run mcp-server   # 天气 MCP Server（需 @modelcontextprotocol/server）
npm run mcp-client   # 天气 MCP Client（需 @modelcontextprotocol/client）
```

> 说明：`rag-retrieval.ts` 用「伪 embedding」仅为演示检索链路，真实 Embedding 来自模型 API；
> `agent-loop.ts` 用 mock LLM 演示循环，真实场景把 `llm` 换成封装好的模型调用即可；
> `langchain/langgraph` 两个文件是**零依赖镜像**，复刻框架核心机制以便无 Key 也能跑通，正文里的「示意片段」才是真实框架 API；
> `mcp/*` 需要安装 `@modelcontextprotocol/*`，且真实天气查询需能访问 Open-Meteo 的网络，但工具发现 / 参数校验无需网络。

## 子模块 ↔ 篇目小节对照

| 子模块 / 文件 | 演示的机制 | 对应篇目 |
| ---- | ---- | ---- |
| `llm-access/intent-schema.ts` | Structured Output + Zod 运行时校验 | 第 1 篇（Agent 是什么） |
| `tool-calling/tools-schema.ts` | Tool Calling 的 function schema | 第 2 篇（Tool Calling） |
| `agent-loop/agent-tool.ts` | 统一工具协议 AgentTool | 第 3 篇（Agent Loop） |
| `agent-loop/agent-loop.ts` | 最小 Agent Loop | 第 3 篇（Agent Loop） |
| `memory/context-manager.ts` | 按对话轮次裁剪历史 | 第 4 篇（上下文与记忆） |
| `embedding/cosine-similarity.ts` | 余弦相似度 | 第 5 篇（Embedding 与向量检索） |
| `embedding/embedding-provider.interface.ts` | Embedding 抽象解耦 | 第 5 篇 |
| `embedding/in-memory-vector-store.ts` | 内存向量库 + TopK | 第 5 篇 |
| `rag/rag-retrieval.ts` | RAG 检索本质（余弦 TopK） | 第 6 篇（RAG） |
| `langchain/langchain-agent.ts` | LangChain 风格工具封装 + 消息闭环（零依赖镜像） | 第 7 篇（LangChain） |
| `langgraph/langgraph-agent.ts` | LangGraph 风格状态图（零依赖镜像） | 第 8 篇（LangGraph） |
| `mcp/server.ts` | MCP Server：registerTool + stdio 传输 | 第 9 篇（MCP） |
| `mcp/client.ts` | MCP Client：connect / listTools / callTool | 第 9 篇（MCP） |
