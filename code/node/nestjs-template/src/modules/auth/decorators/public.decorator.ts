/**
 * 公开接口装饰器，标记无需 JWT 认证即可访问的路由。
 * 由 JwtAuthGuard 守卫读取，标记了 @Public() 的路由将跳过 JWT 验证。
 *
 * 典型场景：注册、登录、令牌刷新、健康检查等无需认证的接口。
 */
import { SetMetadata } from '@nestjs/common'

/** 元数据键名，JwtAuthGuard 通过此键读取是否为公开路由 */
export const PUBLIC_KEY = 'public'

/** 标记接口为公开访问（跳过 JWT 认证守卫） */
export const Public = () => SetMetadata(PUBLIC_KEY, true)
