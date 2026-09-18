/**
 * 认证服务 — 注册、登录、令牌刷新、登出。
 *
 * 安全设计：
 * - 密码使用 bcrypt 加盐哈希存储，不可逆。
 * - Access Token 为 JWT（不存储），登出时通过 Redis 黑名单撤销。
 * - Refresh Token 为随机字符串，以 SHA-256 哈希为 key 存入 Redis，
 *   不存明文，TTL = refreshExpires；刷新时轮换（旧 token 删除后颁发新对）。
 */
import { ConflictException, Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { createHash, randomBytes } from 'crypto'
import * as bcrypt from 'bcrypt'
import { Repository } from 'typeorm'

import { ISecurityConfig } from '~/config/configuration'
import { User } from '~/modules/users/user.entity'
import { RedisService } from '~/shared/redis/redis.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto, RefreshTokenDto } from './dto/login.dto'

/** Token 黑名单 Redis 键前缀，格式 token:blacklist:{accessToken} */
const TOKEN_BLACKLIST_PREFIX = 'token:blacklist:'
/** Refresh Token Redis 键前缀，格式 token:refresh:{sha256hash} */
const REFRESH_TOKEN_PREFIX = 'token:refresh:'
/** bcrypt 加盐轮数（10 轮约 100ms，兼顾安全与性能） */
const BCRYPT_ROUNDS = 10

/** Refresh Token 在 Redis 中存储的 payload 结构 */
interface RefreshTokenPayload {
    userId: number
    email: string
    role: string
}

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name)

    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly redisService: RedisService
    ) {}

    /**
     * 用户注册：邮箱唯一校验 → bcrypt 哈希密码 → 入库。
     * @returns 不含密码的用户基本信息
     */
    async register(dto: RegisterDto) {
        const exists = await this.userRepo.findOne({
            where: { email: dto.email }
        })
        if (exists) throw new ConflictException('该邮箱已注册')

        const password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS)
        const user = this.userRepo.create({
            email: dto.email,
            username: dto.username,
            password,
            role: 'user'
        })
        await this.userRepo.save(user)

        this.logger.log(`用户注册成功: ${user.email}`)
        return {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role
        }
    }

    /**
     * 用户登录：按邮箱查找用户并校验密码，校验通过签发令牌对。
     * 密码比对使用 bcrypt.compare（常量时间比较，防时序攻击）。
     */
    async login(dto: LoginDto) {
        const user = await this.userRepo.findOne({ where: { email: dto.email } })
        if (!user) throw new UnauthorizedException('邮箱或密码错误')

        const ok = await bcrypt.compare(dto.password, user.password)
        if (!ok) throw new UnauthorizedException('邮箱或密码错误')

        return this.generateTokens(user)
    }

    /**
     * 刷新令牌：用 refreshToken 换取新的令牌对。
     * 以 SHA-256 哈希为 key 从 Redis 取出 payload，校验用户存在后，
     * 删除旧 refresh token（轮换）并颁发新令牌对。
     */
    async refresh(dto: RefreshTokenDto) {
        const hash = this.sha256(dto.refreshToken)
        const payload = await this.redisService.get<RefreshTokenPayload>(`${REFRESH_TOKEN_PREFIX}${hash}`)
        if (!payload) {
            throw new UnauthorizedException('刷新令牌无效或已过期')
        }

        const user = await this.userRepo.findOne({
            where: { id: payload.userId }
        })
        if (!user) throw new UnauthorizedException('用户不存在')

        // 轮换：删除旧 refresh token 后颁发新令牌对，避免重放
        await this.redisService.del(`${REFRESH_TOKEN_PREFIX}${hash}`)
        return this.generateTokens(user)
    }

    /**
     * 用户登出：将 access token 加入 Redis 黑名单（TTL = 剩余有效期），
     * 并删除其 refresh token。token 已过期时无需加黑名单。
     */
    async logout(accessToken: string, refreshToken?: string) {
        if (refreshToken) {
            await this.redisService.del(`${REFRESH_TOKEN_PREFIX}${this.sha256(refreshToken)}`)
        }

        try {
            const decoded = this.jwtService.verify<{ exp: number }>(accessToken, {
                ignoreExpiration: false
            })
            const remaining = decoded.exp - Math.floor(Date.now() / 1000)
            if (remaining > 0) {
                await this.redisService.set(`${TOKEN_BLACKLIST_PREFIX}${accessToken}`, '1', remaining)
            }
        } catch (err) {
            // token 已过期则无需加入黑名单，其余异常记录告警
            if ((err as Error)?.name !== 'TokenExpiredError') {
                this.logger.warn(`登出时解析 token 失败: ${(err as Error).message}`)
            }
        }
    }

    /**
     * 生成 access + refresh 令牌对。
     * - accessToken：JWT，payload 为 { sub, email, role }，不存储。
     * - refreshToken：随机 32 字节 hex，以 SHA-256 哈希为 key 存入 Redis，
     *   携带用户信息，TTL = refreshExpires。
     */
    private async generateTokens(user: User) {
        const { jwtExpires, refreshExpires } = this.configService.get<ISecurityConfig>('security')!

        const payload = { sub: user.id, email: user.email, role: user.role }
        const accessToken = this.jwtService.sign(payload)

        const refreshToken = randomBytes(32).toString('hex')
        const hash = this.sha256(refreshToken)

        const stored: RefreshTokenPayload = {
            userId: user.id,
            email: user.email,
            role: user.role
        }
        await this.redisService.set(`${REFRESH_TOKEN_PREFIX}${hash}`, stored, refreshExpires)

        return {
            accessToken,
            refreshToken,
            expiresIn: jwtExpires,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role
            }
        }
    }

    /** 计算 SHA-256 哈希，用于 refresh token 的 Redis key */
    private sha256(value: string): string {
        return createHash('sha256').update(value).digest('hex')
    }
}
