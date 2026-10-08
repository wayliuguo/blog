import { Injectable } from '@nestjs/common'
import OpenAI from 'openai'

@Injectable()
export class LlmService {
    private readonly client: OpenAI

    constructor() {
        // 优先 DeepSeek 变量名，回退 OpenAI 变量名
        const apiKey = process.env.DEEPSEEK_API_KEY ?? process.env.OPENAI_API_KEY
        if (!apiKey) {
            throw new Error(
                '未找到 API Key：请在项目根目录 .env 中写入 DEEPSEEK_API_KEY=sk-...（也可写 OPENAI_API_KEY），' +
                    ' Key 在 platform.deepseek.com 申请。'
            )
        }

        // 调用链：NestJS → LlmService → OpenAI SDK → DeepSeek API → LLM
        this.client = new OpenAI({
            apiKey,
            baseURL: 'https://api.deepseek.com'
        })
    }

    async chat(message: string) {
        const response = await this.client.chat.completions.create({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: '你是一个专业的 AI Agent 助手。' },
                { role: 'user', content: message }
            ]
        })

        return response.choices[0].message.content
    }

    async parseIntent(message: string) {
        const response = await this.client.chat.completions.create({
            model: 'deepseek-chat',
            messages: [
                {
                    role: 'system',
                    content: `你是一个用户意图分析器。你必须以 JSON 格式返回结果。
支持以下 intent：
weather: { "intent": "weather", "city": "城市", "date": "日期" }
calculator: { "intent": "calculator", "expression": "数学表达式" }
chat: { "intent": "chat", "message": "用户原始消息" }
只返回 JSON。`
                },
                { role: 'user', content: message }
            ],
            response_format: { type: 'json_object' }
        })

        const content = response.choices[0].message.content
        if (!content) {
            throw new Error('模型返回内容为空')
        }

        return JSON.parse(content) as unknown
    }
}
