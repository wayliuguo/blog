# NestJS 源码分析

> NestJS 的核心机制有三层：**装饰器**（定义元数据）、**DI 容器**（管理依赖）、**请求处理链**（管道/守卫/拦截器/处理器）。下面用最简代码实现这些核心概念。

---

## 前置知识

理解 NestJS 源码之前，需要掌握三个核心概念：**TypeScript 装饰器**、**reflect-metadata**、**design:paramtypes**。

### 1. TypeScript 装饰器

装饰器是一种用 `@` 前缀声明的语法，用来给类、方法、属性、参数"贴标签"。NestJS 的 `@Module`、`@Controller`、`@Get` 等全是装饰器。

**四类装饰器**：

| 类型 | 装饰对象 | 参数 | 示例 |
|------|---------|------|------|
| 类装饰器 | 类本身 | `(target)` | `@Controller('/users')` |
| 方法装饰器 | 类的方法 | `(target, propertyKey, descriptor)` | `@Get('/:id')` |
| 属性装饰器 | 类的属性 | `(target, propertyKey)` | `@Inject('REDIS')` |
| 参数装饰器 | 方法参数 | `(target, propertyKey, parameterIndex)` | `@Body()` `@Param('id')` |

**手动实现一个类装饰器**：

```typescript
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
    getUsers() { return [] }
}
// 输出：注册控制器: UserController, 前缀: /users
```

**手动实现一个方法装饰器**：

```typescript
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
    getUsers() { return [] }
}
// 输出：注册路由: getUsers → GET /list
```

**手动实现一个参数装饰器**：

```typescript
// 参数装饰器：parameterIndex 是参数在函数参数列表中的位置（从 0 开始）
function Body() {
    return function (target: any, propertyKey: string, parameterIndex: number) {
        console.log(`@Body() 标记在 ${propertyKey} 的第 ${parameterIndex} 个参数上`)
    }
}

class UserController {
    create(@Body() body: any) {}
}
// 输出：@Body() 标记在 create 的第 0 个参数上
```

### 2. reflect-metadata

装饰器本身只是"运行时执行一个函数"，但如果想把元数据**持久存储**到类上供后续读取，需要 `reflect-metadata` 库。

**安装**：

```bash
npm install reflect-metadata
```

**引入**（在入口文件顶部）：

```typescript
import 'reflect-metadata'  // 必须在所有其他 import 之前
```

**核心 API**：

```typescript
// 存储元数据：Reflect.defineMetadata(key, value, target)
// 读取元数据：Reflect.getMetadata(key, target)

import 'reflect-metadata'

const MY_KEY = 'my:key'

// 存储在类上
Reflect.defineMetadata(MY_KEY, { prefix: '/users' }, UserController)
// 读取
const meta = Reflect.getMetadata(MY_KEY, UserController)
console.log(meta.prefix)  // /users
```

**为什么不直接用 `target._prefix = prefix`？**

| 方式 | 优点 | 缺点 |
|------|------|------|
| 直接挂属性 | 简单直观 | 污染类原型，可能与业务属性冲突 |
| `reflect-metadata` | 隔离存储，不污染原型，支持多 key | 需要额外依赖 |

NestJS 使用 `reflect-metadata` 在装饰器中存储元数据，DI 容器和路由扫描器再通过 `Reflect.getMetadata` 读取这些信息。

### 3. design:paramtypes（自动类型反射）

TypeScript 编译时如果开启 `emitDecoratorMetadata: true`，会自动为**被装饰器修饰的类**生成参数类型信息，通过 `Reflect.getMetadata('design:paramtypes', target)` 读取。

**tsconfig.json 关键配置**：

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,    // 启用装饰器语法
    "emitDecoratorMetadata": true       // 自动生成类型元数据
  }
}
```

**效果演示**：

```typescript
import 'reflect-metadata'

class Logger {
    log(msg: string) { console.log(msg) }
}

// UserService 的构造函数参数是 [Logger]
// → TypeScript 自动生成 design:paramtypes 元数据
class UserService {
    constructor(private logger: Logger) {}
}

// 读取构造函数的参数类型
const paramTypes = Reflect.getMetadata('design:paramtypes', UserService)
console.log(paramTypes)  // [Logger]
//                       ↑ 这是一个数组，每个元素是参数的类型（构造函数）
```

**这是 NestJS 依赖注入的关键**：DI 容器读取 `design:paramtypes`，知道 `UserService` 需要 `Logger`，就自动创建 `Logger` 实例并注入。

```
UserController 构造函数: (userService: UserService)
                                    ↓
    reflect-metadata 自动记录: design:paramtypes = [UserService]
                                    ↓
    DI 容器读取后: 需要 UserService → resolve(UserService) → new UserService()
                                    ↓
    注入: new UserController(userServiceInstance)
```

> **注意**：`emitDecoratorMetadata` 只对**至少有一个装饰器**的类生效。如果一个类没有任何装饰器，`design:paramtypes` 不会被生成。

---

## 最小实现

完整源码见 [`nestjs-mini/index.ts`](../../code/node/nestjs-mini/index.ts)。这里不再把代码堆成一大段，而是**按"谁使用 → 调用到哪些关键逻辑"的顺序**拆成若干片段，顺着调用链阅读更清晰。

整体调用链如下：

```
业务类定义时「使用」装饰器 → 装饰器把信息写进元数据（defineMetadata）
        ↓
app = NestFactory.create(AppModule)
        ├─ new Container                      → 用到「DI 容器」
        ├─ collectControllers/Providers       → 用到「模块系统」，递归收集 imports
        ├─ resolve()                          → 读 design:paramtypes 递归注入依赖
        ├─ 扫描路由：prefix + path → 生成路由表
        └─ http.createServer 监听请求
app.listen(3000)
        ↓
收到请求 → 路由匹配(:param) → executeRequestChain
        ├─ Guard → 参数解析 → Pipe → Interceptor → Handler
        └─ 统一 res.json 响应
```

### Step 1 · 环境准备：依赖与元数据 Key

识别一个"标签"有没有、内容是什么，都靠 `reflect-metadata` 在类上存取元数据。先引入依赖，并统一定义 `Key`（相当于元数据的"索引"）。

```typescript
import 'reflect-metadata'
import http from 'http'
import { URL } from 'url'

// 元数据 Key 是存储和读取的"键"，类似于 localStorage 的 key
const MODULE_METADATA = 'module:metadata'
const CONTROLLER_METADATA = 'controller:metadata'
const INJECTABLE_METADATA = 'injectable:metadata'
const ROUTE_METADATA = 'route:metadata'
const PARAM_METADATA = 'param:metadata'
```

### Step 2 · 类型定义

后面各环节共用的接口都汇总在这里。

```typescript
interface ModuleOptions {
    controllers?: any[]
    providers?: any[]
    imports?: any[]
}

interface ControllerOptions {
    prefix?: string
}

// 路由表条目：method + 拼接后的 path + 绑定了实例的处理函数
interface RouteDef {
    method: string
    path: string
    handlerName: string
}

// 参数装饰器记录：type 决定从 req 的哪部分取值，key 是参数名
interface ParamDef {
    type: 'body' | 'param' | 'query'
    key?: string
}

// 匹配成功后的路由信息（含实例，供请求处理链使用）
interface MatchedRoute {
    method: string
    path: string
    handler: (...args: any[]) => any
    handlerName: string
    controllerClass: any
    controllerInstance: any
}

// 请求处理链组件：实现对应方法（canActivate/transform/intercept）即可被自动调用
interface PipeTransform {
    transform(value: any): any
}
interface CanActivate {
    canActivate(context: any): boolean | Promise<boolean>
}
interface NestInterceptor {
    intercept(context: any, next: () => Promise<any>): Promise<any>
}
```

### Step 3 · 装饰器：被业务类"使用"的关键逻辑

业务类上用到的 `@Module`、`@Controller`、`@Get`、`@Param`……每个"使用"背后都调用一个装饰器，把信息写进类的元数据（`Reflect.defineMetadata`）。

```
使用情景                              调用的关键逻辑
@Module({...})          → Module()           → 写模块配置(controllers/providers/imports)
@Controller('/users')   → Controller()       → 写路由前缀 prefix
@Injectable()           → Injectable()       → 打标记（同时触发生成 design:paramtypes）
@Get('@path')/@Post()   → createMethodDecorator → 往路由数组 push {method,path,handlerName}
@Param('id')/@Body()    → createParamDecorator → 按参数位置记录 {type,key}
```

```typescript
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
    const prefix = typeof options === 'string' ? options : (options.prefix || '')
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
                handlerName: propertyKey,
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
```

### Step 4 · 使用装饰器定义业务类

装饰器实现好了，现在"使用"它们定义一个最小应用（Service / Controller / Module）。

```typescript
// --- 定义服务 ---
// @Injectable() 标记这个类可以被注入
// 加了装饰器后，TypeScript 才会生成 design:paramtypes 元数据
@Injectable()
class UserService {
    findAll() {
        return [
            { id: 1, name: '张三', email: 'zhangsan@test.com' },
            { id: 2, name: '李四', email: 'lisi@test.com' },
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
    providers: [UserService],
})
class AppModule {}
```

### Step 5 · DI 容器：注入依赖的关键逻辑

`NestFactory.create` 启动时「使用」容器创建所有实例。容器靠 `design:paramtypes` 知道构造函数要什么类型，然后递归解析、单例缓存。

```typescript
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
```

### Step 6 · 框架核心 `NestFactory.create`：把前面几步串起来的入口

这里「使用」了 Step 3 的装饰器元数据和 Step 5 的 DI 容器，完成：**模块系统递归收集 → 实例化 Provider/Controller → 扫描路由 → 建 HTTP 服务器**。

```typescript
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

        // 这一个个接收 moduleClass 的函数就是「模块系统」的关键逻辑：
        // 递归读取 @Module 存下的元数据，把当前模块 + 所有 imports 子模块的类都收集起来。
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
                    path: prefix + route.path,           // 拼接前缀 + 方法路径
                    handler: controllerInstance[route.handlerName].bind(controllerInstance),
                    handlerName: route.handlerName,
                    controllerClass: ControllerClass,
                    controllerInstance,
                })
            }
        }

        // 步骤 3：创建 HTTP 服务器
        // 请求到达后，这里做「路由匹配」（把 /users/:id 转成正则）并触发请求处理链。
        const server = http.createServer((req: any, res: any) => {
            // 增强 res 对象：添加 status() 和 json() 方法
            res.status = (code: number) => {
                res.statusCode = code
                return res  // 返回 res 以支持链式调用：res.status(200).json(...)
            }
            res.json = (data: any, status = 200) => {
                res.statusCode = status
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(data))
            }

            // 解析请求体（POST/PUT 的 JSON body）
            let body = ''
            req.on('data', (chunk: any) => { body += chunk })
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

        return {
            listen(port: number, callback?: () => void) {
                server.listen(port, callback)
            }
        }
    }
}
```

### Step 7 · 请求处理链：请求到达时被调用的关键逻辑

路由匹配成功后，服务器就调用这里的处理链：`Guard → 参数解析 → Pipe → Interceptor → Handler`。每个环节都是可选的，靠方法名检测是否存在。（完整源码中该函数定义在 `NestFactory.create` 内部，这里单独列出便于阅读。）

```typescript
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
    const paramMetadata: ParamDef[] = Reflect.getMetadata(
        PARAM_METADATA,
        controllerClass,
        handlerName
    ) || []

    let args: any[] = paramMetadata.map(meta => {
        if (!meta) return undefined
        switch (meta.type) {
            case 'body': return req.body
            case 'param': return req.params?.[meta.key]
            case 'query': return req.query?.[meta.key]
            default: return undefined
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
```

### Step 8 · 启动应用

最后「使用」`NestFactory.create` 拿到 app 实例并监听端口。

```typescript
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
```

## 函数调用流程

```
请求到达 HTTP 服务器
  │
  ▼
http.createServer 回调
  │ 作用：接收每个 HTTP 请求
  ▼
解析 URL 和 Method
  │ 作用：提取 method、pathname、query
  ▼
遍历所有 Controller 的所有路由
  │
  ├── 路由匹配（支持 :param）
  │    作用：将 /users/:id 转正则，匹配路径
  │    逻辑：pattern 中的 :id → ([^/]+)
  │         执行 match，提取 params
  │
  ├── 匹配成功 ──→ executeRequestChain
  │                    │
  │                    ▼
  │              请求处理链（按顺序执行）
  │                    │
  │         ┌──────────┴──────────┐
  │         ▼                     ▼
  │    Guard.canActivate     跳过 Guard
  │    (返回 false → 403)    (未定义则不执行)
  │         │                     │
  │         └──────────┬──────────┘
  │                    ▼
  │         解析参数装饰器（@Body/@Param/@Query）
  │         构建 handler 的参数列表
  │                    │
  │                    ▼
  │              Pipe.transform
  │         (参数转换/校验，可选)
  │                    │
  │                    ▼
  │           Interceptor.intercept
  │         (AOP 切面，包裹 Handler，可选)
  │                    │
  │                    ▼
  │              Handler 执行
  │         (处理业务逻辑，返回数据)
  │                    │
  │                    ▼
  │            res.json(result)
  │          统一 JSON 响应
  │
  ├── 匹配失败 ──→ 404 Not Found
  │
  └── 异常捕获 ──→ 500 Internal Server Error
```

## 核心机制解析

### 1. 装饰器体系

| 装饰器 | 作用 | 存储的元数据 |
|--------|------|-------------|
| `@Module({controllers, providers, imports})` | 定义模块 | controllers/providers/imports 列表 |
| `@Controller({ prefix })` | 定义控制器前缀 | prefix 路径前缀 |
| `@Injectable()` | 标记可注入 | injectable: true |
| `@Get('/path')` / `@Post('/path')` | 定义路由 | { method, path, handlerName } |
| `@Body()` / `@Param('id')` / `@Query('name')` | 标记参数来源 | { type, key } |

**元数据存储原理**：NestJS 通过 `Reflect.defineMetadata` 将装饰器信息挂在类原型上，运行时通过 `Reflect.getMetadata` 读取。我们的最小实现也使用 `reflect-metadata`，与真实 NestJS 一致。

### 2. DI 容器

```
DI 容器解析过程：

resolve(UserController)
  │
  ├── 获取构造参数类型：Reflect.getMetadata('design:paramtypes', UserController)
  │    返回：[UserService]
  │
  ├── resolve(UserService)
  │     ├── 获取构造参数类型：[]（空，无依赖）
  │     ├── 创建实例：new UserService()
  │     └── 返回 UserService 实例
  │
  └── 创建实例：new UserController(userServiceInstance)
      └── 返回 UserController 实例（含注入的 UserService）
```

### 3. 请求处理链

| 组件 | 类比 | 作用 |
|------|------|------|
| **Guard** | 保安 | 请求能否通过（身份/权限校验） |
| **Pipe** | 质检员 | 参数转换/校验（类型转换、必填检查） |
| **Interceptor** | 包装工 | AOP 切面：日志、事务、缓存、耗时统计 |
| **Handler** | 工人 | 实际业务处理 |

## 最小实现 vs NestJS 源码

| 功能 | 我们的实现 | NestJS 源码 |
|------|-----------|-------------|
| 装饰器 | `Reflect.defineMetadata` + 装饰器工厂 | `Reflect.defineMetadata` + 装饰器工厂 |
| DI 容器 | 手动遍历 `design:paramtypes` | `InstanceLoader` + `ModuleRef`，支持作用域、循环依赖 |
| 模块系统 | 递归收集 imports 的 controller/provider | `ModuleScanner` + `ModuleCompiler`，支持动态模块、全局模块 |
| 路由匹配 | 线性遍历所有路由 + 正则匹配 | `RoutesResolver` + `RouterExplorer`，基于 Express/Koa Router |
| 请求处理链 | 顺序执行 Guard/Pipe/Interceptor/Handler | `PipesConsumer` + `GuardsConsumer` + `InterceptorsConsumer`，完整异常处理 |
| 依赖注入 | 简单递归构造 | 基于 `Injector`，支持 `@Inject()`、`@Optional()`、`@ForwardRef()` |
| 参数装饰器 | 解析 @Body/@Param/@Query 元数据 | 完整的 `RouteParamFactory`，支持自定义参数装饰器 |

---

## 常见问题

### Q1: NestJS 的 DI 容器和普通 new 有什么区别？

**DI 容器自动管理依赖的创建和注入**。手动 `new UserController(new UserService())` 需要调用者了解所有依赖关系，DI 容器通过反射自动完成。更重要的是，DI 容器支持单例/作用域控制、模块隔离、循环依赖解决等高级特性。

### Q2: 为什么 NestJS 能通过装饰器实现依赖注入？

NestJS 利用 TypeScript 的 `emitDecoratorMetadata` 和 `reflect-metadata` 库。`design:paramtypes` 元数据记录了构造函数的参数类型，DI 容器据此知道需要注入什么类型的依赖。

### Q3: Guard、Pipe、Interceptor 的执行顺序是怎样的？

**Guard → Interceptor(前) → Pipe → Handler → Interceptor(后)**。Guard 最先执行决定请求是否放行，Interceptor 可以包裹 Handler 实现 AOP（前/后处理），Pipe 在 Handler 之前做参数转换校验。

---

## 参考

- 源码：[nestjs-mini/package.json](../../code/node/nestjs-mini/package.json)（完整目录见 `blog/code/node/nestjs-mini/`）
- 上一篇：[登录注册实战](./05-登录注册实战)
- 下一篇：[NestJS 项目模板](./12-NestJS%20项目模板)
