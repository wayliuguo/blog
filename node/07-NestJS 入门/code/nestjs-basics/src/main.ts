import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { AuthGuard } from './common/auth.guard'
import { HttpExceptionFilter } from './common/http-exception.filter'
import { TimingInterceptor } from './common/timing.interceptor'

async function bootstrap() {
    const app = await NestFactory.create(AppModule)

    // 方式三：Express 原生中间件（绕过 Nest 的组件体系，全局生效）
    app.use((req: any, res: any, next: any) => {
        res.setHeader('X-Powered-By', 'nestjs-basics')
        next()
    })

    // 方式二：全局注册——写法简单，但 new 出来的实例拿不到依赖注入
    app.useGlobalGuards(new AuthGuard())
    app.useGlobalInterceptors(new TimingInterceptor())
    app.useGlobalFilters(new HttpExceptionFilter())

    // 全局管道：DTO 校验 + 类型转换
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true, // 自动剔除 DTO 中未定义的字段
            forbidNonWhitelisted: true, // 发现未定义字段则拒绝请求
            transform: true, // 自动类型转换（"1" → 1）
            disableErrorMessages: false // 生产环境设为 true 隐藏错误详情
        })
    )

    // 让 onApplicationShutdown 这类应用生命周期钩子在收到信号时生效
    app.enableShutdownHooks()

    await app.listen(3000)
    console.log('nestjs-basics 运行在 http://localhost:3000')
}

bootstrap()
