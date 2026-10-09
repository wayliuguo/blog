# tool-calling

《Agent 开发》第 2 篇《Tool Calling：让 LLM 直接选择并调用程序能力》的配套工程：
沿用第 1 篇的 NestJS 分层（agent / llm 两个模块），按原文新增 `tools` 模块，
组装成**完整可运行的 NestJS 项目**（NestJS + DeepSeek，OpenAI 兼容 SDK，无 mock）。

## 运行

```bash
npm install
cp .env.example .env   # 填入你的 DEEPSEEK_API_KEY（platform.deepseek.com 申请）
npm start              # = tsc -p tsconfig.json && node dist/main.js，监听 http://localhost:3000
```

`.env` 里写哪个都认，优先 `DEEPSEEK_API_KEY`，回退 `OPENAI_API_KEY`。3000 端口被占用时可
`PORT=3001 npm start` 换端口启动（`src/main.ts` 里读 `PORT`，缺省 3000）。

### 两个必须知道的坑（同第 1 篇工程）

1. **`.env` 不会自动进 `process.env`。** 必须显式加载：
   `src/main.ts` 顶部 `import 'dotenv/config'` + `src/app.module.ts` 的
   `ConfigModule.forRoot({ isGlobal: true })`。少了前者，`LlmService` 拿到 `undefined` Key，
   OpenAI SDK 只会抛 `Missing credentials...`——报的是 SDK，真因是没加载 `.env`。

2. **不要 `tsx src/main.ts` 跑本项目。** `tsx`（esbuild）不支持 `emitDecoratorMetadata`，
   装饰器元数据缺失 → Nest 依赖注入静默失效，启动不报错、请求才 500。
   走 `tsc` 产物（`dist/`）才带 `design:paramtypes` 元数据。

## 接口

```bash
# 单轮 Tool Calling 完整闭环：LLM 选工具 → ToolsService 执行 → 结果回灌 → 二次调用生成回答
curl -X POST http://localhost:3000/agent/tools-test \
  -H "Content-Type: application/json" \
  -d '{ "message": "帮我看看西安今天热不热" }'
```

## 工程结构 ↔ 文章小节

| 文件 | 职责 | 对应小节 |
| ---- | ---- | ---- |
| `src/main.ts` | NestFactory 启动、监听 3000（PORT 可覆盖） | 建立测试接口 / 配套工程说明 |
| `src/app.module.ts` | 根模块，imports AgentModule | 建立测试接口 |
| `src/llm/llm.module.ts` | providers + exports LlmService | 第一次让 LLM 自己选工具 |
| `src/llm/llm.service.ts` | OpenAI SDK 接 DeepSeek；chatWithTools()：tools + tool_choice 'auto'，**没有** response_format | 第一次让 LLM 自己选工具 / 坑一 |
| `src/tools/tools.schema.ts` | 两个 Tool 的 Schema（Definition，给模型看） | 模型怎么知道我们有哪些 Tool |
| `src/tools/tools.service.ts` | getWeather 模拟数据 / calculator 真实求值（Implementation，程序执行） | 准备两个最简单的 Tool |
| `src/tools/tools.module.ts` | providers + exports ToolsService | 准备两个最简单的 Tool |
| `src/agent/agent.module.ts` | imports [LlmModule, ToolsModule] | 建立测试接口 |
| `src/agent/agent.service.ts` | testToolCalling()：判空 → Type Narrowing → JSON.parse → switch 分发 → 回灌 → 二次调用 | 解析 Tool Call / 真正执行 Tool / 回灌 Context / 第二次调用 |
| `src/agent/agent.controller.ts` | POST /agent/tools-test | 建立测试接口 / 坑一 |

**注意**：本工程不含 mock——API Key 未配置时启动直接退出并打印中文提示，配置后调用才真正请求 DeepSeek。
