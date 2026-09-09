/**
 * 认证模块 — 集成 JWT 签发/验证、Passport JWT 策略、令牌生命周期管理。
 *
 * 导入：
 * - PassportModule：提供 @nestjs/passport 的守卫基础设施
 * - UsersModule：re-export 了 TypeOrmModule，使本模块可注入 User Repository
 * - JwtModule.registerAsync：从 SecurityConfig 动态读取密钥与过期时间
 *
 * 导出 AuthService / JwtModule，供其他模块按需注入使用。
 */
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'

import { ISecurityConfig } from '~/config/configuration'
import { UsersModule } from '~/modules/users/users.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtStrategy } from './strategies/jwt.strategy'

@Module({
    imports: [
        PassportModule,
        // UsersModule 内部 TypeOrmModule.forFeature([User]) 并 re-export，
        // 导入后即可在本模块注入 User Repository（AuthService 使用）
        UsersModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const { jwtSecret, jwtExpires } = configService.get<ISecurityConfig>('security')!
                return {
                    secret: jwtSecret,
                    // expiresIn 接受字符串（如 '2h'）或数字（秒）
                    signOptions: { expiresIn: jwtExpires } as any
                }
            }
        })
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy],
    exports: [AuthService, JwtModule]
})
export class AuthModule {}
