# agent-nest

《Agent 开发》第 1 篇《Agent 是什么：从接入大模型到让 LLM 参与决策》的配套工程：
把正文里的代码片段组装成的一个**完整可运行的 NestJS 项目**（NestJS + DeepSeek，OpenAI 兼容 SDK）。

## 运行

```bash
npm install
cp .env.example .env   # 填入你的 DEEPSEEK_API_KEY（platform.deepseek.com 申请）
npm start              # = tsc -p tsconfig.json && node dist/main.js，监听 http://localhost:3000
```

`.env` 里写哪个都认，优先 `DEEPSEEK_API_KEY`，回退 `OPENAI_API_KEY`：

```bash
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
# 或
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

### 两个必须知道的坑

1. **`.env` 不会自动进 `process.env`。** NestJS 不读它，`tsx`/`node` 也不读。必须显式加载：
   `src/main.ts` 顶部 `import 'dotenv/config'`（在 Nest 启动前灌入 `process.env`），
   `src/app.module.ts` 的 `ConfigModule.forRoot({ isGlobal: true })`（把配置纳入 Nest 模块体系）。
   少了前者，启动时 `LlmService` 拿到 `undefined` Key，OpenAI SDK 只会抛一句
   `Missing credentials. Please pass an apiKey...`——报的是 SDK，真因是没加载 `.env`。

2. **不要 `tsx src/main.ts` 跑本项目。** `tsx` 底层是 esbuild，而 esbuild 不支持 `emitDecoratorMetadata`，
   装饰器元数据缺失 → Nest 依赖注入解析不出来 → Controller/Service 里的实例全是 `undefined`，
   而且**启动期不报错**，等请求进来才抛 `Cannot read properties of undefined (reading 'handle')`。
   走 `tsc` 产物（`dist/`）才带 `design:paramtypes` 元数据。

## 接口

```bash
# 纯聊天：User → AgentController → AgentService → LlmService → DeepSeek
curl -X POST http://localhost:3000/agent/chat \
  -H "Content-Type: application/json" \
  -d '{ "message": "什么是 AI Agent？" }'

# 意图决策：LLM → Structured Output → Zod 校验 → switch 分发
curl -X POST http://localhost:3000/agent/intent \
  -H "Content-Type: application/json" \
  -d '{ "message": "帮我查一下西安今天的天气" }'
```

## 工程结构 ↔ 文章小节

| 文件 | 职责 | 对应小节 |
| ---- | ---- | ---- |
| `src/main.ts` | NestFactory 启动、监听 3000 | 组装 AgentModule 与第一个接口 |
| `src/app.module.ts` | 根模块，imports AgentModule | 组装 AgentModule 与第一个接口 |
| `src/llm/llm.module.ts` | providers + exports LlmService | 第一步架构决策 |
| `src/llm/llm.service.ts` | OpenAI SDK + baseURL 指向 DeepSeek；chat() / parseIntent() | 实现 LlmService / Structured Output |
| `src/llm/intent.types.ts` | 三种意图的 TypeScript 类型 | 定义 TypeScript 类型 |
| `src/llm/intent.schema.ts` | Zod discriminatedUnion 运行时校验 | 用 Zod 收口 |
| `src/agent/agent.module.ts` | imports [LlmModule]，组装 Controller/Service | 组装 AgentModule 与第一个接口 |
| `src/agent/agent.service.ts` | 注入 LlmService；handle() 意图分发 | 第一次让 LLM 参与程序决策 |
| `src/agent/agent.controller.ts` | POST /agent/chat 与 /agent/intent | 组装 AgentModule 与第一个接口 |

**后续篇目**：第 2 篇（Tool Calling）、第 3 篇（Agent Loop）的配套演示脚本见 `../agent-lab/`（零依赖镜像）；后续在这同一个工程上演进（新增 tools/、loop/ 等目录）时再迁入，当前仓库只包含第 1 篇的范围。

**注意**：本工程不含 mock——API Key 未配置时启动会直接退出并打印中文提示（见上面坑 1），配置后调用才会真正请求 DeepSeek。
