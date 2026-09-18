/**
 * 12 - IoC 与依赖注入原理
 *
 * 四组对照，最后用真实容器跑一遍：
 *   1) 没有 IoC：手动 new 出整条依赖网
 *   2) 有 IoC：只声明构造参数类型，容器读 design:paramtypes 递归注入
 *   3) 自定义 Token：Symbol + useValue + @Inject
 *   4) Provider 作用域：DEFAULT 单例 / REQUEST 每请求一份 / TRANSIENT 每次注入一份
 *
 * 运行：npm run 12ioc
 */
import 'reflect-metadata'
import { Controller, Get, Inject, Injectable, Module, Scope } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'

// ====== 1) 没有 IoC：手动 new 出整条依赖网 ======
function manualWiringWithoutIoC() {
    class Redis {
        readonly kind = 'redis-client'
    }
    class UserRepository {
        constructor(readonly redis: Redis) {}
    }
    class EmailService {
        constructor(readonly redis: Redis) {}
    }
    class UserService {
        constructor(
            readonly userRepo: UserRepository,
            readonly emailService: EmailService
        ) {}
    }
    class AuthService {
        constructor(
            readonly userService: UserService,
            readonly emailService: EmailService,
            readonly redis: Redis
        ) {}
    }
    class UserController {
        constructor(readonly userService: UserService) {}
    }

    // 没有 IoC：你手动 new 出整条依赖网，越写越乱
    const redis = new Redis()
    const userRepo = new UserRepository(redis)
    const emailService = new EmailService(redis)
    const userService = new UserService(userRepo, emailService)
    const authService = new AuthService(userService, emailService, redis)
    const userController = new UserController(userService)
    // 改一个构造参数，上面全要跟着改

    return { redis, userRepo, emailService, userService, authService, userController }
}

// ====== 2) 有 IoC：只声明，不创建 ======
@Injectable()
export class UserService {
    findAll() {
        return [{ id: 1, name: '张三' }]
    }
}

// 有 NestJS：只声明，不创建
@Controller('users')
export class UserController {
    // 这行 = "我需要一个 UserService 实例"，由容器注入
    constructor(private readonly userService: UserService) {}
}

// ====== 3) 自定义 Token：Symbol + useValue + @Inject ======
// 自定义 Token（用 Symbol 或字符串）
export const CONFIG = Symbol('CONFIG')

@Module({
    providers: [{ provide: CONFIG, useValue: { jwtSecret: 'my-secret', expiresIn: '15m' } }]
})
export class AppModule {}

// 使用方必须用 @Inject 指名 Token
@Injectable()
export class AuthService {
    constructor(@Inject(CONFIG) private config: { jwtSecret: string }) {}
}

// useFactory / useExisting 的写法（Token 不是类时同样要 @Inject 指名）
export const REPO = Symbol('REPO')
export const REPO_ALIAS = Symbol('REPO_ALIAS')

class UserRepository {
    readonly tag = 'user-repository'
}

// ====== 4) 作用域：DEFAULT / REQUEST / TRANSIENT ======
@Injectable()
class DefaultScopedService {
    private static counter = 0
    readonly seq = ++DefaultScopedService.counter
}

@Injectable({ scope: Scope.REQUEST })
export class RequestContext {
    // 每个请求一个独立实例，可安全存当前请求的信息
    private static counter = 0
    readonly seq = ++RequestContext.counter
}

@Injectable({ scope: Scope.TRANSIENT })
class TransientService {
    private static counter = 0
    readonly seq = ++TransientService.counter
}

@Injectable()
class ConsumerA {
    constructor(
        readonly defaultScoped: DefaultScopedService,
        readonly requestScoped: RequestContext,
        readonly transient: TransientService
    ) {}
}

@Injectable()
class ConsumerB {
    constructor(
        readonly defaultScoped: DefaultScopedService,
        readonly requestScoped: RequestContext,
        readonly transient: TransientService
    ) {}
}

// ====== 5) 跨模块注入：要被用，先注册；要跨模块，先导出；要用别人，先导入 ======
@Injectable()
class XxxService {
    readonly tag = 'xxx-service'
}

// 提供方 Module：注册 + 导出
@Module({
    providers: [XxxService],
    exports: [XxxService]
})
export class XxxModule {}

@Controller('yyy')
class YyyController {
    constructor(private readonly xxxService: XxxService) {}
}

// 使用方 Module：imports 引入
@Module({
    imports: [XxxModule],
    controllers: [YyyController]
})
export class YyyModule {}

// ====== 把上面几段拼成一个能真跑的容器 ======
@Controller('scope')
class ScopeController {
    constructor(
        private readonly a: ConsumerA,
        private readonly b: ConsumerB
    ) {}

    @Get()
    snapshot() {
        return {
            default: [this.a.defaultScoped.seq, this.b.defaultScoped.seq],
            request: [this.a.requestScoped.seq, this.b.requestScoped.seq],
            transient: [this.a.transient.seq, this.b.transient.seq]
        }
    }
}

@Module({
    imports: [XxxModule],
    controllers: [UserController, ScopeController],
    providers: [
        { provide: CONFIG, useValue: { jwtSecret: 'my-secret', expiresIn: '15m' } },
        {
            provide: REPO,
            // useFactory：需要运行时逻辑或依赖其他 Provider 时用它
            useFactory: () => new UserRepository()
        },
        // useExisting：给同一个实例起个别名，两个 Token 拿到的是同一个对象
        { provide: REPO_ALIAS, useExisting: REPO },
        AuthService,
        UserService,
        DefaultScopedService,
        RequestContext,
        TransientService,
        ConsumerA,
        ConsumerB
    ]
})
class IocDemoModule {}

async function call(base: string, path: string) {
    const http = await import('node:http')
    return new Promise<string>((resolve, reject) => {
        const req = http.request(`${base}${path}`, res => {
            let buf = ''
            res.on('data', c => (buf += c))
            res.on('end', () => resolve(`${path} -> ${res.statusCode} ${buf}`))
        })
        req.on('error', reject)
        req.end()
    })
}

async function bootstrap() {
    const manual = manualWiringWithoutIoC()
    console.log('=== 1) 手动 new：整条依赖网自己拼 ===')
    console.log(`为了拿到 userController，一共 new 了 6 个对象`)
    console.log(
        `redis 是同一个实例（全靠人肉传同一个变量）：${manual.authService.redis === manual.userService.userRepo.redis}`
    )

    const app = await NestFactory.create(IocDemoModule, { logger: ['error', 'warn'] })
    await app.listen(0, '127.0.0.1')
    const port = (app.getHttpServer().address() as { port: number }).port
    const base = `http://127.0.0.1:${port}`

    console.log('\n=== 2) 容器按类型注入：UserController 从没 new 过 UserService ===')
    const controller = app.get(UserController) as any
    console.log(
        `app.get(UserController).userService instanceof UserService = ${
            controller['userService'] instanceof UserService
        }`
    )

    console.log('\n=== 3) 自定义 Token ===')
    const authService = app.get(AuthService) as any
    console.log(`app.get(CONFIG) = ${JSON.stringify(app.get(CONFIG))}`)
    console.log(`AuthService 注入到的是同一个对象：${authService['config'] === app.get(CONFIG)}`)
    console.log(`useExisting 起的别名与本体同源：${app.get(REPO_ALIAS) === app.get(REPO)}`)

    console.log('\n=== 5) 跨模块注入（IocDemoModule imports XxxModule 并拿到 exports 的 XxxService）===')
    console.log(`app.get(XxxService).tag = ${app.get(XxxService).tag}`)

    console.log('\n=== 4) 作用域：同一个接口连请求两次，看 seq 变化 ===')
    console.log(`  第一次 ${await call(base, '/scope')}`)
    console.log(`  第二次 ${await call(base, '/scope')}`)
    console.log('  default  两次都是同一组序号 → DEFAULT 是单例，请求间共享')
    console.log('  request  每次请求序号都变、但请求内两个使用方拿到同一个 → 每请求一份')
    console.log('  transient 同一请求内两个使用方的序号就不同 → 每次注入都新建')

    await app.close()
}

void bootstrap()
