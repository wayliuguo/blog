import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Observable } from 'rxjs'

@Injectable()
export class AuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        // 拿到当前 HTTP 请求对象
        const request = context.switchToHttp().getRequest()

        // 关键能力：拿到"即将执行的 Handler"和"所属 Controller 类"
        const handler = context.getHandler() // 具体的方法（如 findAll）
        const controllerClass = context.getClass() // 所属的 Controller 类

        const token = request.headers.authorization
        if (!token) return false

        // 同一请求可能被全局 + 路由级注册的 AuthGuard 各调用一次，这里只认第一次
        if (!request.user) {
            // 因为能拿到 handler / controllerClass，这里可以按路由粒度做审计与鉴权
            console.log(`[AuthGuard] ${controllerClass.name}.${handler.name} ← ${request.method} ${request.url}`)

            // 验证 token...（演示用：真实项目里换成 jwt.verify(token, secret)）
            request.user = { id: 1, name: 'demo', roles: ['admin'] }
        }
        return true
    }
}
