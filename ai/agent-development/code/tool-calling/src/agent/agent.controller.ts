import { BadRequestException, Body, Controller, Post } from '@nestjs/common'
import { AgentService } from './agent.service'

@Controller('agent')
export class AgentController {
    constructor(private readonly agentService: AgentService) {}

    // Tool Calling 测试接口：与上一篇 Structured Output 的 /agent/intent 链路彻底分开
    @Post('tools-test')
    async testToolCalling(@Body('message') message: string) {
        if (!message) {
            throw new BadRequestException('message 不能为空')
        }

        return { message: await this.agentService.testToolCalling(message) }
    }
}
