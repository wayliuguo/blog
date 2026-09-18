import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { firstValueFrom } from 'rxjs'

/**
 * 用户 HTTP 控制器
 * 对外暴露 RESTful 接口，内部通过 TCP 转发给 user-service
 */
@Controller('users')
export class UserController {
    // 注入 user-service 的客户端代理（注入名 USER_SERVICE）
    constructor(@Inject('USER_SERVICE') private readonly userClient: ClientProxy) {}

    /**
     * GET /users/:id
     * 获取用户信息，转发 cmd: 'get_user'
     */
    @Get(':id')
    async getUser(@Param('id') id: string) {
        const result = await firstValueFrom(this.userClient.send({ cmd: 'get_user' }, { id: Number(id) }))
        return result
    }

    /**
     * POST /users
     * 创建用户，转发 cmd: 'create_user'
     */
    @Post()
    async createUser(@Body() body: { name: string; email: string }) {
        const result = await firstValueFrom(this.userClient.send({ cmd: 'create_user' }, body))
        return result
    }
}
