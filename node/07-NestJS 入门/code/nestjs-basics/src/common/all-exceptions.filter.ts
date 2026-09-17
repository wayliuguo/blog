import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common'
import { Response } from 'express'

@Catch() // 不指定类型，捕获所有异常
export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp()
        const response = ctx.getResponse<Response>()

        let status = 500
        let message = '服务器内部错误'

        if (exception instanceof HttpException) {
            status = exception.getStatus()
            message = exception.message
        }

        response.status(status).json({
            code: status,
            message,
            timestamp: new Date().toISOString()
        })
    }
}
