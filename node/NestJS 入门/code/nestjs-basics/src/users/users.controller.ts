import {
    Body,
    Controller,
    Delete,
    Get,
    Headers,
    HttpCode,
    Ip,
    Param,
    Post,
    Put,
    Query,
    Redirect,
    UseFilters,
    UseGuards,
    UseInterceptors
} from '@nestjs/common'
import { HttpExceptionFilter } from '../common/http-exception.filter'
import { LoggingInterceptor } from '../common/logging.interceptor'
import { ParseIdPipe } from '../common/parse-id.pipe'
import { RolesGuard } from '../common/roles.guard'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { User } from './entities/user.entity'
import { UsersService } from './users.service'

@Controller('users') // 路由前缀：所有路由都以 /users 开头
@UseGuards(RolesGuard) // 整个控制器需要 admin 角色（全局那套在 main.ts / app.module.ts）
@UseFilters(HttpExceptionFilter)
@UseInterceptors(LoggingInterceptor)
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get('legacy') // 老路径重定向到新路径，注意要写在 @Get(':id') 之前
    @Redirect('/users', 301)
    legacy(): void {}

    @Get() // GET /users
    findAll(): User[] {
        return this.usersService.findAll()
    }

    @Get(':id') // GET /users/1
    findOne(@Param('id', ParseIdPipe) id: number): User {
        return this.usersService.findOne(String(id))
    }

    @Get(':id/detail')
    detail(
        @Param('id') id: string, // 路由参数 /users/1 → id = "1"
        @Query('page') page: number, // 查询参数 ?page=1 → page = 1
        @Headers('authorization') auth: string, // 请求头
        @Ip() ip: string // 请求 IP
    ): object {
        return { id, page, auth, ip }
    }

    @Post() // POST /users
    @HttpCode(201) // 自定义状态码
    create(@Body() body: CreateUserDto): User {
        return this.usersService.create(body)
    }

    @Put(':id') // PUT /users/1
    update(@Param('id') id: string, @Body() body: UpdateUserDto): User {
        return this.usersService.update(id, body)
    }

    @Delete(':id') // DELETE /users/1
    remove(@Param('id') id: string): void {
        this.usersService.remove(id)
    }
}
