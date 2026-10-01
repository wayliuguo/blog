// 必须放在第一行：在 Nest 启动之前把根目录 .env 灌进 process.env。
// 否则 NestFactory.create() → LlmService 构造时读到的是 undefined，
// OpenAI SDK 只会抛一句英文 "Missing credentials"，看不出真正原因。
import 'dotenv/config'

import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  // 启动前自检 Key
  if (!process.env.DEEPSEEK_API_KEY && !process.env.OPENAI_API_KEY) {
    console.error('\n[配置缺失] 未检测到 API Key。')
    console.error('  请在项目根目录 .env 中写入（Key 在 platform.deepseek.com 申请）：')
    console.error('    DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx\n')
    process.exit(1)
  }

  const app = await NestFactory.create(AppModule)
  await app.listen(3000)
}

void bootstrap()
