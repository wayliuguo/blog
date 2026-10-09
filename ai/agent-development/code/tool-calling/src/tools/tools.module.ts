import { Module } from '@nestjs/common'
import { ToolsService } from './tools.service'

@Module({
    // exports：AgentModule 要注入 ToolsService，不导出就注入不进来
    providers: [ToolsService],
    exports: [ToolsService]
})
export class ToolsModule {}
