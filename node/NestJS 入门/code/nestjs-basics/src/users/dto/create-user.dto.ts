import { IsEmail, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator'

export class CreateUserDto {
    @IsString({ message: '姓名必须是字符串' })
    @MinLength(2, { message: '姓名至少 2 个字符' })
    @MaxLength(50)
    name: string

    @IsInt()
    @Min(0)
    @Max(150)
    @IsOptional()
    age: number

    @IsEmail({}, { message: '邮箱格式不正确' })
    email: string

    @IsOptional()
    @IsString()
    phone?: string
}
