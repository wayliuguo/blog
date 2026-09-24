# AI 与前端工程结合

## 一、AI Coding 的三层基建

把「AI 生成的东西」接入构建流水线，中间隔着三道闸门：

| 层 | 要解决的问题 | 前端侧的落点 |
| --- | --- | --- |
| 上下文层 | 模型不知道你的项目长什么样 | 代码库索引、相关文件检索、prompt 装配与预算 |
| 约束层 | 模型输出的格式与内容不可控 | schema 校验、DSL 白名单、失败自动回喂重试 |
| 评测层 | 改 prompt 是一次「隐性发版」 | 生成结果快照比对、CI 里跑评测集、badcase 归档 |

三层里最容易被忽略的是评测层：prompt 一改，历史上所有生成行为都变了，却没有 diff 可看。没有评测集的 AI 功能，等于没有测试的组件库。

## 二、结构化输出：噪声剥离 → schema 校验 → 错误回喂

组件生成、表单填充、接口 mock——凡是「AI 的输出要直接进程序」的场景，都必须走结构化输出。第一道工序是噪声剥离：模型习惯把 JSON 包进围栏、或在前后加客套话：

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

第二道工序是 schema 校验——解析成功不代表能用，字段类型错了照样炸在下游。第三道也是最有价值的一道：**失败后带着错误清单回喂重试**，而不是原样重发同一个 prompt：

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

实测一条包含三类故障的输出序列：围栏缺右括号（解析失败）→ 字段类型错误（校验失败）→ 正确输出，第三轮通过：

> 摘自 `./code/ai-lab/gen.cjs`

```js
{
  const raws = [
    '好的，这是你要的组件定义：\n```json\n{ "name": "Button", "props": ["size", "type"]\n```\n还需要调整吗？',
    '{ "name": 42, "props": [] }',
    '```json\n{ "name": "Button", "props": ["size", "type"] }\n```'
  ]
  const schema = { name: 'string', props: 'array' }
  const { obj, attempts } = generateWithRepair(raws, schema)
  assert.equal(obj.name, 'Button')
  assert.equal(attempts, 3)
  console.log('[1] 结构化输出：第 1 次围栏噪声解析失败、第 2 次类型校验失败，第 3 次通过')
}
```

生产上还有第四道保险：直接用模型 API 的**结构化输出模式**（JSON Schema 约束解码），让围栏噪声在源头就不存在——但校验和回喂仍然要留，因为「格式对」不等于「内容对」。

## 三、组件生成：约束 DSL，而不是自由代码

让模型直接产出 React/Vue 组件代码，得到的是一份**每次都不一样的自由文本**：命名随机、依赖随机、风格随机，没法进设计系统。正确姿势是让模型输出一个**受约束的 DSL**（组件名、props、插槽全部走白名单），渲染由前端已有引擎完成：

> 示意片段（无配套脚本）

```
// ❌ 自由代码：模型直接写 JSX —— 不可控
// ✅ 约束 DSL：模型只填白名单结构，渲染器是自己的
{
  "component": "Button",        // 白名单校验：不在注册表内直接拒绝
  "props": { "size": "md", "type": "primary" },
  "children": [{ "component": "Text", "props": { "value": "提交" } }]
}
```

这样做的收益与边界同样清晰：

- **收益**：输出可控可校验（schema 即文档）、天然适配低代码渲染器、坏结果可以按节点定位回喂。
- **边界**：表达力被白名单锁死——新组件要先进注册表；复杂交互逻辑塞不进 DSL，仍然要人写。

这与低代码/搭建体系的思路完全同源（见 `低代码与搭建体系` 模块）：**把「生成」限制在受约束的空间里，确定性才有可能超过概率**。

## 四、上下文装配与 token 预算

prompt 窗口是稀缺资源，也是成本项。装配策略要按优先级贪心装载：system 优先级最高永不动，其次是检索片段、代码上下文，历史对话排在最末位——超预算时最先丢它：

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

{
  const parts = [
    { name: 'system', tokens: 120, priority: 0 },
    { name: 'retrieval', tokens: 800, priority: 1 },
    { name: 'code-context', tokens: 600, priority: 2 },
    { name: 'history', tokens: 500, priority: 3 }
  ]
  const r = assemble(1600, parts)
  assert.deepEqual(r.kept, ['system', 'retrieval', 'code-context'])
  assert.deepEqual(r.dropped, ['history'])
  assert.equal(r.used, 1520)
  console.log('[2] 上下文装配：预算 1600，保住 system+检索+代码（1520），丢弃最末位的历史对话')
}
```

注意这个贪心实现的一个特性：**高优先级片段如果塞不进剩余预算，会直接跳过去装载更小的低优先级片段**——先保「装得下的最重要内容」，而不是严格排序后截断。装配前还需要估算 token 数，工程上用不到精确 tokenizer，粗算加余量即可：

> 摘自 `./code/ai-lab/gen.cjs`

```js
// 精确计数需要 tokenizer；工程上先用粗估 + 20% 余量兜底：
// 中文约 1 字/token，英文约 4 字符/token。
function estimateTokens(text) {
  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length
  const other = text.length - cjk
  return Math.ceil(cjk + other / 4)
}

{
  assert.equal(estimateTokens('前端面试题'), 5)
  assert.equal(estimateTokens('const x = 1;'), 3)
  assert.equal(estimateTokens('用 Vue 开发'), 5)
  console.log('[3] token 粗算：中文按字、英文按 4 字符，混合场景可预算内兜底')
}
```

粗估误差通常在 ±20% 以内，预算按 80% 填充就是这个余量的用途。

## 五、设计稿转代码的边界

「设计稿直接出可用页面」是宣传语，工程上的真实边界要切开看：

| 环节 | 自动化程度 | 原因 |
| --- | --- | --- |
| 布局骨架 | 高 | 视觉层次 → Flex/Grid 结构有稳定的映射规则 |
| 样式映射 | 中高 | 颜色/字号/间距可对齐 design token；游离值需人工归一 |
| 图片与图标资源 | 中 | 切图可自动，语义命名（icon-search）靠约定 |
| 交互与状态逻辑 | 低 | 跳转、校验、异步依赖业务上下文，稿子里没有 |
| 可访问性 | 低 | 焦点序、aria 语义、键盘路径需要真实理解用途 |

结论：把设计稿转代码定位成**「生成第一版布局骨架 + 样式」的加速器**，交互逻辑、状态管理、可访问性仍是人的工作。落点同样是约束 DSL 或受控组件树，而不是整页自由代码——否则生成的代码第一次需求变更就会失控。

## 工程含义清单

- 结构化输出四道闸：噪声剥离 → JSON 解析 → schema 校验 → 错误回喂重试；能用 API 级 JSON Schema 约束就用。
- 组件生成走白名单 DSL：渲染器是自己的，模型只填结构；表达力换确定性，值。
- 上下文装配按优先级贪心：system 不动，历史对话最先丢；预算按粗估的 80% 填充。
- prompt 是「隐性发版」：改 prompt 必须过评测集，badcase 归档进回归。
- 设计稿转代码定位为布局加速器：交互逻辑与可访问性仍是人的活。

## 配套代码

| 文件 | 作用 | 对应小节 |
| --- | --- | --- |
| `./code/ai-lab/gen.cjs` | 结构化输出修复重试 / 上下文装配 / token 粗算 | 二、四 |
| `./code/ai-lab/sse.cjs` | SSE 分帧 / 半开代码块 / 中断 / 重试（上一篇引用） | — |
| `./code/ai-lab/wasm.cjs` | 端侧推理探针（下一篇引用） | — |
| `./code/ai-lab/perf.cjs` | 性能与成本探针（性能篇引用） | — |
| `./code/ai-lab/run.cjs` | 总入口：依次执行四探针 | 全篇 |

## 参考

- 本模块总结：[总结](./总结.md)
- 上一篇：[LLM 应用前端形态](./LLM%20应用前端形态.md)
- 下一篇：[端侧推理与 WASM](./端侧推理与%20WASM.md)
- 参考：[OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs) · [Anthropic Prompt Engineering](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview) · [低代码与搭建体系（本站模块）](../低代码与搭建体系/总结.md)
