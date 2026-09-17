/**
 * 03 - 用 HttpOnly Cookie 保存 Refresh Token
 *
 * 真实的 Nest + Express：登录接口用 res.cookie(...) 下发 HttpOnly Cookie，
 * 刷新接口再从请求头的 Cookie 里把它取回来。跑起来能看到完整的 Set-Cookie 报文。
 *
 * 运行：npm run 03cookie
 */
import { Body, Controller, Injectable, Module, Post, Req, Res, UnauthorizedException } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { JwtModule, JwtService } from '@nestjs/jwt'
import type { Request, Response } from 'express'

const JWT_SECRET = 'lab-only-secret'

/** 登录入参（真实项目里会用 class-validator 装饰器做校验，这里只保留形状） */
class LoginDto {
    email: string
    password: string
}

@Injectable()
export class AuthService {
    constructor(private readonly jwtService: JwtService) {}

    async login(dto: LoginDto) {
        // 演示用：只有一个写死的账号
        if (dto.email !== 'test@ex.com' || dto.password !== '123456') {
            throw new UnauthorizedException('邮箱或密码错误')
        }

        const payload = { sub: 1, email: dto.email }
        return {
            access_token: this.jwtService.sign(payload, { expiresIn: '2h' }),
            refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' })
        }
    }

    refresh(refreshToken: string) {
        try {
            const payload = this.jwtService.verify(refreshToken)
            return {
                access_token: this.jwtService.sign({ sub: payload.sub, email: payload.email }, { expiresIn: '2h' })
            }
        } catch {
            throw new UnauthorizedException('Refresh Token 已过期，请重新登录')
        }
    }
}

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    // 登录成功后，把 refresh_token 写入 HttpOnly Cookie
    @Post('login')
    async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
        const { access_token, refresh_token } = await this.authService.login(dto)

        res.cookie('refresh_token', refresh_token, {
            httpOnly: true, // JS 读不到，挡掉大多数 XSS 窃取
            secure: true, // 仅 HTTPS 传输
            sameSite: 'strict', // 阻止跨站请求携带，缓解 CSRF
            path: '/auth/refresh', // 只在刷新接口带上，缩小暴露面
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        // Access Token 仍走响应体，由前端带在 Authorization 头
        return { access_token }
    }

    @Post('refresh')
    async refresh(@Req() req: Request) {
        const cookieHeader = req.headers.cookie ?? ''
        const token = cookieHeader
            .split(';')
            .map(part => part.trim())
            .find(part => part.startsWith('refresh_token='))
            ?.slice('refresh_token='.length)

        if (!token) {
            throw new UnauthorizedException('请求里没有 refresh_token Cookie')
        }
        return this.authService.refresh(token)
    }
}

@Module({
    imports: [JwtModule.register({ secret: JWT_SECRET })],
    controllers: [AuthController],
    providers: [AuthService]
})
class AppModule {}

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { logger: false })
    await app.listen(0, '127.0.0.1')
    const port = (app.getHttpServer().address() as { port: number }).port
    const base = `http://127.0.0.1:${port}`

    console.log('=== 1) 登录：Set-Cookie 里都写了什么 ===')
    const loginRes = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'test@ex.com', password: '123456' })
    })
    const setCookie = loginRes.headers.getSetCookie()[0]
    const body = (await loginRes.json()) as { access_token: string }
    console.log(`  POST /auth/login → ${loginRes.status}`)
    console.log(`  响应体：{ access_token: "${body.access_token.slice(0, 32)}..." }`)
    console.log(`  Set-Cookie：${setCookie.replace(/refresh_token=[^;]+/, 'refresh_token=<7d 的 JWT>')}`)
    console.log('  逐个属性看：')
    for (const attr of setCookie.split('; ').slice(1)) {
        console.log(`    - ${attr}`)
    }

    console.log('\n=== 2) 用 Refresh Token 换新的 Access Token ===')
    const cookieValue = setCookie.split(';')[0]
    const refreshRes = await fetch(`${base}/auth/refresh`, {
        method: 'POST',
        headers: { cookie: cookieValue }
    })
    const refreshed = (await refreshRes.json()) as { access_token?: string; message?: string }
    console.log(`  POST /auth/refresh（带 Cookie）→ ${refreshRes.status}`)
    console.log(`  换到的 access_token：${refreshed.access_token?.slice(0, 32)}...`)

    console.log('\n=== 3) 不带 Cookie 时刷新会被拒 ===')
    const noCookieRes = await fetch(`${base}/auth/refresh`, { method: 'POST' })
    console.log(
        `  POST /auth/refresh（不带 Cookie）→ ${noCookieRes.status} ${JSON.stringify(await noCookieRes.json())}`
    )

    console.log('\n说明：httpOnly 让 document.cookie 读不到它，secure 让它只走 HTTPS，')
    console.log('说明：sameSite=strict 挡跨站携带，path=/auth/refresh 让它只出现在刷新请求上。')
    console.log('说明：这四条都是「降低风险」而不是「消灭风险」——XSS 仍能以用户身份发请求，真正的对策是修掉 XSS。')

    await app.close()
}

void bootstrap()
