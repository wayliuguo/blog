# Agent Day 07：LangChain 实战篇——App 安全分析 Agent 最小闭环（对应博客篇 7）

- 来源：https://mp.weixin.qq.com/s/d10gIIb8NQmtzm5IBtCOqA
- 作者：楠熠之 · 2026-09-19
- 抓取方式：WebFetch 摘要归档（2026-10-02）

## 提纲（36 节）
一、为什么之前不直接学 LangChain → 二、LangChain 封装了手写阶段哪些东西（对应关系表）→ 三~五、场景（Android App 安全分析）与架构 → 六~七、NestJS 项目与 LlmService（ChatOpenAI，temperature 0，DEEPSEEK_BASE_URL/DEEPSEEK_MODEL）→ 八、LangChain Message（SystemMessage/HumanMessage/AIMessage/ToolMessage）→ 九~十二、5 个 Tool、tool() 封装（执行函数 + {name,description,schema}）、description 重要性、bindTools() 语义 → 十三、ToolRegistry 保留（getAll/get）→ 十四、真正的 Agent Loop（MAX_ITERATIONS=10；找不到工具 push "Unknown tool"；异常 push "Tool execution failed"；超限 throw 'Agent exceeded max iterations'）→ 十五~二十、APK 反编译（execFile jadx，timeout 120s）、Manifest 入口、JADX 搜索、跨文件追踪、不自己写 DataFlowEngine → 二十一~二十四、RAG 职责（Tool=事实，RAG=规则，LLM=分析）、Embeddings/Document/VectorStore/Retriever 对应、SecurityKnowledgeTool → 二十五、Prompt 10 条规则防乱判 → 二十六~二十八、Structured Output（SecurityFindingSchema 9 字段 + withStructuredOutput；两阶段：先 Agent Loop 调查再整理报告）→ 二十九~三十一、最小闭环与输出 → 三十二~三十三、LangChain 帮了什么/没做什么 → 三十四、不是所有东西都交给 LLM → 三十五~三十六、收获与全系列知识图谱。

## 核心概念
- 手写 vs LangChain 对应：ToolRegistry/tool()、chat.completions.create/model.invoke、裸消息/BaseMessage、EmbeddingProvider/Embeddings、VectorRetriever/asRetriever({k:3})、手动 JSON.parse/withStructuredOutput
- bindTools 只告知模型可用工具，不自动执行
- ToolMessage 带 tool_call_id 回传
- RAG 定位：Tool=App 里实际有什么；RAG=按企业规则意味着什么；LLM=结合 Evidence+Rule 分析
- 原则：确定性任务交给 Tool，企业知识交给 RAG，动态决策交给 LLM

## 事实性细节
- pnpm add langchain @langchain/core @langchain/openai；@nestjs/config zod fast-xml-parser openai
- ChatOpenAI：model 'deepseek-chat'，temperature 0，baseURL https://api.deepseek.com
- execFileAsync('jadx', ['-d', outputDir, apkPath], { timeout: 120_000 })
- retriever k=3；MAX_ITERATIONS=10
- SecurityFindingSchema：title/riskFound/entryPoint/source/dataFlow/validation/sink/securityRule/remediation
- 示例链：demo://open?url=... → getQueryParameter("url") → UrlRouter.open → webView.loadUrl；规则 WEBVIEW-001；DATA_FLOW_INCOMPLETE
- 工具：ApkDecompileTool / ManifestAnalysisTool / JadxSearchTool / ReadJadxSourceTool / SecurityKnowledgeTool

## 踩坑点
- bindTools 极易误解（不自动执行）
- Structured Output 不要直接替换 Agent Loop（两阶段：先调查再整理报告）
- 不要自己写 DataFlowEngine（学 Agent 而非做 SAST）
- Prompt 防乱判：仅 exported/仅 DeepLink/仅 loadUrl 不能判漏洞；校验函数要看实现；无法证明 Source→Sink 标 DATA_FLOW_INCOMPLETE；不得编造代码
- exec("jadx "+path) 不如 execFile 安全
- Tool description 是 Agent Prompt 的一部分
- 会用 LangChain API ≠ 会开发 Agent
