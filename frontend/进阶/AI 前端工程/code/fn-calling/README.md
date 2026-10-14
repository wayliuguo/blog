# fn-calling — Function Calling 前端接线最小实现（AI 前端工程 · AI 与前端工程结合篇实战）

零依赖 Node 脚本。**优先真实 DeepSeek**：key 写进 `.env`（格式见 `.env.example`）；无 key 或加 `--force-mock` 时走本地剧本（固定返回一次 tool_calls，验证执行循环本身）。

## 跑起来

```cmd
cd code\fn-calling
copy .env.example .env   :: 粘上真实 DEEPSEEK_API_KEY（留空则 mock）
npm start                :: 默认问题走完整工具调用循环
npm run mock             :: 强制本地剧本（不需要 key、不出网）
node agent.mjs "查订单 ORD-2026-1002"   :: 自定义问题
```

## 实验 ↔ 篇目对照表

| 实验点 | 代码位置 | 对应篇目小节 |
| --- | --- | --- |
| 工具白名单 schema（受约束 DSL） | `tools.mjs` | 组件生成：约束 DSL |
| 结构化错误回喂（未注册工具 / 参数坏 / 数据不存在） | `agent.mjs` 执行段 | 结构化输出：错误回喂 |
| tool_calls 执行循环（含轮次上限） | `agent.mjs` main | 本篇实战 |
| OpenAI tools 参数格式 | `agent.mjs` chatTools | Function Calling 前端接线 |

## 验证记录（2026-10-14）

- 真实模式：DeepSeek 返回 `getOrderStatus(ORD-2026-1001)` 与 `queryRefundPolicy(refund)` 两次工具调用，白名单执行 + 回喂后产出最终答复。
- mock 模式：`npm run mock` 不出网，执行循环同样走通（白名单命中 + tool 角色回喂）。
