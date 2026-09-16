/**
 * 用户模块 — 注册 User 实体并 re-export TypeOrmModule，
 * 使 AuthModule 等模块导入 UsersModule 后可直接注入 User Repository。
 *
 * 本模板未单独抽出 UsersService，用户数据访问由 AuthService 直接通过
 * Repository 完成；如需扩展用户管理接口，可在此模块补充 service 与 controller。
 */
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { User } from './user.entity'

@Module({
    // 注册 User 实体，使其 Repository 可在本模块内注入
    imports: [TypeOrmModule.forFeature([User])],
    // re-export TypeOrmModule，使导入方也能注入 User Repository
    exports: [TypeOrmModule]
})
export class UsersModule {}
