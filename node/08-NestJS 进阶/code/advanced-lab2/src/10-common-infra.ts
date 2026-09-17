/**
 * 10 - 项目模板：公共基础设施（统一响应 / 统一异常 / 全局校验）
 *
 * 把 nestjs-template 里的 common 三件套抽出来跑一遍，验证：
 *   1. TransformInterceptor 把控制器返回值包成 { code, data, message }
 *   2. AllExceptionsFilter 兜住所有异常，且 500 只在非开发环境隐藏细节
 *   3. ValidationPipe 校验失败返回 422，并复用同一套响应结构
 *
 * 与模板的差异只有两处：去掉 ~ 路径别名；异常过滤器不再注入 winston 日志器，
 * 改用 Nest 自带的 Logger（保持本脚本零外部依赖可跑）。
 *
 * 运行：npm run 10infra
 */
process.env.NODE_ENV = process.env.NODE_ENV ?? 'development'

import 'reflect-metadata'
import { request } from 'node:http'

import {
    ArgumentsHost,
    BadRequestException,
    Body,
    CallHandler,
    Catch,
    Controller,
    ExecutionContext,
    ExceptionFilter,
    Get,
    HttpException,
    HttpStatus,
    Injectable,
    Logger,
    Module,
    NestInterceptor,
    Post,
    UnprocessableEntityException,
    ValidationPipe
} from '@nestjs/common'
import { APP_FILTER, APP_INTERCEPTOR, NestFactory } from '@nestjs/core'
import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

/** 与模板的 isDev 一致：只有开发环境才把内部错误消息透出去 */
let isDev = process.env.NODE_ENV === 'development'

// ====== 统一响应模型（模板：src/common/dto/api-response.dto.ts）======

/** 成功响应业务码 */
export const RESPONSE_SUCCESS_CODE = 0
/** 成功响应默认消息 */
export const RESPONSE_SUCCESS_MSG = 'success'

/** 统一响应结构 { code, data, message } */
export class ResOp<T = any> {
    @ApiProperty({ type: 'object', additionalProperties: true })
    data?: T | null

    @ApiProperty({ type: 'number', default: RESPONSE_SUCCESS_CODE })
    code: number

    @ApiProperty({ type: 'string', default: RESPONSE_SUCCESS_MSG })
    message: string

    constructor(code: number, data: T | null, message: string = RESPONSE_SUCCESS_MSG) {
        this.code = code
        this.data = data
        this.message = message
    }
}

// ====== 全局响应拦截器（模板：src/common/interceptors/transform.interceptor.ts）======

@Injectable()
export class TransformInterceptor<T = any> implements NestInterceptor<T, ResOp> {
    intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ResOp> {
        return next.handle().pipe(
            // 统一包装为 { code: 0, data, message: 'success' } 格式
            // data 为 null/undefined 时兜底为 null
            map(data => new ResOp(RESPONSE_SUCCESS_CODE, data ?? null))
        )
    }
}

// ====== 全局异常过滤器（模板：src/common/filters/all-exceptions.filter.ts）======

/** 用于从未知异常中提取状态和消息的接口 */
interface ErrLike {
    readonly status?: number
    readonly statusCode?: number
    readonly message?: string
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name)

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp()
        const request = ctx.getRequest<{ url: string }>()
        const response = ctx.getResponse<{ setHeader: Function; status: Function; json: Function }>()

        const url = request.url
        const status = this.getStatus(exception)
        let message = this.getMessage(exception)

        // 500 错误降级：非开发环境隐藏内部细节
        if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
            this.logger.error(exception, undefined, 'Catch')
            if (!isDev) message = '服务繁忙，请稍后再试'
        } else {
            this.logger.warn(`(${status}) ${message} Path: ${decodeURIComponent(url)}`)
        }

        // 统一响应格式：异常时 code 取 HTTP 状态码
        const resBody = {
            code: status,
            message,
            data: null
        }

        response.setHeader('Content-Type', 'application/json; charset=utf-8').status(status).json(resBody)
    }

    private getStatus(exception: unknown): number {
        if (exception instanceof HttpException) {
            return exception.getStatus()
        }
        return (exception as ErrLike)?.status ?? (exception as ErrLike)?.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR
    }

    private getMessage(exception: unknown): string {
        if (exception instanceof HttpException) {
            const res = exception.getResponse()
            if (typeof res === 'string') return res
            if (typeof res === 'object' && res !== null) {
                const msg = (res as Record<string, unknown>).message
                if (typeof msg === 'string') return msg
                if (Array.isArray(msg)) return msg.join('; ')
            }
            return exception.message
        }
        if (typeof exception === 'object' && exception !== null) {
            return (exception as ErrLike).message ?? String(exception)
        }
        return String(exception)
    }
}

// ====== 业务代码 ======

class CreateUserDto {
    @IsEmail({}, { message: '邮箱格式不正确' })
    @IsNotEmpty({ message: '邮箱不能为空' })
    email: string

    @IsString({ message: '用户名必须为字符串' })
    @MaxLength(64, { message: '用户名最长 64 个字符' })
    username: string
}

@Controller('demo')
class DemoController {
    @Get('ok')
    ok() {
        return { id: 1, username: '张三' }
    }

    @Get('empty')
    empty() {
        return null
    }

    @Get('boom')
    boom() {
        throw new BadRequestException('参数不合法')
    }

    @Get('crash')
    crash() {
        throw new Error('数据库连接失败：ECONNREFUSED 127.0.0.1:3306')
    }

    @Post('users')
    create(@Body() dto: CreateUserDto) {
        return { id: 2, ...dto }
    }
}

@Module({
    controllers: [DemoController],
    providers: [
        // 全局异常过滤器（最先）
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
        // 全局响应包装拦截器
        { provide: APP_INTERCEPTOR, useClass: TransformInterceptor }
    ]
})
class InfraModule {}

// ====== 演示 ======

function call(port: number, method: string, path: string, body?: unknown) {
    return new Promise<{ status: number; body: string }>((resolve, reject) => {
        const payload = body === undefined ? null : JSON.stringify(body)
        const req = request(
            { host: '127.0.0.1', port, method, path, headers: payload ? { 'content-type': 'application/json' } : {} },
            res => {
                let text = ''
                res.on('data', c => (text += c))
                res.on('end', () => resolve({ status: res.statusCode!, body: text }))
            }
        )
        req.on('error', reject)
        if (payload) req.write(payload)
        req.end()
    })
}

async function main() {
    const app = await NestFactory.create(InfraModule, { logger: false })

    // 与模板 main.ts 一致：transform + whitelist + 校验失败返回 422
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

    await app.listen(0, '127.0.0.1')
    const port = (app.getHttpServer().address() as { port: number }).port

    const show = async (method: string, path: string, body?: unknown) => {
        const res = await call(port, method, path, body)
        console.log(`  ${(method + ' ' + path).padEnd(22)} -> ${res.status} ${res.body}`)
    }

    console.log(`=== 统一响应格式（TransformInterceptor）===  [NODE_ENV=${process.env.NODE_ENV}]`)
    await show('GET', '/demo/ok')
    await show('GET', '/demo/empty')

    console.log('\n=== 统一异常（AllExceptionsFilter）===')
    await show('GET', '/demo/boom')
    await show('GET', '/demo/crash')

    console.log('\n=== 全局校验管道（ValidationPipe，校验失败 422）===')
    await show('POST', '/demo/users', { email: 'not-an-email', username: '张三' })
    await show('POST', '/demo/users', { email: 'zhangsan@example.com', username: '张三', nickname: '多出来的字段' })

    await app.close()

    console.log('\n=== 同一个 500，把 isDev 切成 false（相当于 NODE_ENV=production）===')
    isDev = false
    const prod = await NestFactory.create(InfraModule, { logger: false })
    await prod.listen(0, '127.0.0.1')
    const prodPort = (prod.getHttpServer().address() as { port: number }).port
    const res = await call(prodPort, 'GET', '/demo/crash')
    console.log(`  GET /demo/crash        -> ${res.status} ${res.body}`)
    await prod.close()
}

void main()
