// 把可用工具以 OpenAI 兼容的 function schema 形式告诉模型。
// 注意：是"这里有一个可调用工具"，不是"请返回意图 JSON"。
export const tools = [
    {
        type: 'function' as const,
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
        type: 'function' as const,
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
