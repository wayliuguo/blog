// Tool Registry：把「名字 → 工具」的查找、Zod 参数校验、执行、错误处理收敛到一处。
// 错误不抛 500，而是作为结构化 Observation 返回给模型 → Self-Correction。
import { z } from 'zod'

export interface AgentTool {
  name: string
  description: string
  schema: z.ZodType
  execute(args: Record<string, unknown>): Promise<unknown> | unknown
}

const WeatherArgsSchema = z.object({
  city: z.string().min(1).describe('城市名称，例如西安、北京、上海'),
})

const weatherTool: AgentTool = {
  name: 'get_weather',
  description: '查询指定城市当前的天气信息',
  schema: WeatherArgsSchema,
  execute(args) {
    return { city: args.city, temperature: 35, weather: '晴', humidity: 48 }
  },
}

export type ToolResult =
  | { success: true; data: unknown }
  | { success: false; error: string; details?: unknown }

export class ToolRegistry {
  private readonly tools = new Map<string, AgentTool>()

  register(tool: AgentTool): void {
    this.tools.set(tool.name, tool)
  }

  getTool(name: string): AgentTool | undefined {
    return this.tools.get(name)
  }

  // 给 LLM 的 Tool Definition：由 Zod Schema 自动生成 JSON Schema（一源两用）
  getDefinitions() {
    return [...this.tools.values()].map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: z.toJSONSchema(tool.schema),
      },
    }))
  }

  // Tool Runtime：查找 → 校验 → 执行 → 错误处理，四步统一收口
  async invoke(toolName: string, args: unknown): Promise<ToolResult> {
    const tool = this.getTool(toolName)
    if (!tool) {
      return { success: false, error: `Tool 不存在: ${toolName}` }
    }
    try {
      const parsed = tool.schema.parse(args)
      const data = await tool.execute(parsed as Record<string, unknown>)
      return { success: true, data }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: 'Tool 参数校验失败',
          details: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        }
      }
      return { success: false, error: error instanceof Error ? error.message : 'Tool 执行失败' }
    }
  }
}

async function main() {
  const registry = new ToolRegistry()
  registry.register(weatherTool)

  console.log('== Tool Registry：查找 / 校验 / 执行 / 错误处理')
  console.log('给 LLM 的 Definition（Zod 自动生成）：')
  console.log(' ', JSON.stringify(registry.getDefinitions()[0].function.parameters))

  console.log('第一轮：模型传来坏参数 { city: 123 }')
  const bad = await registry.invoke('get_weather', { city: 123 })
  console.log('  返回（错误即 Observation）：', JSON.stringify(bad))
  console.log('  → 把这个错误原样 push 进 messages，模型下一轮会自行修正')

  console.log('第二轮：模型修正后传来 { city: "西安" }')
  const good = await registry.invoke('get_weather', { city: '西安' })
  console.log('  返回：', JSON.stringify(good))

  console.log('查无此工具：', JSON.stringify(await registry.invoke('nope', {})))
}

main()
