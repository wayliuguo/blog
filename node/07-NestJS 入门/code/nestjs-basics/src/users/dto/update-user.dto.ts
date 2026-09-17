import { IsEmail, IsInt, IsOptional, IsString } from 'class-validator'

// 更新接口的字段都是可选的。真实项目里可以用 @nestjs/mapped-types 的 PartialType(CreateUserDto) 自动生成，
// 这里手工列出，避免为示例多装一个依赖。
export class UpdateUserDto {
    @IsOptional()
    @IsString()
    name?: string

    @IsOptional()
    @IsInt()
    age?: number

    @IsOptional()
    @IsEmail()
    email?: string

    @IsOptional()
    @IsString()
    phone?: string
}
