import { Module } from '@nestjs/common'
import { UserController } from './user.controller'
import { UserService } from './user.service'

/**
 * 用户模块
 * 注册用户微服务的控制器与服务提供者
 */
@Module({
    controllers: [UserController],
    providers: [UserService]
})
export class UserModule {}
