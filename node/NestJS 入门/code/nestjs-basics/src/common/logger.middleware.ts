import { Injectable, NestMiddleware } from '@nestjs/common'
import { NextFunction, Request, Response } from 'express'

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        // 用 originalUrl 而不是 url：Express 挂载中间件时会把 url 重写成相对路径
        console.log(`[LoggerMiddleware] ${req.method} ${req.originalUrl}`)
        next()
    }
}

// 纯函数，不需要 @Injectable()；不依赖注入时用这种写法更轻量
export function logger(req: Request, res: Response, next: NextFunction) {
    console.log(`[functional] ${req.method} ${req.originalUrl}`)
    next()
}
