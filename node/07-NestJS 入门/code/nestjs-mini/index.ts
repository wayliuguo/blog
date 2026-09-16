/**
 * 最小 NestJS 实现
 *
 * 本文件用约 400 行代码还原 NestJS 的五大核心机制：
 *
 * 1. 装饰器（Decorator）
 *    - 类装饰器 @Module / @Controller / @Injectable
 *    - 方法装饰器 @Get / @Post / @Put / @Delete
 *    - 参数装饰器 @Body / @Param / @Query
 *    - 原理：装饰器本质是"在类定义时执行的函数"，通过 reflect-metadata 把信息挂到类上
 *
 * 2. DI 容器（依赖注入）
 *    - 原理：读取 TypeScript 自动生成的 design:paramtypes 元数据，
 *      知道构造函数需要哪些类型的依赖，递归创建并注入
 *
 * 3. 请求处理链
 *    - 顺序：Guard（守卫）→ 参数解析 → Pipe（管道）→ Interceptor（拦截器）→ Handler
 *    - 原理：洋葱模型，Interceptor 可以在 Handler 前后插入逻辑
 *
 * 4. 路由匹配
 *    - 原理：扫描 Controller 上的 @Get/@Post 元数据，拼接前缀 + 路径，
 *      用正则匹配 :param 动态参数
 *
 * 5. 模块系统
 *    - 原理：递归读取 @Module 的 imports，收集所有子模块的 controller 和 provider
 */

import 'reflect-metadata'
import http from 'http'
import { URL } from 'url'

// ========== 第一部分：装饰器 ==========
//
// 装饰器是 NestJS 的灵魂。理解装饰器要抓住两点：
// 1. 装饰器就是一个函数，在类/方法/参数定义时自动执行
// 2. 装饰器通过 reflect-metadata 把信息存储到类上，供后续读取
//
// 元数据 Key 是存储和读取的"键"，类似于 localStorage 的 key
const MODULE_METADATA = 'module:metadata'
const CONTROLLER_METADATA = 'controller:metadata'
const INJECTABLE_METADATA = 'injectable:metadata'
const ROUTE_METADATA = 'route:metadata'
const PARAM_METADATA = 'param:metadata'

// 类型定义
interface ModuleOptions {
    controllers?: any[]
    providers?: any[]
    imports?: any[]
}

interface ControllerOptions {
    prefix?: string
}

interface RouteDef {
    method: string
    path: string
    handlerName: string
}

interface ParamDef {
    type: 'body' | 'param' | 'query'
    key?: string
}

/**
 * @Module({ controllers, providers, imports })
 *
 * 原理：
 * - 类装饰器，接收被装饰的类（target）
 * - 把模块配置（controllers/providers/imports）存到类的元数据上
 * - 后续 NestFactory.create 会读取这些配置，知道要注册哪些 Controller 和 Provider
 *
 * 执行时机：类定义时立即执行（不是实例化时）
 */
function Module(options: ModuleOptions) {
    return (target: any) => {
        // Reflect.defineMetadata(key, value, target)
        // 把 options 挂到 target（类本身）上，key 是 MODULE_METADATA
        Reflect.defineMetadata(MODULE_METADATA, options, target)
    }
}

/**
 * @Controller({ prefix }) 或 @Controller('/users')
 *
 * 原理：
 * - 类装饰器，标记这个类是控制器
 * - prefix 是路由前缀，比如 '/users'，最终路径 = prefix + 方法路径
 * - 支持两种写法：对象 { prefix: '/users' } 或字符串 '/users'
 */
function Controller(options: ControllerOptions | string = {}) {
    // 统一处理两种入参形式
    const prefix = typeof options === 'string' ? options : options.prefix || ''
    return (target: any) => {
        Reflect.defineMetadata(CONTROLLER_METADATA, { prefix }, target)
    }
}

/**
 * @Injectable()
 *
 * 原理：
 * - 类装饰器，标记这个类可以被 DI 容器管理
 * - 实际上 NestJS 中所有类都可以被注入，@Injectable 主要是语义标记
 * - 但加了装饰器后，TypeScript 才会生成 design:paramtypes 元数据（关键！）
 *
 * 注意：如果一个类没有任何装饰器，TypeScript 不会生成 design:paramtypes，
 *       DI 容器就无法知道它的构造函数参数类型，注入会失败。
 */
function Injectable() {
    return (target: any) => {
        Reflect.defineMetadata(INJECTABLE_METADATA, true, target)
    }
}

/**
 * 创建方法装饰器的工厂函数
 *
 * 原理：
 * - 方法装饰器接收三个参数：
 *   - target：类的原型对象（不是类本身！）
 *   - propertyKey：方法名
 *   - descriptor：方法的属性描述符
 * - 我们把路由信息 push 到 target.constructor（即类本身）的元数据上
 * - 用数组存储是因为一个 Controller 有多个路由方法
 *
 * 为什么用 target.constructor 而不是 target？
 * - target 是原型对象，所有实例共享
 * - target.constructor 才是类本身，元数据应该挂在类上而不是原型上
 */
function createMethodDecorator(method: string) {
    return (path: string = '') => {
        return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
            // 读取已有的路由列表（可能为 undefined，所以用 || []）
            const routes: RouteDef[] = Reflect.getMetadata(ROUTE_METADATA, target.constructor) || []
            routes.push({
                method,
                path,
                handlerName: propertyKey
            })
            // 写回元数据
            Reflect.defineMetadata(ROUTE_METADATA, routes, target.constructor)
        }
    }
}

// 生成四种 HTTP 方法装饰器
const Get = createMethodDecorator('get')
const Post = createMethodDecorator('post')
const Put = createMethodDecorator('put')
const Delete = createMethodDecorator('delete')

/**
 * 创建参数装饰器的工厂函数
 *
 * 原理：
 * - 参数装饰器接收三个参数：
 *   - target：类的原型对象
 *   - propertyKey：方法名
 *   - parameterIndex：参数在参数列表中的位置（从 0 开始）
 * - 我们把参数信息按位置存到数组里
 * - 比如 create(@Body() body, @Param('id') id) 会生成：
 *   [{ type: 'body' }, { type: 'param', key: 'id' }]
 *
 * 后续执行请求时，读取这个数组，按位置填入对应的值
 */
function createParamDecorator(type: 'body' | 'param' | 'query') {
    return (key?: string) => {
        return (target: any, propertyKey: string, parameterIndex: number) => {
            // 注意第三个参数是 propertyKey（方法名），用来区分不同方法的参数
            const params: ParamDef[] = Reflect.getMetadata(PARAM_METADATA, target.constructor, propertyKey) || []
            params[parameterIndex] = { type, key }
            Reflect.defineMetadata(PARAM_METADATA, params, target.constructor, propertyKey)
        }
    }
}

const Body = createParamDecorator('body')
const Param = createParamDecorator('param')
const Query = createParamDecorator('query')

// ========== 第二部分：DI 容器 ==========
//
// DI（Dependency Injection，依赖注入）的核心问题：
// UserController 的构造函数需要 UserService，但我们不想手动 new：
//   const controller = new UserController(new UserService())
//
// DI 容器的解决方案：
// 1. 读取 UserController 的 design:paramtypes 元数据 → 得到 [UserService]
// 2. 递归 resolve(UserService) → 得到 UserService 实例
// 3. new UserController(userServiceInstance) → 完成注入

class Container {
    // 单例缓存：token（类）→ 实例
    // 这样每个 Provider 在整个应用中只有一个实例（单例模式）
    private instances = new Map<any, any>()

    // 手动注册（本示例中未使用，展示完整性）
    register(token: any, instance: any) {
        this.instances.set(token, instance)
    }

    /**
     * 解析依赖并返回实例
     *
     * 原理（递归过程）：
     * resolve(UserController)
     *   ├─ 读取 design:paramtypes → [UserService]
     *   ├─ resolve(UserService)
     *   │    ├─ 读取 design:paramtypes → []（无依赖）
     *   │    ├─ new UserService()
     *   │    └─ 返回 UserService 实例
     *   ├─ new UserController(userServiceInstance)
     *   └─ 返回 UserController 实例
     */
    resolve<T>(token: any): T {
        // 单例检查：如果已经创建过，直接返回
        // 这保证了整个应用中同一个 Provider 只有一个实例
        if (this.instances.has(token)) {
            return this.instances.get(token)
        }

        // 关键步骤：读取构造函数的参数类型
        // design:paramtypes 是 TypeScript 编译时自动生成的元数据
        // 例如 constructor(userService: UserService) 会生成 [UserService]
        // 注意：只有被装饰器修饰的类才会生成这个元数据
        const paramTypes: any[] = Reflect.getMetadata('design:paramtypes', token) || []

        // 递归解析每个参数的依赖
        // 比如 paramTypes = [UserService, Logger]
        // 就会调用 resolve(UserService) 和 resolve(Logger)
        const args = paramTypes.map(paramType => this.resolve(paramType))

        // 用解析好的依赖实例化类
        // 等价于 new token(arg1, arg2, ...)
        const instance = new token(...args)

        // 缓存为单例
        this.instances.set(token, instance)

        return instance
    }
}

// ========== 第三部分：请求处理链 ==========
//
// 请求处理链是 NestJS 的核心设计，定义了请求从进入到响应的完整流程：
//
// 请求 → Guard(守卫) → 参数解析 → Pipe(管道) → Interceptor(拦截器) → Handler → 响应
//
// 每个组件都是"可选"的，只有定义了才会执行
// 组件之间通过约定的方法名检测：canActivate / transform / intercept

// 管道（Pipe）：转换/校验参数
// 实现 transform 方法即可被自动调用
interface PipeTransform {
    transform(value: any): any
}

// 守卫（Guard）：判断请求是否允许通过
// 返回 false 则请求被拒绝（403）
interface CanActivate {
    canActivate(context: any): boolean | Promise<boolean>
}

// 拦截器（Interceptor）：包裹处理器，实现 AOP 切面
// next() 调用后才会执行 Handler，可以在前后插入逻辑
interface NestInterceptor {
    intercept(context: any, next: () => Promise<any>): Promise<any>
}

// ========== 第四部分：框架核心 ==========

interface MatchedRoute {
    method: string
    path: string
    handler: (...args: any[]) => any
    handlerName: string
    controllerClass: any
    controllerInstance: any
}

/**
 * NestFactory.create() — NestJS 应用的入口
 *
 * 原理：
 * 1. 创建 DI 容器
 * 2. 递归收集所有模块的 Controller 和 Provider
 * 3. 用 DI 容器实例化所有 Provider 和 Controller
 * 4. 扫描 Controller 的路由元数据，生成路由表
 * 5. 创建 HTTP 服务器，请求时匹配路由并执行处理链
 */
class NestFactory {
    static create(ModuleClass: any) {
        const container = new Container()
        const routes: MatchedRoute[] = []

        /**
         * 递归收集所有 Controller（支持 imports）
         *
         * 原理：
         * AppModule 可能 imports 了 UserModule、OrderModule 等子模块
         * 需要递归遍历所有子模块，收集它们的 Controller
         *
         * 数据结构（树形）：
         * AppModule
         *   ├─ UserModule (imports)
         *   │    └─ UserController
         *   └─ OrderModule (imports)
         *        └─ OrderController
         */
        function collectControllers(moduleClass: any): any[] {
            const moduleMetadata: ModuleOptions = Reflect.getMetadata(MODULE_METADATA, moduleClass) || {}
            let controllers = [...(moduleMetadata.controllers || [])]

            // 递归收集导入的子模块的 Controller
            if (moduleMetadata.imports) {
                for (const importedModule of moduleMetadata.imports) {
                    controllers = controllers.concat(collectControllers(importedModule))
                }
            }
            return controllers
        }

        // 同上，递归收集所有 Provider
        function collectProviders(moduleClass: any): any[] {
            const moduleMetadata: ModuleOptions = Reflect.getMetadata(MODULE_METADATA, moduleClass) || {}
            let providers = [...(moduleMetadata.providers || [])]
            if (moduleMetadata.imports) {
                for (const importedModule of moduleMetadata.imports) {
                    providers = providers.concat(collectProviders(importedModule))
                }
            }
            return providers
        }

        // 步骤 1：注册所有 Provider
        // 先注册 Provider，这样 Controller 实例化时依赖已经可用
        for (const provider of collectProviders(ModuleClass)) {
            container.resolve(provider)
        }

        // 步骤 2：扫描所有 Controller，提取路由
        const controllerClasses = collectControllers(ModuleClass)
        for (const ControllerClass of controllerClasses) {
            // 读取 Controller 的路由前缀
            const controllerMetadata = Reflect.getMetadata(CONTROLLER_METADATA, ControllerClass)
            const prefix = controllerMetadata?.prefix || ''

            // 用 DI 容器实例化 Controller（自动注入依赖）
            const controllerInstance = container.resolve(ControllerClass)

            // 读取 Controller 上所有 @Get/@Post 等方法装饰器生成的路由列表
            const controllerRoutes: RouteDef[] = Reflect.getMetadata(ROUTE_METADATA, ControllerClass) || []

            // 把每个路由加入全局路由表
            for (const route of controllerRoutes) {
                routes.push({
                    method: route.method,
                    path: prefix + route.path, // 拼接前缀 + 方法路径
                    handler: controllerInstance[route.handlerName].bind(controllerInstance),
                    handlerName: route.handlerName,
                    controllerClass: ControllerClass,
                    controllerInstance
                })
            }
        }

        // 步骤 3：创建 HTTP 服务器
        const server = http.createServer((req: any, res: any) => {
            // 增强 res 对象：添加 status() 和 json() 方法
            res.status = (code: number) => {
                res.statusCode = code
                return res // 返回 res 以支持链式调用：res.status(200).json(...)
            }
            res.json = (data: any, status = 200) => {
                res.statusCode = status
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(data))
            }

            // 解析请求体（POST/PUT 的 JSON body）
            let body = ''
            req.on('data', (chunk: any) => {
                body += chunk
            })
            req.on('end', () => {
                if (body) {
                    try {
                        req.body = JSON.parse(body)
                    } catch {
                        req.body = {}
                    }
                }

                // 解析 URL query 参数
                const urlObj = new URL(req.url, `http://${req.headers.host}`)
                req.query = Object.fromEntries(urlObj.searchParams)
                const pathname = urlObj.pathname

                // 路由匹配：遍历所有路由，找到 method 和 path 都匹配的
                const matchedRoute = routes.find(r => {
                    if (r.method !== req.method.toLowerCase()) return false

                    // 把 /users/:id 转换成正则 /users/([^/]+)
                    // 同时记录参数名 ['id']，匹配后用 match[1] 赋值给 req.params.id
                    const paramNames: string[] = []
                    const regexStr = r.path.replace(/:([^/]+)/g, (_, name: string) => {
                        paramNames.push(name)
                        return '([^/]+)'
                    })
                    const regex = new RegExp(`^${regexStr}$`)
                    const match = pathname.match(regex)

                    if (match) {
                        // 提取路径参数：{ id: '123' }
                        req.params = {}
                        paramNames.forEach((name, i) => {
                            req.params[name] = match[i + 1]
                        })
                        return true
                    }
                    return false
                })

                if (matchedRoute) {
                    // 匹配成功，执行请求处理链
                    executeRequestChain(matchedRoute, req, res)
                } else {
                    // 匹配失败，返回 404
                    res.status(404).json({ message: 'Not Found' })
                }
            })
        })

        /**
         * 执行请求处理链
         *
         * 顺序：Guard → 参数解析 → Pipe → Interceptor → Handler
         *
         * 每个环节都是可选的：
         * - 如果 Controller 有 canActivate 方法，执行 Guard
         * - 如果有 transform 方法，执行 Pipe
         * - 如果有 intercept 方法，执行 Interceptor
         * - 否则直接执行 Handler
         */
        async function executeRequestChain(route: MatchedRoute, req: any, res: any) {
            const { controllerInstance, handler, handlerName, controllerClass } = route
            const context = { req, res, handlerName }

            // 环节 1：Guard（守卫）
            // 用于身份认证、权限校验等
            // 返回 false → 拒绝请求（403）
            if (typeof controllerInstance.canActivate === 'function') {
                const allowed = await controllerInstance.canActivate(context)
                if (!allowed) {
                    res.status(403).json({ message: 'Forbidden' })
                    return
                }
            }

            // 环节 2：解析参数装饰器，构建 handler 的参数列表
            // 比如 findOne(@Param('id') id) → args = [req.params.id]
            //      create(@Body() body)     → args = [req.body]
            const paramMetadata: ParamDef[] = Reflect.getMetadata(PARAM_METADATA, controllerClass, handlerName) || []

            let args: any[] = paramMetadata.map(meta => {
                if (!meta) return undefined
                switch (meta.type) {
                    case 'body':
                        return req.body
                    case 'param':
                        return req.params?.[meta.key]
                    case 'query':
                        return req.query?.[meta.key]
                    default:
                        return undefined
                }
            })

            // 环节 3：Pipe（管道）
            // 用于参数转换、校验（如 ParseIntPipe 把字符串转数字）
            // 对每个参数执行 transform
            if (typeof controllerInstance.transform === 'function') {
                args = args.map(arg => controllerInstance.transform(arg))
            }

            // 环节 4：Interceptor（拦截器）+ Handler
            // Interceptor 是 AOP 切面，可以在 Handler 前后执行逻辑
            // 比如：日志记录、耗时统计、统一响应格式
            try {
                if (typeof controllerInstance.intercept === 'function') {
                    // intercept 接收 context 和 next 函数
                    // 调用 next() 才会执行 Handler
                    // 可以在 next() 前后插入逻辑
                    const result = await controllerInstance.intercept(context, async () => handler(...args))
                    if (result !== undefined) res.json(result)
                } else {
                    // 没有 Interceptor，直接执行 Handler
                    const result = await handler(...args)
                    if (result !== undefined) res.json(result)
                }
            } catch (err: any) {
                // 异常捕获，返回 500
                res.status(500).json({ message: err.message || 'Internal Server Error' })
            }
        }

        return {
            listen(port: number, callback?: () => void) {
                server.listen(port, callback)
            }
        }
    }
}

// ========== 第五部分：使用示例 ==========

// --- 定义服务 ---
// @Injectable() 标记这个类可以被注入
// 加了装饰器后，TypeScript 才会生成 design:paramtypes 元数据
@Injectable()
class UserService {
    findAll() {
        return [
            { id: 1, name: '张三', email: 'zhangsan@test.com' },
            { id: 2, name: '李四', email: 'lisi@test.com' }
        ]
    }

    findOne(id: string) {
        return { id: Number(id), name: '用户' + id, email: `user${id}@test.com` }
    }

    create(data: any) {
        return { id: Date.now(), ...data }
    }
}

// --- 定义控制器 ---
// @Controller({ prefix: '/users' }) 设置路由前缀
// 最终路径 = '/users' + 方法路径
@Controller({ prefix: '/users' })
class UserController {
    // 构造函数注入 UserService
    // DI 容器会自动读取 design:paramtypes → [UserService]，然后注入实例
    constructor(private userService: UserService) {}

    // @Get() 对应 GET /users
    @Get()
    findAll() {
        return this.userService.findAll()
    }

    // @Get(':id') 对应 GET /users/:id
    // @Param('id') 把路径参数 id 注入到方法参数
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.userService.findOne(id)
    }

    // @Post() 对应 POST /users
    // @Body() 把请求体注入到方法参数
    @Post()
    create(@Body() body: any) {
        return this.userService.create(body)
    }
}

// --- 定义模块 ---
// @Module 把 Controller 和 Provider 注册到模块中
// NestFactory.create 会读取这里的配置
@Module({
    controllers: [UserController],
    providers: [UserService]
})
class AppModule {}

// --- 启动 ---
// NestFactory.create(AppModule) 完成所有初始化：
// 1. 注册 UserService 到 DI 容器
// 2. 实例化 UserController（注入 UserService）
// 3. 扫描路由：GET /users, GET /users/:id, POST /users
// 4. 启动 HTTP 服务器监听 3000 端口
const app = NestFactory.create(AppModule)
app.listen(3000, () => {
    console.log('最小 NestJS 运行在 http://localhost:3000')
    console.log('  GET    /users      → 查询所有用户')
    console.log('  GET    /users/:id  → 查询单个用户')
    console.log('  POST   /users      → 创建用户（body: {"name":"王五","email":"ww@test.com"}）')
})
