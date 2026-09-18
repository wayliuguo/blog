import { Injectable } from '@nestjs/common'

// 本文件演示"没有 IoC"时的写法：自己 new、自己组装依赖链。
// 依赖越深，这种写法的耦合就越重（改构造方式要改所有调用点、单测无法替换 Mock）。

class UserService {
    findAll() {
        return [{ id: 1, name: '张三' }]
    }
}

class UserController {
    private userService = new UserService() // 手动创建

    getUsers() {
        return this.userService.findAll()
    }
}

// 对比：NestJS 里同样的两个类，只声明依赖、由容器注入。
@Injectable()
export class ManualWiringDemo {
    getUsers() {
        const controller = new UserController()
        return controller.getUsers()
    }
}
