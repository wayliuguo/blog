import { Injectable } from '@nestjs/common'
import type {
    ChatCompletionMessageParam
} from 'openai/resources/chat/completions'
import { LlmService } from '../llm/llm.service'
import { tools } from '../tools/tools.schema'
import { ToolsService } from '../tools/tools.service'

@Injectable()
export class AgentService {
    constructor(
        private readonly llmService: LlmService,
        private readonly toolsService: ToolsService
    ) {}

    // 单轮 Tool Calling 完整闭环：
    // User → LLM → tool_calls → 程序执行 → assistant(tool_calls) + tool(result) 回灌 → 二次调用 → Final Answer
    async testToolCalling(userMessage: string) {
        const messages: ChatCompletionMessageParam[] = [
            { role: 'system', content: '你是一个 AI Agent。需要外部数据时调用工具，不要虚构数据。' },
            { role: 'user', content: userMessage }
        ]

        // 第一次调用：模型决定「调什么、传什么」
        const assistantMessage = await this.llmService.chatWithTools(messages, tools)

        // 模型不一定每次都调工具：没有 tool_calls 就直接返回文本（判空分支）
        const toolCalls = assistantMessage.tool_calls
        if (!toolCalls?.length) {
            return assistantMessage.content ?? ''
        }

        const toolCall = toolCalls[0]
        // 新版 SDK 的 tool_calls 是联合类型：只有 function 型才有 function 字段 → Type Narrowing
        if (toolCall.type !== 'function') {
            throw new Error(`暂不支持的工具类型: ${toolCall.type}`)
        }

        // function.arguments 是 JSON 字符串，真正需要 JSON.parse 的地方在这里
        const args = JSON.parse(toolCall.function.arguments) as {
            city?: string
            expression?: string
        }

        // 模型已经做了决定，程序只负责按名字分发执行（Tool Dispatcher，不是 Intent Router）
        let result: unknown
        switch (toolCall.function.name) {
            case 'getWeather':
                result = this.toolsService.getWeather(args.city ?? '')
                break
            case 'calculator':
                result = this.toolsService.calculator(args.expression ?? '')
                break
            default:
                throw new Error(`未知工具: ${toolCall.function.name}`)
        }

        // 关键时序：assistant(tool_calls) 这条消息本身也是 Context 的一部分，
        // 必须在 tool 结果之前放回去——模型需要知道「刚才是我自己决定调用的」
        messages.push({ role: 'assistant', content: assistantMessage.content ?? '', tool_calls: toolCalls })

        // tool 结果消息三要素：role: 'tool' + tool_call_id（与 call 的 id 配对）+ JSON 字符串内容
        messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result)
        })

        // 第二次调用：模型看到完整链路（问题 → 我的决策 → 工具结果）→ 生成最终回答
        const final = await this.llmService.chatWithTools(messages, tools)
        return final.content ?? ''
    }
}
