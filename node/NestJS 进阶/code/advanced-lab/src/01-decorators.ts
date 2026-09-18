/**
 * 01 - 自定义装饰器（参数装饰器 / 方法装饰器 + Reflector / 装饰器组合 / ExecutionContext）
 *
 * 这是一个**能真跑起来**的最小 Nest 应用：全局挂上「造用户 → 记日志 → 查角色」三个守卫，
 * 然后依次请求 /profile、/users、/admin、/documents 四个控制器，把 200 / 403 打出来。
 *
 * 运行：npm run 01decorators
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common'
import { CanActivate, Controller, Delete, Get, Injectable, Module, Param, Post } from '@nestjs/common'
import { NestFactory, Reflector } from '@nestjs/core'
import { APP_GUARD } from '@nestjs/core'

// ====== 1) 参数装饰器：@CurrentUser() ======
// createParamDecorator 的回调签名是 (data, ctx)：
//   - data：装饰器使用处传进来的参数，@CurrentUser() 是 undefined，@CurrentUser('id') 是 'id'
//   - ctx：ExecutionContext，用 ctx.switchToHttp().getRequest() 取到原始请求对象
export const CurrentUser = createParamDecorator((data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    const user = request.user // 假设在 Guard 中已经设置了 user

    // 如果传了参数（如 @CurrentUser('id')），返回指定字段
    return data ? user?.[data] : user
})

// ====== 2) 方法装饰器：@Roles() 只负责打标签 ======
// SetMetadata 返回一个装饰器，把 (key, value) 写进类/方法的元数据，本身不做任何判断
export const Roles = (...roles: string[]) => SetMetadata('roles', roles)

// ====== 3) 配合 Guard 读标签做权限控制 ======
@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        // 获取方法上的 roles 元数据
        const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
            context.getHandler(),
            context.getClass()
        ])

        if (!requiredRoles) return true // 没有设置角色限制，放行

        const { user } = context.switchToHttp().getRequest()
        return requiredRoles.some(role => user.roles?.includes(role))
    }
}

// ====== 4) 装饰器组合：@Auth() ======
// applyDecorators 把多个装饰器合成一个，声明一次、多处生效
export function Auth(...roles: string[]) {
    return applyDecorators(
        SetMetadata('roles', roles),
        UseGuards(RolesGuard)
        // 真实项目里还会合并 Swagger 装饰器，如 ApiBearerAuth()（来自 @nestjs/swagger）
    )
}

// ====== 5) ExecutionContext：守卫里能拿到什么 ======
@Injectable()
export class LogGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        // 获取请求类型
        const type = context.getType() // 'http' | 'rpc' | 'ws'

        // HTTP 上下文
        const request = context.switchToHttp().getRequest()
        const response = context.switchToHttp().getResponse()

        // 获取控制器和方法
        const controller = context.getClass() // UserController
        const handler = context.getHandler() // findAll

        console.log(`[LogGuard] type=${type} 调用: ${controller.name}.${handler.name} ${request.method} ${request.url}`)
        console.log(`[LogGuard] 这个 handler 的返回码将是 ${response.statusCode}`)

        return true
    }
}

// ====== 下面是为了让上面几段能真跑起来而写的业务代码 ======

/** 从请求头造一个 user 挂到 request 上，模拟「认证守卫已经跑过」 */
@Injectable()
class FakeUserGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest()
        request.user = {
            id: Number(request.headers['x-user-id'] ?? 0),
            name: String(request.headers['x-user-name'] ?? '匿名'),
            roles: String(request.headers['x-user-roles'] ?? '')
                .split(',')
                .filter(Boolean)
        }
        return true
    }
}

@Injectable()
class UserService {
    remove(id: number) {
        return { deleted: id }
    }
}

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Roles('admin') // 只有 admin 可以访问
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.userService.remove(+id)
    }
}

@Controller('profile')
export class ProfileController {
    @Get('me')
    getProfile(@CurrentUser() user: { id: number; name: string; roles: string[] }) {
        return user
    }

    @Get('id')
    getProfileId(@CurrentUser('id') userId: number) {
        return { userId }
    }

    @Post('touch')
    touch(@CurrentUser() user: { id: number }) {
        return { touched: user.id }
    }
}

@Controller('admin')
@UseGuards(RolesGuard)
export class AdminController {
    @Roles('admin')
    @Get('stats')
    getStats() {
        return { visits: 42 }
    }
}

@Controller('documents')
export class DocumentController {
    @Auth('admin', 'editor')
    @Delete(':id')
    remove(@Param('id') id: string) {
        return { deleted: id }
    }
}

@Module({
    controllers: [UserController, ProfileController, AdminController, DocumentController],
    providers: [
        RolesGuard,
        LogGuard,
        FakeUserGuard,
        UserService,
        // 全局守卫按注册顺序执行：先造 user，再记日志，最后查角色
        { provide: APP_GUARD, useClass: FakeUserGuard },
        { provide: APP_GUARD, useClass: LogGuard },
        { provide: APP_GUARD, useClass: RolesGuard }
    ]
})
class AppModule {}

/** 带上「当前用户」的请求头，方便一行行对照结果（HTTP 头只能放 ASCII，所以名字用拼音） */
const AS_ADMIN = { 'x-user-id': '1', 'x-user-name': 'boss', 'x-user-roles': 'admin,editor' }
const AS_EDITOR = { 'x-user-id': '2', 'x-user-name': 'editor', 'x-user-roles': 'editor' }
const AS_VIEWER = { 'x-user-id': '3', 'x-user-name': 'guest', 'x-user-roles': 'viewer' }

async function call(base: string, method: string, path: string, headers: Record<string, string> = {}) {
    const res = await fetch(`${base}${path}`, { method, headers })
    const body = await res.text()
    console.log(`  ${method.padEnd(6)} ${path.padEnd(16)} → ${res.status} ${body}`)
}

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { logger: false })
    await app.listen(0, '127.0.0.1')
    const port = (app.getHttpServer().address() as { port: number }).port
    const base = `http://127.0.0.1:${port}`

    console.log('=== 1) @CurrentUser()：整个 user 对象 vs 指定字段 ===')
    await call(base, 'GET', '/profile/me', AS_ADMIN)
    await call(base, 'GET', '/profile/id', AS_VIEWER)
    await call(base, 'POST', '/profile/touch', { ...AS_EDITOR, 'content-type': 'application/json' })

    console.log('\n=== 2) @Roles("admin") + RolesGuard：标签决定放行还是 403 ===')
    await call(base, 'DELETE', '/users/7', AS_ADMIN)
    await call(base, 'DELETE', '/users/7', AS_VIEWER)

    console.log('\n=== 3) 控制器级 @UseGuards(RolesGuard) + 方法级 @Roles() ===')
    await call(base, 'GET', '/admin/stats', AS_ADMIN)
    await call(base, 'GET', '/admin/stats', AS_VIEWER)

    console.log('\n=== 4) @Auth("admin", "editor")：applyDecorators 一次声明两个角色 ===')
    await call(base, 'DELETE', '/documents/9', AS_EDITOR)
    await call(base, 'DELETE', '/documents/9', AS_VIEWER)

    console.log('\n说明：403 是 RolesGuard 抛出的 ForbiddenException，Nest 默认格式化后的响应体就是上面这样。')
    console.log('说明：每一行请求前都有 [LogGuard] 一行，Type 是 http、controller.handler 就是被调用的类与方法。')

    await app.close()
}

void bootstrap()
