import { Injectable } from '@nestjs/common'

/**
 * 用户服务
 * 使用内存数组模拟数据存储，演示微服务内部业务逻辑
 */
@Injectable()
export class UserService {
    // 内存模拟的用户数据
    private users: Array<{ id: number; name: string; email: string }> = [
        { id: 1, name: '张三', email: 'zhangsan@example.com' },
        { id: 2, name: '李四', email: 'lisi@example.com' }
    ]

    // 自增 ID 计数器
    private nextId = 3

    /**
     * 根据 ID 获取用户
     */
    getUser(id: number) {
        const user = this.users.find(u => u.id === id)
        if (!user) {
            return { success: false, message: '用户不存在' }
        }
        return { success: true, data: user }
    }

    /**
     * 创建用户
     */
    createUser(name: string, email: string) {
        const user = { id: this.nextId++, name, email }
        this.users.push(user)
        return { success: true, data: user }
    }
}
