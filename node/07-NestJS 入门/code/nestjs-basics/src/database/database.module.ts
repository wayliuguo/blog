import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

@Module({
    imports: [
        TypeOrmModule.forRoot({
            type: 'mysql',
            host: 'localhost',
            port: 3306,
            username: 'root',
            password: 'password',
            database: 'myapp',
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: true // 开发环境自动同步表结构（生产环境禁用！）
        })
    ]
})
export class DatabaseModule {}
