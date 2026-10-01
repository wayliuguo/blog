import { Module } from '@nestjs/common'
import { AgentController } from './agent.controller'
import { AgentService } from './agent.service'
import { LlmModule } from '../llm/llm.module'

@Module({
  imports: [LlmModule],
  controllers: [AgentController],
  providers: [AgentService],
})
export class AgentModule {}
