// 02-users.service.ts：Repository 模式——注入 Repository，用方法调用替代手写 SQL
// 每个实体都对应一个 Repository，它把"表"包装成"可调用的对象"
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from './01-entity'

// 在 Service 中注入 Repository
@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>
    ) {}

    async findAll(): Promise<User[]> {
        return this.userRepository.find()
    }

    async findById(id: number): Promise<User> {
        return this.userRepository.findOneBy({ id })
    }

    async create(data: Partial<User>): Promise<User> {
        const user = this.userRepository.create(data)
        return this.userRepository.save(user)
    }

    async update(id: number, data: Partial<User>): Promise<void> {
        await this.userRepository.update(id, data)
    }

    async delete(id: number): Promise<void> {
        await this.userRepository.delete(id)
    }
}

// 说明：create() 只负责把普通对象变成实体实例（不落库），save() 才真的写库
// findOneBy 找不到时返回 null；需要报错就自己判空再抛 NotFoundException
// Repository 上还挂着 count / findAndCount（分页要的"总数 + 当页"）/ query（写原生 SQL）等方法
