/**
 * 认证控制器 — 处理注册、登录、令牌刷新、登出等 HTTP 请求。
 *
 * 注册 / 登录 / 刷新接口标记为 @Public()，跳过 JWT 认证守卫。
 * 登出接口需要登录态（携带 Bearer token）。
 */
import { Body, Controller, Post, Req } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'

import { Public } from './decorators/public.decorator'
import { RegisterDto } from './dto/register.dto'
import { LoginDto, RefreshTokenDto } from './dto/login.dto'
import { AuthService } from './auth.service'

@ApiTags('Auth - 认证')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    /** 用户注册：邮箱 + 用户名 + 密码，密码 bcrypt 哈希存储 */
    @Public()
    @Post('register')
    @ApiOperation({ summary: '用户注册' })
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto)
    }

    /** 用户登录：校验密码后返回 accessToken + refreshToken */
    @Public()
    @Post('login')
    @ApiOperation({ summary: '用户登录' })
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto)
    }

    /** 刷新令牌：使用 refreshToken 换取新的令牌对，实现无感续期 */
    @Public()
    @Post('refresh')
    @ApiOperation({ summary: '刷新令牌' })
    async refresh(@Body() dto: RefreshTokenDto) {
        return this.authService.refresh(dto)
    }

    /** 用户登出：将当前 accessToken 加入黑名单并删除 refreshToken */
    @ApiBearerAuth()
    @Post('logout')
    @ApiOperation({ summary: '用户登出' })
    async logout(@Req() req: Request) {
        const accessToken = (req.headers.authorization ?? '').replace('Bearer ', '')
        return this.authService.logout(accessToken)
    }
}
