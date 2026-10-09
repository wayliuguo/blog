import type { ChatCompletionTool } from 'openai/resources/chat/completions'

// Tool Schema 三要素：Name / Description / Parameters（JSON Schema 风格）。
// 这是 Tool Definition（给模型看），不是 Tool Implementation（程序里真正执行的函数）。
export const tools: ChatCompletionTool[] = [
    {
        type: 'function',
        function: {
            name: 'getWeather',
            description: '查询指定城市的天气',
            parameters: {
                type: 'object',
                properties: {
                    city: { type: 'string', description: '城市名称，例如西安、北京' }
                },
                required: ['city']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'calculator',
            description: '计算数学表达式',
            parameters: {
                type: 'object',
                properties: {
                    expression: { type: 'string', description: '数学表达式，例如 123 * 456' }
                },
                required: ['expression']
            }
        }
    }
]
