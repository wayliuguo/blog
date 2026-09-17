import { TypeOrmModuleOptions } from '@nestjs/typeorm'

// 开发环境：方便，自动同步
export const devDataSourceOptions: TypeOrmModuleOptions = {
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: 'password',
    database: 'myapp',
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    synchronize: true
}

// 生产环境：禁用！可能导致数据丢失
export const prodDataSourceOptions: TypeOrmModuleOptions = {
    type: 'mysql',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    synchronize: false
    // 生产环境的表结构变更改用 Migration（migration:generate / migration:run）
}
