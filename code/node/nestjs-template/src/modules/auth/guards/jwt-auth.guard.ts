/**
 * JWT 认证守卫 — 拦截所有请求，验证请求头中的 Bearer Token。
 *
 * 守卫逻辑：
 * 1. 检查路由是否标记了 @Public() 装饰器，若是则跳过认证
 * 2. 否则委托 Passport JWT 策略验证 token 有效性（含签名校验 + 黑名单检查）
 * 3. 验证失败时抛出 UnauthorizedException，由全局异常过滤器统一格式化响应
 *
 * 此守卫通过 AppModule 的 APP_GUARD 全局注册，对所有路由生效。
 */
import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthGuard } from '@nestjs/passport'

import { PUBLIC_KEY } from '../decorators/public.decorator'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private readonly reflector: Reflector) {
        super()
    }

    /**
     * 判断当前请求是否需要认证。
     * 先读取 @Public() 元数据，标记为公开则直接放行；
     * 否则调用父类 AuthGuard('jwt') 的 canActivate 执行 JWT 验证。
     */
    canActivate(context: ExecutionContext) {
        const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
            context.getHandler(),
            context.getClass()
        ])

        if (isPublic) return true

        return super.canActivate(context)
    }

    /**
     * 处理 JWT 验证结果：验证失败或用户不存在时抛出 UnauthorizedException。
     *
     * 重写此方法是为了统一错误格式，将 Passport 内部错误转为标准的 401 响应，
     * info 携带具体原因（如 token 过期 / 签名无效），便于前端排查。
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handleRequest(err: Error | null, user: any, info: unknown) {
        if (err || !user) {
            const reason = info instanceof Error ? info.message : ''
            throw new UnauthorizedException(`认证失败${reason ? ': ' + reason : ''}`)
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return user
    }
}
