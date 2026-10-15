# AI 与前端工程结合

> 统一业务场景：智能客服助手（见[全景](./全景.md)）。本篇实战层绑定真实工程 `code/fn-calling/`（真实 DeepSeek 两次 tool_calls 实测）；探针 `code/ai-lab/gen.cjs` 负责结构化输出与上下文装配的机制验证。

## 一、入门：AI Coding 的三层基建

把「AI 生成的东西」接入构建流水线，中间隔着三道闸门：

| 层 | 要解决的问题 | 前端侧的落点 |
| --- | --- | --- |
| 上下文层 | 模型不知道你的项目长什么样 | 代码库索引、相关文件检索、prompt 装配与预算 |
| 约束层 | 模型输出的格式与内容不可控 | schema 校验、DSL 白名单、失败自动回喂重试 |
| 评测层 | 改 prompt 是一次「隐性发版」 | 生成结果快照比对、CI 里跑评测集、badcase 归档 |

三层里最容易被忽略的是评测层：prompt 一改，历史上所有生成行为都变了，却没有 diff 可看。没有评测集的 AI 功能，等于没有测试的组件库。

## 二、核心机制：结构化输出四道闸

组件生成、表单填充、接口 mock——凡是「AI 的输出要直接进程序」的场景，都必须走结构化输出。四道闸门：**噪声剥离 → JSON 解析 → schema 校验 → 错误回喂**。

第一道工序是噪声剥离——模型习惯把 JSON 包进围栏、或在前后加客套话：

> 摘自 `./code/ai-lab/gen.cjs`

```js
// 模型常把 JSON 包进 ```json 围栏、或在前后加客套话；解析必须先剥离噪声。
function extractJson(raw) {
  const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = m ? m[1] : raw
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('找不到 JSON 边界')
  return JSON.parse(body.slice(start, end + 1))
}
```

第二道 schema 校验 + 第三道最有价值的**错误回喂**——失败后带着错误清单回喂重试，而不是原样重发同一个 prompt：

> 摘自 `./code/ai-lab/gen.cjs`

```js
function validate(obj, schema) {
  const errors = []
  for (const [key, type] of Object.entries(schema)) {
    const v = obj[key]
    if (type === 'string' && typeof v !== 'string') errors.push(`${key}: 期望 string，实际 ${typeof v}`)
    if (type === 'array' && !Array.isArray(v)) errors.push(`${key}: 期望 array，实际 ${typeof v}`)
  }
  return errors
}

// 修复重试：把上一轮的校验错误清单喂回给模型，而不是原样重发同一个 prompt
function generateWithRepair(raws, schema) {
  let lastErrors = []
  for (let i = 0; i < raws.length; i++) {
    let obj
    try {
      obj = extractJson(raws[i])
    } catch (e) {
      lastErrors = [e.message]
      continue
    }
    const errors = validate(obj, schema)
    if (!errors.length) return { obj, attempts: i + 1 }
    lastErrors = errors
  }
  throw new Error(`全部尝试失败：${lastErrors.join('; ')}`)
}
```

实测一条包含三类故障的输出序列：围栏缺右括号（解析失败）→ 字段类型错误（校验失败）→ 正确输出，第三轮通过（`node run.cjs`）。

生产上还有第四道保险：直接用模型 API 的**结构化输出模式**（JSON Schema 约束解码），让围栏噪声在源头就不存在——但校验和回喂仍然要留，因为「格式对」不等于「内容对」。

## 三、核心机制：约束 DSL 与上下文装配

### 3.1 组件生成：约束 DSL，而不是自由代码

让模型直接产出 React/Vue 组件代码，得到的是一份**每次都不一样的自由文本**：命名随机、依赖随机、风格随机，没法进设计系统。正确姿势是让模型输出一个**受约束的 DSL**（组件名、props、插槽全部走白名单），渲染由前端已有引擎完成：

> 示意片段（无配套脚本）

```json
{
  "component": "Button",
  "props": { "size": "md", "type": "primary" },
  "children": [{ "component": "Text", "props": { "value": "提交" } }]
}
```

- **收益**：输出可控可校验（schema 即文档）、天然适配低代码渲染器、坏结果可以按节点定位回喂；
- **边界**：表达力被白名单锁死——新组件要先进注册表；复杂交互逻辑塞不进 DSL，仍然要人写。

这与低代码/搭建体系的思路完全同源（见 `低代码与搭建体系` 模块）：**把「生成」限制在受约束的空间里，确定性才有可能超过概率**。Function Calling 的工具白名单（见实战节）就是这个思路在 API 层的形态。

### 3.2 上下文装配与 token 预算

prompt 窗口是稀缺资源，也是成本项。装配策略要按优先级贪心装载：system 优先级最高永不动，其次是检索片段、代码上下文，历史对话排在最末位——超预算时最先丢：

> 摘自 `./code/ai-lab/gen.cjs`

```js
// prompt 窗口是稀缺资源。约定优先级：system > 检索片段 > 代码上下文 > 历史对话，
// 超预算时从低优先级开始丢弃。
function assemble(budget, parts) {
  const order = [...parts].sort((a, b) => a.priority - b.priority)
  let used = 0
  const kept = new Set()
  for (const p of order) {
    if (used + p.tokens <= budget) {
      kept.add(p.name)
      used += p.tokens
    }
  }
  return {
    kept: [...kept],
    used,
    dropped: parts.map(p => p.name).filter(n => !kept.has(n))
  }
}
```

实测：预算 1600 时保住 system + 检索 + 代码上下文（1520），丢弃最末位的历史对话。注意贪心实现的一个特性：**高优先级片段塞不进剩余预算时会直接跳过，装载更小的低优先级片段**——先保「装得下的最重要内容」。装配前的 token 粗算：中文约 1 字/token、英文约 4 字符/token，预算按粗估的 80% 填充兜底 ±20% 误差。

## 四、实战：fn-calling 工具调用循环

`code/fn-calling/`（零依赖 Node）把「约束 DSL」落到 Function Calling：工具全部走**白名单 schema**（`tools.mjs`），执行循环带**轮次上限**与**结构化错误回喂**（`agent.mjs`）：

> 摘自 `./code/fn-calling/agent.mjs`

```js
    // 执行模型点名的每个工具：白名单校验 → 参数 JSON.parse → run()
    for (const call of reply.tool_calls) {
      const tool = findTool(call.function.name)
      console.log(`[round ${round}] 模型请求调用工具：${call.function.name}(${call.function.arguments})`)
      let result
      if (!tool) {
        // 未注册工具：结构化错误回喂，而不是终止整个会话
        result = { ok: false, error: `工具 ${call.function.name} 不在白名单内，可用工具：${tools.map(t => t.name).join(', ')}` }
      } else {
        try {
          result = tool.run(JSON.parse(call.function.arguments))
        } catch (e) {
          result = { ok: false, error: `参数解析失败：${e.message}` }
        }
      }
      console.log(`[round ${round}] 工具结果：${JSON.stringify(result)}`)
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) })
    }
```

**实测读数（2026-10-14，真实 DeepSeek 端点）**：提问「查订单 ORD-2026-1001 + 退款政策」，模型第一轮**自主并列请求两个工具**——`getOrderStatus({"orderId": "ORD-2026-1001"})` 返回 `{ok:true, status:"已发货", carrier:"顺丰", eta:"明天 18:00 前"}`、`queryRefundPolicy({"topic": "refund"})` 返回政策文本；回喂后模型产出结构清晰的最终答复（订单状态 + 政策要点 + 追问建议）。mock 模式（`npm run mock`，不出网）同样走通循环。

跑工程：

```
cd code/fn-calling
copy .env.example .env   :: 粘 DEEPSEEK_API_KEY（留空则 mock）
npm start
```

三条工程纪律值得写进规范：**工具实现是确定性的**（纯函数 + 自家数据源，模型只决定「调谁、传什么」）；**错误必须结构化回喂**（`{ok:false, error:"..."}` 让模型能向用户澄清，抛异常则整个会话终止）；**循环必须设轮次上限**（防模型连环调用工具打转烧钱）。

## 五、对比与适用边界

- **自由代码 vs 约束 DSL**：自由代码表达力强但每次输出都不同；约束 DSL 用表达力换确定性，值——除非产出只给人看；
- **JSON Schema 约束解码 vs 事后校验**：能用 API 级结构化输出就用，事后校验回喂永远要留（格式对 ≠ 内容对）；
- **设计稿转代码的真实边界**：布局骨架自动化程度高、样式映射中高、交互与状态逻辑低、可访问性低——定位为「生成第一版布局骨架 + 样式」的加速器，交互逻辑、状态管理、可访问性仍是人的工作。

## 配套代码

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/ai-lab/gen.cjs` | 结构化输出修复重试 / 上下文装配 / token 粗算 | 二、三 |
| `./code/ai-lab/sse.cjs` | SSE 分帧 / 半开代码块 / 中断 / 重试（上一篇引用） | — |
| `./code/ai-lab/wasm.cjs` | 端侧推理探针（下一篇引用） | — |
| `./code/ai-lab/perf.cjs` | 性能与成本探针（性能篇引用） | — |
| `./code/ai-lab/run.cjs` | 总入口：依次执行四探针 | 全篇 |
| `./code/fn-calling/tools.mjs` | 工具白名单 schema + 确定性实现 | 四 |
| `./code/fn-calling/agent.mjs` | 执行循环 + 错误回喂 + 轮次上限 | 四 |

## 参考

- 本模块地图：[全景](./全景.md)
- 本模块总结：[总结](./总结.md)
- 上一篇：[LLM 应用前端形态](./LLM%20应用前端形态.md)
- 下一篇：[端侧推理与 WASM](./端侧推理与%20WASM.md)
- 参考：[OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs) · [Anthropic Prompt Engineering](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview) · [低代码与搭建体系（本站模块）](../低代码与搭建体系/总结.md)
