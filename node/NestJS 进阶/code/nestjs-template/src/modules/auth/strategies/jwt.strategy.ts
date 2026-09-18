/**
 * JWT 验证策略 — Passport 策略的具体实现，定义 JWT 的提取和验证方式。
 *
 * 策略配置：
 * - 从请求头 Authorization: Bearer <token> 中提取 JWT
 * - 使用配置中的 jwtSecret 验证签名
 * - 验证通过后调用 validate 方法进行二次校验（Redis 黑名单检查）
 * - 启用 passReqToCallback 以便在 validate 中访问原始请求对象提取原始 token
 */
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import type { Request } from 'express'

import { ISecurityConfig } from '~/config/configuration'
import { RedisService } from '~/shared/redis/redis.service'

/** Token 黑名单 Redis 键前缀，格式 token:blacklist:{accessToken} */
const TOKEN_BLACKLIST_PREFIX = 'token:blacklist:'

/** JWT payload 类型定义，与 AuthService.generateTokens 中 jwtService.sign 的参数一致 */
interface JwtPayload {
    /** 用户 ID（对应数据库自增主键） */
    sub: number
    /** 用户邮箱 */
    email: string
    /** 角色，默认 'user' */
    role: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly configService: ConfigService,
        private readonly redisService: RedisService
    ) {
        super({
            // 从 Authorization: Bearer <token> 提取 JWT
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            // 不忽略过期时间，过期 token 直接拒绝
            ignoreExpiration: false,
            secretOrKey: configService.get<ISecurityConfig>('security')!.jwtSecret,
            // 将原始 Request 传入 validate，便于提取原始 token 做黑名单检查
            passReqToCallback: true
        })
    }

    /**
     * 验证通过签名后的二次校验。
     * 解析出原始 token，检查其是否已登出（加入 Redis 黑名单），
     * 返回的用户对象会被注入到 request.user 上，供后续 Guard / Controller 使用。
     */
    async validate(request: Request, payload: JwtPayload) {
        const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request)
        if (!token) {
            throw new UnauthorizedException('未提供认证令牌')
        }

        // 黑名单检查：登出的 token 即使未过期也拒绝
        const blacklisted = await this.redisService.exists(`${TOKEN_BLACKLIST_PREFIX}${token}`)
        if (blacklisted) {
            throw new UnauthorizedException('令牌已失效')
        }

        return {
            id: payload.sub,
            email: payload.email,
            role: payload.role || 'user'
        }
    }
}
