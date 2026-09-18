/**
 * 全局异常过滤器
 *
 * 捕获所有未处理的异常，统一响应格式为 { code, message, data }。
 *
 * 异常处理策略：
 * - HttpException：返回其 HTTP 状态码与消息（业务异常如 401/422/409）
 * - QueryFailedError（数据库错误）：按 500 处理
 * - 其他未知异常：按 500 处理
 *
 * 500 错误降级策略：
 * - 开发环境：返回原始错误消息，便于调试
 * - 生产环境：返回通用错误消息 "服务繁忙，请稍后再试"，避免暴露内部细节
 */
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { Request, Response } from 'express'
import { QueryFailedError } from 'typeorm'

import { isDev } from '~/config/configuration'

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
        const request = ctx.getRequest<Request>()
        const response = ctx.getResponse<Response>()

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

    /**
     * 从异常中提取 HTTP 状态码
     * - HttpException：使用其 getStatus()
     * - QueryFailedError：视为 500 服务端错误
     * - 其他：尝试从 status/statusCode 属性提取，兜底为 500
     */
    private getStatus(exception: unknown): number {
        if (exception instanceof HttpException) {
            return exception.getStatus()
        }
        if (exception instanceof QueryFailedError) {
            return HttpStatus.INTERNAL_SERVER_ERROR
        }
        return (exception as ErrLike)?.status ?? (exception as ErrLike)?.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR
    }

    /**
     * 从异常中提取错误消息
     * - HttpException：优先从 response.message 提取（支持数组形式，如 ValidationPipe）
     * - QueryFailedError：使用其 message
     * - 对象类型：从 message 属性提取，兜底为 String()
     */
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
        if (exception instanceof QueryFailedError) {
            return exception.message
        }
        if (typeof exception === 'object' && exception !== null) {
            return (exception as ErrLike).message ?? String(exception)
        }
        return String(exception)
    }
}
