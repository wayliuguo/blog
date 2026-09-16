import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

/**
 * API 网关启动入口
 * 对外提供 HTTP 接口，监听 3000 端口
 * 网关本身不处理业务逻辑，而是通过 TCP 将请求转发给内部微服务
 */
async function bootstrap() {
    // 创建基于 Express 的 HTTP 应用
    const app = await NestFactory.create(AppModule)
    // 启动 HTTP 服务
    await app.listen(3000)
}
bootstrap()
