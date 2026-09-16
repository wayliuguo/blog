/**
 * 登录相关 DTO
 *
 * - LoginDto：邮箱 + 密码登录
 * - RefreshTokenDto：使用 refreshToken 换取新的访问令牌
 *
 * 均使用 class-validator 装饰器声明校验规则。
 */
import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsString } from 'class-validator'

/** 登录请求参数 */
export class LoginDto {
    @ApiProperty({ description: '邮箱', example: 'user@example.com' })
    @IsEmail({}, { message: '邮箱格式不正确' })
    @IsNotEmpty({ message: '邮箱不能为空' })
    email: string

    @ApiProperty({ description: '密码' })
    @IsString({ message: '密码必须为字符串' })
    @IsNotEmpty({ message: '密码不能为空' })
    password: string
}

/** 令牌刷新请求参数：由登录接口返回的 refreshToken */
export class RefreshTokenDto {
    @ApiProperty({ description: '刷新令牌' })
    @IsString()
    @IsNotEmpty({ message: '刷新令牌不能为空' })
    refreshToken: string
}
