import { Module } from '@nestjs/common'
import { AdminController } from './admin.controller'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'

@Module({
    imports: [], // 导入其他模块
    controllers: [UsersController, AdminController], // 该模块下的控制器
    providers: [UsersService], // 该模块下的服务/提供器
    exports: [UsersService] // 导出给其他模块使用的提供器
})
export class UsersModule {}
