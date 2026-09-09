import { NestFactory } from '@nestjs/core'
import { Transport, MicroserviceOptions } from '@nestjs/microservices'
import { UserModule } from './user.module'

/**
 * 用户微服务启动入口
 * 使用 TCP 传输协议，监听 3001 端口
 */
async function bootstrap() {
    // 创建基于 TCP 的微服务实例
    const app = await NestFactory.createMicroservice<MicroserviceOptions>(UserModule, {
        transport: Transport.TCP,
        options: {
            host: '127.0.0.1',
            port: 3001
        }
    })

    // 启动微服务，开始监听 TCP 连接
    await app.listen()
}
bootstrap()
