/**
 * 应用启动入口
 *
 * 负责 NestJS 应用的初始化、全局配置和启动。
 *
 * 启动流程：
 * 1. 创建 NestJS 应用实例（基于 Express 平台）
 * 2. 注册 class-validator 的依赖注入容器（使自定义 validator 可注入服务）
 * 3. 配置 CORS（开发环境允许所有来源）
 * 4. 设置全局路由前缀（默认 /api）
 * 5. 注册全局参数校验管道（ValidationPipe，校验失败返回 422）
 * 6. 注册全局异常过滤器（AllExceptionsFilter，统一异常响应）
 * 7. 注册全局响应拦截器（TransformInterceptor，统一响应格式）
 * 8. 配置静态资源服务（/uploads）
 * 9. 设置 Swagger 文档（可通过 SWAGGER_ENABLE 关闭）
 * 10. 监听 0.0.0.0 端口启动服务（支持 Docker 容器与外部网络访问）
 */
import 'reflect-metadata'
import { resolve } from 'node:path'

import { HttpStatus, Logger, UnprocessableEntityException, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { useContainer } from 'class-validator'

import { AppModule } from './app.module'
import { ISwaggerConfig } from '~/config/configuration'
import { AllExceptionsFilter } from '~/common/filters/all-exceptions.filter'
import { TransformInterceptor } from '~/common/interceptors/transform.interceptor'

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule)

    const configService = app.get(ConfigService)
    const port = configService.get<number>('app.port')!
    const swagger = configService.get<ISwaggerConfig>('swagger')!

    // 使 class-validator 的自定义 validator 能使用 NestJS 依赖注入
    // fallbackOnErrors: 容器解析失败时回退到普通实例化
    useContainer(app.select(AppModule), { fallbackOnErrors: true })

    // ====== CORS 配置 ======
    app.enableCors({ credentials: true })

    // ====== 全局参数校验管道 ======
    // transform: 自动将 query 参数转换为 DTO 定义的类型
    // whitelist: 自动剔除未在 DTO 中定义的属性
    // exceptionFactory: 提取第一个校验约束消息，返回 422
    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            transformOptions: { enableImplicitConversion: true },
            errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
            stopAtFirstError: true,
            exceptionFactory: errors =>
                new UnprocessableEntityException(errors.map(e => Object.values(e.constraints ?? {})[0])[0])
        })
    )

    // ====== 全局异常过滤器 & 响应拦截器 ======
    app.useGlobalFilters(new AllExceptionsFilter())
    app.useGlobalInterceptors(new TransformInterceptor())

    // ====== 静态资源服务 ======
    // dist/src → 往上一级到项目根 → uploads/
    // nosniff 阻止浏览器嗅探内容类型，作为上传目录的纵深防御
    const uploadsPath = resolve(__dirname, '..', 'uploads')
    app.useStaticAssets(uploadsPath, {
        setHeaders: res => {
            res.setHeader('X-Content-Type-Options', 'nosniff')
            res.setHeader('Content-Disposition', 'inline')
        }
    })

    // ====== Swagger API 文档 ======
    if (swagger.enable) {
        const config = new DocumentBuilder()
            .setTitle('NestJS Template API')
            .setDescription('NestJS 项目模板接口文档')
            .setVersion('1.0')
            // JWT Bearer Auth，与控制器上的 @ApiBearerAuth() 配合
            .addBearerAuth()
            .build()
        const document = SwaggerModule.createDocument(app, config)
        SwaggerModule.setup(swagger.path, app, document)
    }

    // 监听 0.0.0.0 以支持 Docker 容器和外部网络访问
    await app.listen(port, '0.0.0.0')

    const logger = new Logger('Bootstrap')
    logger.log(`Server running on http://localhost:${port}`)
}

void bootstrap()
