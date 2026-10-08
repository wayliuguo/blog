# Agent Day 4：从上下文管理到长期记忆（对应博客篇 4）

- 来源：https://mp.weixin.qq.com/s/tb6q9gypemXl672ik7ANVA
- 作者：楠熠之 · 2026-09-10
- 抓取方式：WebFetch 摘要归档（2026-10-02）

## 提纲（原小节）
一、为什么不能把所有聊天记录都发给 LLM → 二、Context Trimming → 三、按 Conversation Round 裁剪 → 四、ConversationStore 和 ContextManager 必须分开 → 五、只做 Trimming 还是有问题 → 六、Rolling Conversation Summary → 七、为什么叫 Rolling Summary → 八、ConversationState 升级（加 summary?: string）→ 九、Summary 和 Trimming 的关系 → 十、Summary 不等于 Memory → 十一、Conversation 和 Memory 的区别 → 十二、Memory 不能直接保存所有聊天记录 → 十三、Memory Extractor → 十四、用 Zod 约束 Memory → 十五、MemoryStore 为什么需要 upsert → 十六、只保存 Memory 还不够（Injection）→ 十七、跨 Conversation 测试 → 十八、Agent 架构全景 → 二十、今天最大的收获 → 二十一、下一步 Structured Output（原文无十九节）。

## 核心概念
- Context Engineering；Storage ≠ Context（数据库存了 ≠ 该发给 LLM）
- Conversation Round：user → assistant(tool_calls) → tool → assistant 算一轮；tool 消息配对不可拆
- trimMessages(messages, maxRounds = 5)：遍历遇 role==='user' 开新轮，非 user 追加当前轮，返回 rounds.slice(-maxRounds).flat()（Safe Trimming）
- 按条数 slice(-20) 裁剪会把 assistant(tool_calls) 与 tool 拆开 → LLM 无法解析
- Rolling Summary：Old Summary + New Old Messages → New Summary，非每次全量重算；KEEP_RECENT_ROUNDS = 3
- Summary 绑 conversationId，换会话就丢 → Memory 绑 userId
- Memory 类型：preference/profile/project；Zod：ExtractedMemorySchema（z.enum + z.string().min(1)）、MemoryExtractionSchema（memories 数组）、z.infer
- MemoryStore upsert：type+key 定位，UPDATE or INSERT（例：backend_framework NestJS→Fastify）
- Memory Injection：getAll(userId) 后以 system 消息注入，否则 LLM 不知道
- 最终 Context 分层：System Prompt → Long-term Memory → Summary → Recent Messages → Current User Message
- 四概念辨析：Conversation History / Context / Summary / Memory 不能画等号

## 事实性细节
- curl POST http://localhost:3000/agent/chat，body 带 userId "10001"、conversationId "conversation-001"/"-002"
- 测试消息：「以后给我写 TypeScript 代码时不要使用 any」→ preference 记忆 key typescript_no_any；「帮我写一个 NestJS Tool」跨会话仍遵守
- Memory key 示例：typescript_no_any、backend_framework

## 踩坑点
- 全量历史 → Token 越来越贵、越来越慢、超窗口
- slice 按条数截断破坏 tool 消息配对
- Trimming 丢早期关键信息（例：带 6 岁小朋友去西安玩）
- Summary 全量重算越来越贵
- Summary ≠ Memory（会话边界）
- Memory 全存聊天记录成垃圾场 → 需要 Extractor 提取
- 同 key 冲突 → upsert
- 只存不注入等于没存
- 第一版提取链路 Prompt→JSON→JSON.parse→Zod.parse 不健壮（下一节 Structured Output 解决）
