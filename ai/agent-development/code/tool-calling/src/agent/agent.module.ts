import { Module } from '@nestjs/common'
import { AgentController } from './agent.controller'
import { AgentService } from './agent.service'
import { LlmModule } from '../llm/llm.module'
import { ToolsModule } from '../tools/tools.module'

@Module({
    imports: [LlmModule, ToolsModule],
    controllers: [AgentController],
    providers: [AgentService]
})
export class AgentModule {}
