# rag

《Agent 开发》第 6 篇《RAG：从 0 手写企业级知识库》的配套演示脚本。

## 运行

```bash
npm install
npm run rag          # Vector Retrieval 本质：相似度排序 TopK（伪 embedding）
npm run token-chunk  # Token-aware 递归切块、标题路径、硬切兜底
npm run rag-pipeline # 文档入库流水线：Loader/Parser 分离、checksum 去重、事务式入库
```

`rag-retrieval.ts` 引用 `../embedding/cosine-similarity`（第 5 篇的余弦实现），两个项目需同时存在。
Embedding 批量调用与 pgvector 真实写入依赖数据库与 API 环境，正文以「示意片段」呈现。
