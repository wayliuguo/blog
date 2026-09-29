// 所有工具遵循统一协议：名字、描述、参数 schema、执行函数。
export interface AgentTool {
  name: string
  description: string
  schema: unknown
  execute(args: Record<string, unknown>): Promise<unknown>
}

// 示例工具：真实实现会调用天气 API，这里返回固定结构以便脱离外部服务运行。
export class WeatherTool implements AgentTool {
  name = 'get_weather'
  description = '查询指定城市当前的天气信息'
  schema = { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] }

  async execute(args: Record<string, unknown>): Promise<unknown> {
    const { city } = args as { city: string }
    return { city, temperature: 35, weather: '晴', humidity: 48 }
  }
}
