# LangGraph 实战：让流程会分支、能暂停、可恢复（对应博客篇 8 · 后半，主篇）

- 来源：https://mp.weixin.qq.com/s/kemyL5XdzVg280mAPHtGSQ
- 作者：楠熠之 · 2026-09-24
- 抓取方式：WebFetch 摘要归档（2026-10-02；网页摘要尾部有截断，持久化/恢复/流式细节见原文）

## 提纲（抓到的主线）
State/Node/Edge 在「学习计划」案例中的职责 → 链式调用误区（addNode/addEdge/addConditionalEdges/compile/invoke 各自做什么，决定顺序的是边）→ Agent Loop 放进图（模型节点+工具节点；保留完整消息；ToolMessage tool_call_id 对应）→ 三种限制分层（自己维护的工具轮数 / recursionLimit 图超级步 / 模型 maxRetries）→ 校验与修改（三天学习计划：有目标/练习、时长≤1 小时；先判是否通过再判次数是否耗尽；最多修改两次；明确规则通过≠内容合适）→ 并行节点与 Reducer（概念说明与练习的数据依赖决定串并行；ReducedValue；MessagesValue）→ 实战项目搭建：mkdir langgraph-study，package.json（type: module），pnpm add @langchain/langgraph@1.4.17 @langchain/core@1.2.12 @langchain/deepseek@1.1.13 @langchain/langgraph-checkpoint-postgres@1.0.5 zod@4.6.5 dotenv@18.0.3，devDeps typescript tsx @types/node → CREATE DATABASE langgraph_learning → .env（DEEPSEEK_API_KEY / DEEPSEEK_MODEL=deepseek-flash / LANGGRAPH_DATABASE_URL=postgresql://postgres:...@127.0.0.1:5432/langgraph_learning）→ 案例：输入学习主题→生成三天计划→暂停审核；批准标记采用、拒绝标记拒绝；暂停后程序可退出，下次运行继续审核（PostgreSQL 持久化 + 流式输出）。

## 核心概念
- 节点只提交自己修改的字段（并行时全量返回会误写他人字段）
- Agent Loop 拆模型节点/工具节点；两条不能省的细节：保留模型完整消息、ToolMessage.tool_call_id 对应
- 限制分层：业务工具轮数 / recursionLimit / maxRetries 不可互相替代
- 校验分支顺序：先判通过、再判次数耗尽（最后一次修改合格应成功）
- Reducer/ReducedValue/MessagesValue；并行节点读该步开始时状态，数组合并顺序≠完成顺序
- interrupt → 人工审核 → Command({ resume }) 恢复；跨重启靠 PostgreSQL Checkpointer

## 事实性细节（版本号重要）
- @langchain/langgraph 1.4.17；@langchain/core 1.2.12；@langchain/deepseek 1.1.13；@langchain/langgraph-checkpoint-postgres 1.0.5；zod 4.6.5；dotenv 18.0.3
- DEEPSEEK_MODEL=deepseek-flash（原文如此）
- 库名 langgraph_learning；数据库 URL 用 LANGGRAPH_DATABASE_URL 变量
- 密码含 @ 等特殊字符需 URL Encode（摘要截断处）
