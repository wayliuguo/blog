import { Injectable } from '@nestjs/common'
import { LlmService } from '../llm/llm.service'
import { validateIntent } from '../llm/intent.schema'

@Injectable()
export class AgentService {
  constructor(private readonly llmService: LlmService) {}

  async chat(message: string) {
    return this.llmService.chat(message)
  }

  // 第一次让 LLM 参与程序决策：解析意图 → 校验 → switch 分发。
  async handle(message: string) {
    const intent = validateIntent(await this.llmService.parseIntent(message))

    switch (intent.intent) {
      case 'weather':
        return { action: 'getWeather', city: intent.city, date: intent.date }
      case 'calculator':
        return { action: 'calculate', expression: intent.expression }
      case 'chat':
        return { action: 'chat', message: intent.message }
    }
  }
}
