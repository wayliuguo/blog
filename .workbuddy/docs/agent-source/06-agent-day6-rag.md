# Agent Day 6：RAG 实战篇——从 0 手写企业级 RAG 知识库（对应博客篇 6）

- 来源：https://mp.weixin.qq.com/s/B4_HLSi7LDEL_WOWfXWjjA
- 作者：楠熠之 · 2026-09-17
- 抓取方式：WebFetch 摘要归档（2026-10-02；网页摘要对小节有省略，主线完整）

## 提纲（抓到的主线）
一、从一份 Markdown 到模型可用知识，中间隔着 Loader/Parser/Structure/Chunk/Metadata/Token/Embedding/Vector Store/Transaction/Version/Retrieval 每层都有工程问题 → 二、RAG 和 Agent Tool 是什么关系（RAG ≠ Tool，但可包装成 search_knowledge Tool）→ 中段（省略部分覆盖：文档加载/解析、切块、Embedding、pgvector 存储、去重、事务、版本管理、Vector Retrieval）→ 写在最后：RAG = 数据工程 + 检索工程 + LLM 工程。

## 核心概念
- 已完成链路：文档 → 结构化解析 → Chunk → Embedding → pgvector → Top-K Retrieval
- RAG 不等于 Tool；Agent 里可把检索包装成 search_knowledge 工具（RagTool）
- Loader/Parser 分离；文档去重（checksum）；事务式写入；版本管理
- 下一阶段用 LangChain 重构（App 漏洞检测 Agent 项目预告）

## 事实性细节
- 承接 Day 5 的 PostgreSQL + pgvector 基础设施
- 项目结构预告：src/rag/ 下 rag.controller.ts、rag.service.ts、document.service.ts、chunk.service.ts、retrieval.service.ts、rag.repository.ts
- Embedding 用 Qwen Embedding API（1024 维）出现在 Day 7 回顾中

## 踩坑点
- 不先学 vectorStore.asRetriever() 的黑盒，先手写每一层
- 文档去重、事务、版本管理是手写 RAG 的工程难点
