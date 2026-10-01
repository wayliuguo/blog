import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AgentModule } from './agent/agent.module'

@Module({
  // ConfigModule.forRoot() 会把项目根目录的 .env 读进 process.env。
  // 少了这一行，LlmService 里的 process.env.DEEPSEEK_API_KEY 永远是 undefined。
  // isGlobal: true 表示全应用可见，AgentModule 里不必再单独 import。
  imports: [ConfigModule.forRoot({ isGlobal: true }), AgentModule],
})
export class AppModule {}
