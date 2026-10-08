# embedding

《Agent 开发》第 5 篇《Embedding 与向量检索：长期记忆的持久化》的配套演示脚本。

## 运行

```bash
npm install
npm run cosine        # 手写余弦相似度
npm run vector-store  # 内存向量库：upsert / search TopK
```

`embedding-provider.interface.ts` 是独立示例（真实 Provider 实现时引用）。
真实 Embedding API 与 pgvector 依赖密钥和数据库环境，正文以「示意片段」呈现。
