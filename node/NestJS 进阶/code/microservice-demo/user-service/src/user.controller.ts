import { Controller } from '@nestjs/common'
import { MessagePattern } from '@nestjs/microservices'
import { UserService } from './user.service'

/**
 * 用户微服务控制器
 * 通过 @MessagePattern 暴露消息处理方法，供网关或其他微服务通过 TCP 调用
 */
@Controller()
export class UserController {
    constructor(private readonly userService: UserService) {}

    /**
     * 获取用户信息
     * 匹配 cmd: 'get_user'，入参为 { id }
     */
    @MessagePattern({ cmd: 'get_user' })
    getUser(data: { id: number }) {
        return this.userService.getUser(data.id)
    }

    /**
     * 创建用户
     * 匹配 cmd: 'create_user'，入参为 { name, email }
     */
    @MessagePattern({ cmd: 'create_user' })
    createUser(data: { name: string; email: string }) {
        return this.userService.createUser(data.name, data.email)
    }
}
