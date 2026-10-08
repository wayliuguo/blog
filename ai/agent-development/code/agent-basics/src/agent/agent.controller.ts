import { BadRequestException, Body, Controller, Post } from '@nestjs/common'
import { AgentService } from './agent.service'

@Controller('agent')
export class AgentController {
    constructor(private readonly agentService: AgentService) {}

    @Post('chat')
    async chat(@Body('message') message: string) {
        if (!message) {
            throw new BadRequestException('message 不能为空')
        }

        const result = await this.agentService.chat(message)
        return { message: result }
    }

    @Post('intent')
    async intent(@Body('message') message: string) {
        if (!message) {
            throw new BadRequestException('message 不能为空')
        }

        return this.agentService.handle(message)
    }
}
