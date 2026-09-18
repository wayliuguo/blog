/**
 * 11 - 认证进阶：双 Token 与多设备会话
 *
 * 把「Prisma + AuthSession 表」这套设计换成内存实现跑一遍，逐条验证：
 *   1. 为什么 Refresh Token 不能用 bcrypt 存（72 字节截断）
 *   2. 登录：明文只给客户端一次，库里只留 SHA-256 哈希
 *   3. HttpOnly Cookie 的选项最终序列化成什么样的 Set-Cookie 头
 *   4. 多设备：手机和电脑各一条会话，互不顶下线
 *   5. 轮换：刷新后旧 Refresh Token 立刻失效，重放直接 401
 *   6. 登出：单设备 / 全设备
 *
 * 运行：npm run 11refresh
 */
import 'reflect-metadata'
import { createHash, randomBytes } from 'node:crypto'

import { Body, Controller, Post, Res, UnauthorizedException } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'

// cookie 2.x 用 package.json 的 exports 暴露类型，moduleResolution: node 解析不到，
// 这里按 CJS 取并在本地补上类型声明
const { stringifySetCookie, parseSetCookie } = require('cookie') as {
    stringifySetCookie: (cookie: Record<string, unknown>) => string
    parseSetCookie: (header: string) => { name: string; value: string }
}

type CookieSerializeOptions = Record<string, unknown>

const JWT_SECRET = 'advanced-lab2-refresh-secret'

// ====== 复刻 @nestjs/jwt 的 JwtService，只保留本篇用到的两个方法 ======
class JwtService {
    sign(payload: object, options: { expiresIn: string }): string {
        return jwt.sign(payload, JWT_SECRET, options as jwt.SignOptions)
    }

    async verifyAsync<T = any>(token: string): Promise<T> {
        return jwt.verify(token, JWT_SECRET) as T
    }
}

// ====== AuthSession 表（内存版）======

/** 对应 prisma/schema.prisma 里的 model AuthSession */
interface AuthSessionRow {
    id: number
    userId: number
    refreshTokenHash: string
    deviceId: string
    userAgent: string | null
    expiresAt: Date
    revoked: boolean
    createdAt: Date
}

type WhereRow = Partial<Pick<AuthSessionRow, 'userId' | 'refreshTokenHash' | 'revoked' | 'deviceId'>>

/**
 * 内存版 prisma.authSession —— 方法名与参数形状跟 Prisma Client 一致，
 * 所以 AuthService 里的写法可以原样搬到真实项目，只换掉这一个类。
 */
class MemoryAuthSessionTable {
    private seq = 0
    readonly rows: AuthSessionRow[] = []

    async create({ data }: { data: Omit<AuthSessionRow, 'id' | 'createdAt' | 'revoked'> }) {
        const row: AuthSessionRow = { id: ++this.seq, createdAt: new Date(), revoked: false, ...data }
        this.rows.push(row)
        return row
    }

    async findFirst({ where }: { where: WhereRow }) {
        return this.rows.find(r => Object.entries(where).every(([k, v]) => (r as any)[k] === v)) ?? null
    }

    async update({ where, data }: { where: { id: number }; data: Partial<AuthSessionRow> }) {
        const row = this.rows.find(r => r.id === where.id)!
        Object.assign(row, data)
        return row
    }

    async updateMany({ where, data }: { where: WhereRow; data: Partial<AuthSessionRow> }) {
        const hit = this.rows.filter(r => Object.entries(where).every(([k, v]) => (r as any)[k] === v))
        hit.forEach(r => Object.assign(r, data))
        return { count: hit.length }
    }

    async count({ where = {} }: { where?: WhereRow } = {}) {
        return this.rows.filter(r => Object.entries(where).every(([k, v]) => (r as any)[k] === v)).length
    }
}

// 把 Refresh Token 转成固定长度的哈希再存库
function hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
}

// ====== 认证服务 ======

/** 登录请求参数（真实项目里是带 class-validator 装饰器的 DTO） */
interface LoginDto {
    email: string
    password: string
    deviceId: string
    userAgent?: string
}

class AuthService {
    private readonly jwtService = new JwtService()

    /** 内存版 users 表 */
    private readonly users = [{ id: 1, email: 'zhangsan@example.com', passwordHash: bcrypt.hashSync('123456', 10) }]

    constructor(private readonly prisma: { authSession: MemoryAuthSessionTable }) {}

    /** 登录：校验密码 → 签发令牌对 → Refresh Token 哈希后入库 */
    async login(dto: LoginDto) {
        const user = this.users.find(u => u.email === dto.email)
        if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
            throw new UnauthorizedException('邮箱或密码错误')
        }

        const payload = { sub: user.id, email: user.email }
        const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' })

        // 签发后只存哈希。签名带一个随机 jti：否则同一秒内两次登录会签出完全相同的 Token
        const refreshToken = this.jwtService.sign(
            { sub: user.id, jti: randomBytes(16).toString('hex') },
            { expiresIn: '7d' }
        )
        await this.prisma.authSession.create({
            data: {
                userId: user.id,
                refreshTokenHash: hashRefreshToken(refreshToken), // 存哈希，不存明文
                deviceId: dto.deviceId,
                userAgent: dto.userAgent ?? null,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        })

        return { access_token: accessToken, refresh_token: refreshToken }
    }

    /** 刷新令牌：校验 + 哈希比对 + 轮换 */
    async refresh(incomingRefreshToken: string) {
        // 1. 先校验 JWT 签名与过期
        let payload: any
        try {
            payload = await this.jwtService.verifyAsync(incomingRefreshToken)
        } catch {
            throw new UnauthorizedException('Refresh Token 已过期')
        }

        // 2. 算哈希，查库比对（确认这是服务端签发且未吊销的那条）
        const incomingHash = hashRefreshToken(incomingRefreshToken)
        const session = await this.prisma.authSession.findFirst({
            where: { userId: payload.sub, refreshTokenHash: incomingHash, revoked: false }
        })
        if (!session) throw new UnauthorizedException('Refresh Token 无效或已被使用')

        // 3. 关键：旧 Token 立即失效（置位 revoked），并签发新一对 Token
        await this.prisma.authSession.update({
            where: { id: session.id },
            data: { revoked: true }
        })

        const newAccessToken = this.jwtService.sign({ sub: payload.sub }, { expiresIn: '15m' })
        const newRefreshToken = this.jwtService.sign(
            { sub: payload.sub, jti: randomBytes(16).toString('hex') },
            { expiresIn: '7d' }
        )

        // 4. 写入新的会话记录（新哈希、新设备上下文）
        await this.prisma.authSession.create({
            data: {
                userId: payload.sub,
                refreshTokenHash: hashRefreshToken(newRefreshToken),
                deviceId: session.deviceId,
                userAgent: session.userAgent,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        })

        return { access_token: newAccessToken, refresh_token: newRefreshToken }
    }

    // 单设备登出：只吊销当前这条会话
    async logout(currentRefreshToken: string) {
        const hash = hashRefreshToken(currentRefreshToken)
        await this.prisma.authSession.updateMany({
            where: { refreshTokenHash: hash, revoked: false },
            data: { revoked: true }
        })
    }

    // 全设备登出：吊销该用户所有会话
    async logoutAllDevices(userId: number) {
        await this.prisma.authSession.updateMany({
            where: { userId, revoked: false },
            data: { revoked: true }
        })
    }
}

// ====== 极简 Response 桩：只实现 Express 的 res.cookie ======

class ResponseStub {
    headers: Record<string, string> = {}

    cookie(name: string, value: string, options: CookieSerializeOptions) {
        // Express 的 res.cookie 收的 maxAge 是毫秒，序列化时转成秒
        const { maxAge, ...rest } = options
        this.headers['set-cookie'] = stringifySetCookie({
            name,
            value,
            ...rest,
            ...(maxAge ? { maxAge: Math.floor(Number(maxAge) / 1000) } : {})
        })
    }
}

@Controller('auth')
class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('login')
    async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: ResponseStub) {
        const { access_token, refresh_token } = await this.authService.login(dto)

        res.cookie('refresh_token', refresh_token, {
            httpOnly: true, // JS 读不到，挡掉大多数 XSS 窃取
            secure: true, // 仅 HTTPS 传输
            sameSite: 'strict', // 跨站请求不自动带，缓解 CSRF
            path: '/auth/refresh', // 只在刷新接口携带，缩小暴露面
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        return { access_token } // Access Token 走响应体
    }
}

// ====== 演示 ======

/** Token 是敏感值，打印时只留长度，不落日志 */
function len(value: string): string {
    return `<${value.length} 字符>`
}

/** 把 Set-Cookie 的值换成占位符，只保留属性 */
function maskSetCookie(header: string): string {
    return header.replace(/^refresh_token=[^;]+/, 'refresh_token=<JWT>')
}

function describe(row: AuthSessionRow) {
    return {
        id: row.id,
        deviceId: row.deviceId,
        revoked: row.revoked,
        hash: row.refreshTokenHash.slice(0, 16) + '…'
    }
}

async function demoBcrypt72() {
    // 前 72 字节完全相同、尾部不同的两个「Token」
    const common = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImRldmljZSI6ImExIn0.' + 'x'.repeat(10)
    const refreshTokenA = common + '-ALICE-signature'
    const refreshTokenB = common + '-BOB-signature-different'

    const hashA = await bcrypt.hash(refreshTokenA, 10)
    const ok = await bcrypt.compare(refreshTokenB, hashA)

    console.log('=== 1) bcrypt 的 72 字节截断：两个不同的 Token 被判成同一个 ===')
    console.log(`  公共前缀长度                      = ${common.length} 字节（> 72）`)
    console.log(`  refreshTokenA / B 长度            = ${refreshTokenA.length} / ${refreshTokenB.length} 字节`)
    console.log(`  两个 Token 是同一个吗             = ${refreshTokenA === refreshTokenB}`)
    console.log(`  bcrypt.compare(B, bcrypt.hash(A)) = ${ok}   ← 校验被绕过`)
    console.log(`  sha256(A) = ${hashRefreshToken(refreshTokenA)}`)
    console.log(`  sha256(B) = ${hashRefreshToken(refreshTokenB)}`)
    console.log(
        `  两个 SHA-256 相等吗               = ${hashRefreshToken(refreshTokenA) === hashRefreshToken(refreshTokenB)}`
    )
}

async function main() {
    await demoBcrypt72()

    const prisma = { authSession: new MemoryAuthSessionTable() }
    const authService = new AuthService(prisma)
    const controller = new AuthController(authService)
    const ZHANGSAN = { email: 'zhangsan@example.com', password: '123456' }

    console.log('\n=== 2) 登录：明文只给客户端一次，库里只存 SHA-256 ===')
    const resA = new ResponseStub()
    const { access_token } = await controller.login({ ...ZHANGSAN, deviceId: 'device-A' }, resA)
    // 客户端拿到的 Refresh Token 就在 Cookie 里，这里把它读回来继续后面的流程
    const refreshA = parseSetCookie(resA.headers['set-cookie']).value

    console.log(`  响应体 access_token   = ${len(access_token)}（15m）`)
    console.log(`  Set-Cookie           = ${maskSetCookie(resA.headers['set-cookie'])}`)
    console.log(`  库里那一行            = ${JSON.stringify(describe(prisma.authSession.rows[0]))}`)
    console.log(
        `  库里有明文 Token 吗    = ${prisma.authSession.rows.some(r => r.refreshTokenHash.includes(refreshA))}`
    )

    console.log('\n=== 3) 多设备：手机与电脑各一条会话，互不顶下线 ===')
    const resB = new ResponseStub()
    await controller.login({ ...ZHANGSAN, deviceId: 'device-B', userAgent: 'Mozilla/5.0 (iPhone)' }, resB)
    const refreshB = parseSetCookie(resB.headers['set-cookie']).value

    console.log(`  会话数              = ${await prisma.authSession.count()}`)
    console.log(
        `  两台设备哈希不同吗   = ${
            prisma.authSession.rows[0].refreshTokenHash !== prisma.authSession.rows[1].refreshTokenHash
        }`
    )
    console.log(`  device-B 记住了 UA   = ${prisma.authSession.rows[1].userAgent}`)

    console.log('\n=== 4) 轮换：刷新后旧 Refresh Token 立即失效 ===')
    const refreshed = await authService.refresh(refreshA)
    console.log(`  device-A 刷新成功    = ${!!refreshed.access_token}`)
    console.log(`  旧会话 revoked       = ${prisma.authSession.rows[0].revoked}`)
    console.log(`  新会话沿用 deviceId  = ${prisma.authSession.rows[2].deviceId}`)
    try {
        await authService.refresh(refreshA)
        console.log('  拿旧 Token 再刷一次  = 居然成功了（不应该发生）')
    } catch (err) {
        console.log(`  拿旧 Token 再刷一次  = ${(err as Error).message}`)
    }
    console.log(`  device-B 被牵连了吗  = revoked: ${prisma.authSession.rows[1].revoked}`)

    console.log('\n=== 5) 登出 ===')
    await authService.logout(refreshed.refresh_token)
    console.log(
        `  单设备登出后 device-A 活跃会话数 = ${await prisma.authSession.count({
            where: { userId: 1, deviceId: 'device-A', revoked: false }
        })}`
    )
    try {
        await authService.refresh(refreshed.refresh_token)
    } catch (err) {
        console.log(`  登出后再刷新                    = ${(err as Error).message}`)
    }
    console.log(
        `  device-B 仍然活跃               = ${await prisma.authSession.count({
            where: { userId: 1, deviceId: 'device-B', revoked: false }
        })}`
    )

    await authService.logoutAllDevices(1)
    console.log(
        `  全设备登出后活跃会话数          = ${await prisma.authSession.count({
            where: { userId: 1, revoked: false }
        })}`
    )
    const stillWorks = await authService
        .refresh(refreshB)
        .then(() => '还能刷（不应该发生）')
        .catch((err: Error) => err.message)
    console.log(`  device-B 的旧 Token 还能刷吗    = ${stillWorks}`)
}

void main()
