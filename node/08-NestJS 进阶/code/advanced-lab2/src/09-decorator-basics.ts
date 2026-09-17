/**
 * 09 - NestJS 源码分析：前置知识
 *
 * 把「装饰器 / reflect-metadata / design:paramtypes」这三件套拆成最小可跑示例：
 *   1) 类装饰器：类定义时执行一个函数，把信息挂到类上
 *   2) 方法装饰器：拿到 target(原型) / propertyKey / descriptor，拼出路由表
 *   3) 参数装饰器：靠 parameterIndex 记住「第几个参数」
 *   4) reflect-metadata：把元数据隔离存储，不污染类原型
 *   5) design:paramtypes：TypeScript 编译期自动生成的构造参数类型，DI 容器的依据
 *
 * 运行：npm run 09decorators
 */
import 'reflect-metadata'

/** 演示用的目标类：reflect-metadata 的元数据就是挂在「类对象」上的 */
class DemoController {
    getUsers() {
        return []
    }
}

// ====== 1) 类装饰器 ======
// 装饰器就是一个普通函数：@Controller('/users') 等价于「类定义完后立刻调用它的返回值」
function demoClassDecorator() {
    // 类装饰器：接收被装饰的类（构造函数）
    function Controller(prefix: string) {
        // 返回一个函数，target 就是被装饰的类
        return function (target: any) {
            console.log(`注册控制器: ${target.name}, 前缀: ${prefix}`)
            // 把 prefix 存到 target 上，后续可以读取
            target._prefix = prefix
        }
    }

    @Controller('/users')
    class UserController {
        getUsers() {
            return []
        }
    }
}

// ====== 2) 方法装饰器 ======
// 注意第一个参数是类的「原型」而不是类本身，所以元数据要写到 target.constructor 上
function demoMethodDecorator() {
    // 方法装饰器：target 是类的原型，propertyKey 是方法名，descriptor 是属性描述符
    function Get(path: string) {
        return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
            console.log(`注册路由: ${propertyKey} → GET ${path}`)
            // 把路由信息存到 target 上
            if (!target._routes) target._routes = []
            target._routes.push({ method: 'get', path, handler: propertyKey })
        }
    }

    class UserController {
        @Get('/list')
        getUsers() {
            return []
        }
    }
}

// ====== 3) 参数装饰器 ======
// 参数装饰器没有 descriptor，第三个参数换成了 parameterIndex（参数在列表中的位置）
function demoParamDecorator() {
    // 参数装饰器：parameterIndex 是参数在函数参数列表中的位置（从 0 开始）
    function Body() {
        return function (target: any, propertyKey: string, parameterIndex: number) {
            console.log(`@Body() 标记在 ${propertyKey} 的第 ${parameterIndex} 个参数上`)
        }
    }

    class UserController {
        create(@Body() body: any) {}
    }
}

console.log('=== 4) reflect-metadata 核心 API ===')
// 存储元数据：Reflect.defineMetadata(key, value, target)
// 读取元数据：Reflect.getMetadata(key, target)
const MY_KEY = 'my:key'

// 存储在类上
Reflect.defineMetadata(MY_KEY, { prefix: '/users' }, DemoController)
// 读取
const meta = Reflect.getMetadata(MY_KEY, DemoController)
console.log(meta.prefix)

// 为什么不直接 target._prefix = prefix？
// - 直接挂属性会污染类原型，可能与业务属性撞名
// - reflect-metadata 是隔离的元数据表，多个 key 可以并存
console.log(`DemoController 上的普通属性 _prefix = ${(DemoController as any)._prefix}`)

console.log('\n=== 5) design:paramtypes ===')

/** 最小的类装饰器：只为了让这个类带上装饰器（等价于 @Injectable()） */
function Injectable() {
    return function (target: any) {}
}

import 'reflect-metadata'

class Logger {
    log(msg: string) {
        console.log(msg)
    }
}

// UserService 的构造函数参数是 [Logger]
// → 因为类上有装饰器，TypeScript 会为它自动生成 design:paramtypes 元数据
@Injectable()
class UserService {
    constructor(private logger: Logger) {}
}

// 读取构造函数的参数类型
const paramTypes = Reflect.getMetadata('design:paramtypes', UserService)
console.log(paramTypes)

// 反例：完全没有装饰器的类不会生成 design:paramtypes，DI 容器就无从下手
class PlainService {
    constructor(private logger: Logger) {}
}
console.log(`没有装饰器的类 → ${Reflect.getMetadata('design:paramtypes', PlainService)}`)

// ====== 运行三个装饰器示例 ======
console.log('\n=== 1) 类装饰器 ===')
demoClassDecorator()
console.log('\n=== 2) 方法装饰器 ===')
demoMethodDecorator()
console.log('\n=== 3) 参数装饰器 ===')
demoParamDecorator()
