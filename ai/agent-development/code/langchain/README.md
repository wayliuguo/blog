# langchain

《Agent 开发》第 7 篇《LangChain：用框架重写一遍 Agent》的配套演示脚本（零依赖镜像，复刻框架核心机制）。

## 运行

```bash
npm install
npm run langchain   # tool() 镜像、schema 校验、消息闭环（human → ai → tool）
```

正文里的 `new ChatOpenAI` / `bindTools` / `withStructuredOutput` 为真实框架 API，需 API Key 环境，以「示意片段」呈现；脚本侧用零依赖镜像复刻同构机制。
