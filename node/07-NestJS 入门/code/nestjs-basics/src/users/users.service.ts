import { Injectable, NotFoundException, OnApplicationShutdown, OnModuleInit } from '@nestjs/common'
import { User } from './entities/user.entity'

@Injectable()
export class UsersService implements OnModuleInit, OnApplicationShutdown {
    // 演示用：真实项目里这一层是 Repository 或数据库调用
    private readonly users: User[] = [
        { id: 1, name: '张三', age: 28, email: 'zhangsan@test.com', createdAt: new Date('2024-01-01'), balance: 100 },
        { id: 2, name: '李四', age: 32, email: 'lisi@test.com', createdAt: new Date('2024-01-02'), balance: 200 }
    ]

    async onModuleInit() {
        // 应用启动时执行一次：建立连接池、预热缓存等
        console.log('UsersService 初始化')
    }

    async onApplicationShutdown(signal: string) {
        // 进程关闭时执行一次：释放连接、落盘等
        console.log('收到关闭信号', signal)
    }

    findAll(): User[] {
        return this.users
    }

    findOne(id: string): User {
        const user = this.users.find(item => item.id === Number(id))
        if (!user) {
            throw new NotFoundException(`用户 ${id} 不存在`)
        }
        return user
    }

    create(data: { name: string; age?: number; email: string }): User {
        const user: User = {
            id: Date.now(),
            name: data.name,
            age: data.age ?? 0,
            email: data.email,
            createdAt: new Date(),
            balance: 0
        }
        this.users.push(user)
        return user
    }

    update(id: string, data: Partial<User>): User {
        const user = this.findOne(id)
        Object.assign(user, data)
        return user
    }

    remove(id: string): void {
        const index = this.users.findIndex(user => user.id === Number(id))
        if (index >= 0) this.users.splice(index, 1)
    }
}
