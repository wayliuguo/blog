# langgraph

《Agent 开发》第 8 篇《LangGraph：有状态的流程编排》的配套演示脚本（零依赖镜像）。

## 运行

```bash
npm install
npm run langgraph   # State + 双节点 Agent Loop + 条件边（零依赖镜像）
npm run workflow    # 生成 → 校验分支 → interrupt 暂停审核 → 恢复（零依赖镜像）
```

正文里的 `StateGraph` / `interrupt()` / `Command({ resume })` / `PostgresSaver` 为真实框架 API，依赖 `@langchain/langgraph` 与数据库环境，以「示意片段」呈现。
