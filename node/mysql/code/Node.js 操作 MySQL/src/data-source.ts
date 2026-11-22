// data-source.ts：DataSource 配置——账号密码走 .env，实体集中登记
// 这一份配置同时给"应用启动"和"命令行 migration"用，避免两处配置写歪
import 'reflect-metadata'
import * as dotenv from 'dotenv'
import { DataSource } from 'typeorm'
import { User } from './01-entity'
import { Order } from './03-relations'

dotenv.config() // 必须在读 process.env 之前调用

export const AppDataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mysql_demo',
    charset: 'utf8mb4',
    entities: [User, Order], // 也可以写成 ['src/**/*.entity.ts'] 让 TypeORM 自己扫
    synchronize: false, // 生产环境务必 false：让 migration 管表结构
    logging: ['error', 'query'] // 打开 query 日志，就能亲眼看到 N+1 到底发了几条 SQL
})

// 演示用入口：连得上就打印一次查询，连不上就报错退出
async function main() {
    await AppDataSource.initialize()
    const users = await AppDataSource.getRepository(User).find()
    console.log('users 条数 =', users.length)
    await AppDataSource.destroy()
}

if (require.main === module) {
    main().catch(err => {
        console.error('连接失败：', err.message, '（需要本地 MySQL，见 .env.example）')
        process.exit(1)
    })
}
