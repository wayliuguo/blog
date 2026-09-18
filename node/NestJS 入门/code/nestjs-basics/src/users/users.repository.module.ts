import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from './entities/user.entity'
import { UsersService } from './users.service'

// 接数据库时用这一层把 Repository 注册进来。它需要本地 MySQL 才能启动，
// 所以没有被根模块 AppModule 导入，业务逻辑先用 users.module.ts 里的内存数据演示。
@Module({
    imports: [TypeOrmModule.forFeature([User])], // 注册 User 的 Repository
    controllers: [],
    providers: [UsersService],
    exports: [UsersService]
})
export class UsersRepositoryModule {}
