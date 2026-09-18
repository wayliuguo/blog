/**
 * 03 - 双 Token：同一个 payload 签出「短期 Access Token」和「长期 Refresh Token」
 *
 * 用真实的 @nestjs/jwt（JwtService）跑一遍：签两份、解两份、看 exp 差多少，
 * 再用一个 1 秒过期的 token 触发一次真实的 TokenExpiredError。
 *
 * 运行：npm run 03tokens
 */
import { Injectable, Module, UnauthorizedException } from '@nestjs/common'
import { JwtModule, JwtService } from '@nestjs/jwt'
import { NestFactory } from '@nestjs/core'

const JWT_SECRET = 'lab-only-secret'

// Access Token：短期有效（2小时），用于访问资源
// Refresh Token：长期有效（7天），用于获取新的 Access Token

@Injectable()
export class AuthService {
    constructor(private readonly jwtService: JwtService) {}

    login(user: { id: number; email: string }) {
        const payload = { sub: user.id, email: user.email }

        return {
            access_token: this.jwtService.sign(payload, { expiresIn: '2h' }),
            refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' })
        }
    }

    refreshToken(refreshToken: string) {
        try {
            const payload = this.jwtService.verify(refreshToken)
            const newPayload = { sub: payload.sub, email: payload.email }

            return {
                access_token: this.jwtService.sign(newPayload, { expiresIn: '2h' })
            }
        } catch {
            throw new UnauthorizedException('Refresh Token 已过期，请重新登录')
        }
    }
}

@Module({
    imports: [
        // 模块级默认：密钥 + 默认过期时间（不传 expiresIn 时用它）
        JwtModule.register({
            secret: JWT_SECRET,
            signOptions: { expiresIn: '2h' }
        })
    ],
    providers: [AuthService]
})
class AppModule {}

/** 只用来对照：把一个 token 拆成 header / payload / signature 三段看 */
function decode(token: string) {
    const [header, payload] = token.split('.')
    return {
        header: JSON.parse(Buffer.from(header, 'base64url').toString('utf8')),
        payload: JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    }
}

function describe(label: string, token: string) {
    const { header, payload } = decode(token)
    const ttl = payload.exp - payload.iat
    const human = ttl >= 86400 ? `${ttl / 86400} 天` : ttl >= 3600 ? `${ttl / 3600} 小时` : `${ttl} 秒`
    console.log(
        `  ${label.padEnd(14)} alg=${header.alg} sub=${payload.sub} email=${payload.email} ` +
            `iat=${payload.iat} exp=${payload.exp} 有效期=${ttl}s（${human}）`
    )
    return ttl
}

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule, { logger: false })
    const authService = app.get(AuthService)
    const jwtService = app.get(JwtService)

    console.log('=== 1) 用户登录：同一个账号签出两份 Token ===')
    const tokens = authService.login({ id: 1, email: 'test@ex.com' })
    console.log(`  access_token  = ${tokens.access_token.slice(0, 40)}...`)
    console.log(`  refresh_token = ${tokens.refresh_token.slice(0, 40)}...`)
    console.log('')
    describe('access_token', tokens.access_token)
    describe('refresh_token', tokens.refresh_token)

    console.log('\n=== 2) 用 Refresh Token 换新的 Access Token ===')
    const refreshed = authService.refreshToken(tokens.refresh_token)
    console.log(`  换到的 access_token = ${refreshed.access_token.slice(0, 40)}...`)
    describe('new access', refreshed.access_token)
    console.log(
        `  和刚登录时那份 access_token 内容相同：${refreshed.access_token === tokens.access_token}` +
            '（同一秒里签发、payload 和 exp 都一样，所以字符串一致）'
    )

    console.log('\n=== 3) 拿 Access Token 去验证：签名对了就通过 ===')
    const verified = jwtService.verify(tokens.access_token)
    console.log(`  verify 通过，payload = ${JSON.stringify(verified)}`)

    console.log('\n=== 4) Refresh Token 过期后会怎样（签一个 1 秒就过期的）===')
    const shortLived = jwtService.sign({ sub: 1, email: 'test@ex.com' }, { expiresIn: '1s' })
    describe('1s token', shortLived)
    console.log('  等待 1.2 秒...')
    await new Promise(resolve => setTimeout(resolve, 1200))
    try {
        authService.refreshToken(shortLived)
    } catch (err) {
        console.log(`  抛出：${err.constructor.name}: ${(err as Error).message}`)
    }

    console.log('\n说明：两份 Token 的 payload 完全相同，只有 exp 不同——所以短 Token 干业务、长 Token 只换新。')
    console.log('说明：JWT 是无状态的，服务端没法「撤销」它，过期后只能靠 Refresh Token 重新签发。')

    await app.close()
}

void bootstrap()
