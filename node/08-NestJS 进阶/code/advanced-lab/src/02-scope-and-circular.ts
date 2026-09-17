/**
 * 02 - 作用域与循环依赖
 *
 * 一个能真跑起来的 Nest 应用，用来观察三件事：
 *   1. DEFAULT / REQUEST / TRANSIENT 三种作用域下，实例到底是共用还是新建
 *   2. 服务与服务互相依赖时，forwardRef 怎么把环打破
 *   3. 单例注入了请求作用域的 Provider 之后，会沿依赖链被「传染」成请求作用域
 *
 * 运行：npm run 02scope
 */
import { Injectable, Scope } from '@nestjs/common'
import { Controller, forwardRef, Get, Inject, Module } from '@nestjs/common'
import { NestFactory, REQUEST } from '@nestjs/core'
import type { Request } from 'express'

// 给任意实例取一个稳定编号：同一个实例永远是同一个号，新建的实例拿新号。
// 下面所有「是不是同一个实例」的判断都靠它。
const instanceNoMap = new WeakMap<object, number>()
let instanceNoSeq = 0
export function instanceNo(target: object): number {
    if (!instanceNoMap.has(target)) instanceNoMap.set(target, ++instanceNoSeq)
    return instanceNoMap.get(target)!
}

// ====== 1) 三种 Provider 作用域 ======
// DEFAULT（默认）：单例模式，整个应用共享一个实例
@Injectable()
export class SingletonService {}

// REQUEST：每个请求创建一个新实例
@Injectable({ scope: Scope.REQUEST })
export class RequestScopedService {
    constructor(@Inject(REQUEST) private request: Request) {}
}

// TRANSIENT：每次注入都创建一个新实例
@Injectable({ scope: Scope.TRANSIENT })
export class TransientService {}

// ====== 2) 请求作用域里怎么拿到当前请求 ======
@Injectable({ scope: Scope.REQUEST })
export class RequestLogger {
    constructor(@Inject(REQUEST) private request: Request) {
        console.log('新请求:', request.url)
    }

    log(message: string) {
        console.log(`[${this.request.url}] ${message}`)
    }
}

// ====== 3) 循环依赖：用 forwardRef 打破 ======
//
// 注意这里的参数类型写成了接口（IUser / IOrder）而不是类本身。
// 原因：这一对类在同一个文件里互相引用，而 @Injectable() 会生成 design:paramtypes 元数据，
// 元数据在类定义时就要**求值**——后声明的那个类此时还在 TDZ 里，会直接报
// ReferenceError: Cannot access 'OrderService' before initialization。
// 真实项目里两个类分处两个文件（各自 import 对方），不会踩到这个问题，直接写
// `private readonly orderService: OrderService` 即可；@Inject(forwardRef(...)) 提供的
// token 才是真正决定注入谁的东西。
export interface IUser {
    readonly peer: IOrder
}

export interface IOrder {
    readonly peer: IUser
}

@Injectable()
export class UserService implements IUser {
    constructor(
        @Inject(forwardRef(() => OrderService))
        private readonly orderService: IOrder
    ) {}

    get peer(): IOrder {
        return this.orderService
    }
}

@Injectable()
export class OrderService implements IOrder {
    constructor(
        @Inject(forwardRef(() => UserService))
        private readonly userService: IUser
    ) {}

    get peer(): IUser {
        return this.userService
    }
}

// ====== 4) 模块间循环依赖：同样用 forwardRef ======
@Module({
    imports: [forwardRef(() => OrdersModule)],
    providers: [UserService],
    exports: [UserService]
})
export class UsersModule {}

@Module({
    imports: [forwardRef(() => UsersModule)],
    providers: [OrderService],
    exports: [OrderService]
})
export class OrdersModule {}

// ====== 5) 请求作用域会沿依赖链向上传染 ======
// 如果 A 是单例，但注入了 B（请求作用域）
// 那么 A 实际上也会变成请求作用域
// 这会级联影响所有依赖链上的 Provider
@Injectable() // 原本是单例
export class ReportService {
    constructor(
        private readonly requestLogger: RequestLogger // 请求作用域
    ) {}

    get logger(): RequestLogger {
        return this.requestLogger
    }
}

// ====== 下面是为了让上面几段能真跑起来而写的业务代码 ======

/** 第二个注入 TransientService 的地方：用来对照「TRANSIENT 每次注入都新建」 */
@Injectable()
class TransientProbe {
    constructor(readonly transient: TransientService) {}
}

/** 只注入单例与瞬态，没有任何请求作用域依赖，所以它自己也是单例 */
@Controller('singleton')
class SingletonController {
    constructor(
        private readonly singleton: SingletonService,
        private readonly transient: TransientService
    ) {}

    @Get()
    report() {
        return {
            controller: instanceNo(this),
            singleton: instanceNo(this.singleton),
            transient: instanceNo(this.transient)
        }
    }
}

/** 注入了请求作用域的 Provider，它自己也就被传染成请求作用域了 */
@Controller('scope')
class ScopeController {
    constructor(
        private readonly singleton: SingletonService,
        private readonly transient: TransientService,
        private readonly requestScoped: RequestScopedService,
        private readonly requestLogger: RequestLogger,
        private readonly probe: TransientProbe
    ) {}

    @Get()
    report() {
        this.requestLogger.log('ScopeController 处理了一次请求')
        return {
            controller: instanceNo(this),
            singleton: instanceNo(this.singleton),
            transient: instanceNo(this.transient),
            transientInProbe: instanceNo(this.probe.transient),
            requestScoped: instanceNo(this.requestScoped),
            requestLogger: instanceNo(this.requestLogger)
        }
    }
}

/** 单例 ReportService 注入了请求作用域的 RequestLogger，于是每次请求都重建 */
@Controller('cascade')
class CascadeController {
    constructor(private readonly reportService: ReportService) {}

    @Get()
    report() {
        return {
            controller: instanceNo(this),
            reportService: instanceNo(this.reportService),
            requestLogger: instanceNo(this.reportService.logger)
        }
    }
}

/** 服务间循环依赖被 forwardRef 打破后，两边拿到的是同一个环 */
@Controller('cycle')
class CycleController {
    constructor(
        private readonly userService: UserService,
        private readonly orderService: OrderService
    ) {}

    @Get()
    report() {
        return {
            userService: instanceNo(this.userService),
            userServiceSees: instanceNo(this.userService.peer),
            orderService: instanceNo(this.orderService),
            orderServiceSees: instanceNo(this.orderService.peer),
            cycleClosed: this.userService.peer === this.orderService && this.orderService.peer === this.userService
        }
    }
}

@Module({
    imports: [UsersModule, OrdersModule],
    controllers: [SingletonController, ScopeController, CascadeController, CycleController],
    providers: [SingletonService, TransientService, RequestScopedService, RequestLogger, TransientProbe, ReportService]
})
class AppModule {}

async function hit(base: string, path: string) {
    const res = await fetch(`${base}${path}`)
    console.log(`  GET ${path.padEnd(11)} → ${JSON.stringify(await res.json())}`)
}

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { logger: false })
    await app.listen(0, '127.0.0.1')
    const port = (app.getHttpServer().address() as { port: number }).port
    const base = `http://127.0.0.1:${port}`

    console.log('=== 1) 只注入单例 + 瞬态：控制器自己也是单例，两次请求实例完全相同 ===')
    await hit(base, '/singleton')
    await hit(base, '/singleton')

    console.log('\n=== 2) 注入请求作用域：控制器被传染成请求作用域，每次请求都是新实例 ===')
    await hit(base, '/scope')
    await hit(base, '/scope')

    console.log('\n=== 3) 单例 ReportService 注入了请求作用域的 RequestLogger ===')
    await hit(base, '/cascade')
    await hit(base, '/cascade')

    console.log('\n=== 4) 服务间循环依赖（forwardRef）：两边互相拿到对方，环是闭的 ===')
    await hit(base, '/cycle')

    console.log(
        '\n说明：singleton 两次请求号相同（同一个实例）；requestScoped / requestLogger 每次请求换号（新实例）；'
    )
    console.log(
        '说明：transient 与 transientInProbe 号不同（同一请求里注入两次 = 两个实例）；cascade 的 reportService 每次请求换号（被传染）。'
    )
    console.log(`说明：本次运行共创建了 ${instanceNoSeq} 个带编号的实例。`)

    await app.close()
}

void bootstrap()
