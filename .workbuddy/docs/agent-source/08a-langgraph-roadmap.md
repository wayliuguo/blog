# LangGraph 学习路线篇（对应博客篇 8 · 前半）

- 来源：https://mp.weixin.qq.com/s/1TXd4Q1SAAOD6fWAGVUb1w
- 作者：楠熠之 · 2026-09-23
- 抓取方式：WebFetch 摘要归档（2026-10-02）

## 提纲
一、LangChain 和 LangGraph 的关系（当前 LangChain createAgent() 本身构建在 LangGraph 之上）→ 二、State/Node/Edge 三概念 → 三、用图重搭 Agent Loop（模型节点+工具节点；模型调用次数≠工具调用次数≠执行轮数≠图步数；recursionLimit 限制图的执行步数）→ 四、Conditional Edge 设计业务流程（生成→检查→修改，程序管明确规则，模型管生成分析）→ 五、并行执行与 Reducer（同一步多节点写同一字段会冲突；并行节点读该步开始时的状态）→ 六、Checkpoint/Checkpointer（先 MemorySaver 再 PostgreSQL；thread_id 标识会话）→ 七、Human-in-the-loop（interrupt() 暂停、Command({ resume }) 恢复；Idempotency 幂等：恢复时中断前代码可能重跑）→ 八、多 Agent 协作（Subgraph 子图；父子图通过共享字段或包装节点通信）→ 九、接入前端与异常路径验证（两类流式信息：模型输出 vs 执行进度；固定验证用例表）→ 十、路线落到一个项目（TypeScript + pnpm + DeepSeek；资料分析与报告助手 9 阶段）。

## 核心概念
- State（类比 Store 但更新遵循图规则）/ Node（函数，只提交自己修改的字段）/ Edge（决定顺序）
- addNode 注册、addEdge 固定连接、addConditionalEdges 条件、compile 构建图、invoke/stream 才执行——链式写法不代表执行顺序
- recursionLimit（图超级步）与业务轮数、maxRetries 分层，不能互相替代
- Reducer 合并规则；ReducedValue 声明；MessagesValue 内置消息合并
- Checkpoint/Checkpointer；thread_id
- interrupt() / Command({ resume }) / 幂等性
- Subgraph：需要独立模型决策、工具、上下文才拆 Agent，简单校验保持普通函数节点

## 事实性细节
- 统一 TypeScript + pnpm + DeepSeek；需要服务/数据库时再加 NestJS + PostgreSQL
- 9 阶段路线：图基础→Agent 循环→业务流程→并行→持久化→人工参与→多 Agent→前端与调试→工程验证
- 验证用例：输入完整/缺资料/数据源失败重试/一直不合格达上限停止/审核时重启恢复/重复提交不重复产生结果
