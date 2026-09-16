/**
 * 注册请求 DTO
 *
 * 使用 class-validator 装饰器声明字段校验规则，
 * 由全局 ValidationPipe 自动校验，校验失败返回 422。
 */
import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator'

export class RegisterDto {
    @ApiProperty({ description: '邮箱', example: 'user@example.com' })
    @IsEmail({}, { message: '邮箱格式不正确' })
    @IsNotEmpty({ message: '邮箱不能为空' })
    email: string

    @ApiProperty({ description: '用户名', example: '张三' })
    @IsString({ message: '用户名必须为字符串' })
    @IsNotEmpty({ message: '用户名不能为空' })
    @MaxLength(64, { message: '用户名最长 64 个字符' })
    username: string

    @ApiProperty({ description: '密码', example: '123456' })
    @IsString({ message: '密码必须为字符串' })
    @IsNotEmpty({ message: '密码不能为空' })
    @MinLength(6, { message: '密码至少 6 位' })
    @MaxLength(32, { message: '密码最长 32 个字符' })
    password: string
}
