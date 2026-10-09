import { Injectable } from '@nestjs/common'
import OpenAI from 'openai'
import type {
    ChatCompletionMessageParam,
    ChatCompletionTool
} from 'openai/resources/chat/completions'

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

    // Tool Calling 专用：没有 response_format，也没有「你必须返回 JSON」的 Prompt——
    // 用 tools + tool_choice: 'auto' 把「用不用工具」的决策权交给模型。
    async chatWithTools(messages: ChatCompletionMessageParam[], tools: ChatCompletionTool[]) {
        const response = await this.client.chat.completions.create({
            model: 'deepseek-chat',
            messages,
            tools,
            tool_choice: 'auto'
        })

        return response.choices[0].message
    }
}
