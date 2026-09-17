/**
 * 05 - WebSocket 实时通信：Gateway、房间、连接时鉴权、HTTP 与 WS 共享 Service
 *
 * 真实的 Nest + socket.io：起两个命名空间的网关，再用 socket.io-client 连上去，
 * 把「连接 / 广播 / 入房间 / 私信 / 鉴权失败被踢 / HTTP 触发广播」都跑一遍。
 *
 * 运行：npm run 05gateway
 */
import { Body, Controller, Injectable, Module, Post } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { JwtModule, JwtService } from '@nestjs/jwt'
import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { io, Socket as ClientSocket } from 'socket.io-client'

const JWT_SECRET = 'lab-only-secret'

// ====== 1) 基础 Gateway ======
@WebSocketGateway({
    cors: { origin: '*' },
    namespace: '/chat' // 命名空间，可选
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server

    // 客户端连接
    handleConnection(client: Socket) {
        console.log(`客户端已连接: ${client.id}`)
    }

    // 客户端断开
    handleDisconnect(client: Socket) {
        console.log(`客户端已断开: ${client.id}`)
    }

    // 接收消息
    @SubscribeMessage('message')
    handleMessage(client: Socket, payload: { content: string; room?: string }) {
        // 广播给所有客户端
        this.server.emit('message', {
            clientId: client.id,
            content: payload.content,
            timestamp: new Date()
        })
    }

    // 加入房间
    @SubscribeMessage('join')
    handleJoin(client: Socket, room: string) {
        client.join(room)
        client.to(room).emit('notification', `${client.id} 加入了房间 ${room}`)
    }
}

// ====== 2) 在模块中注册 ======
@Module({
    providers: [ChatGateway]
})
export class ChatModule {}

// ====== 3) 带身份验证的 Gateway ======
@Injectable()
export class AuthService {
    constructor(private readonly jwtService: JwtService) {}

    issueToken(user: { id: number; email: string }) {
        return this.jwtService.sign({ sub: user.id, email: user.email })
    }

    async validateToken(token: string) {
        const payload = this.jwtService.verify<{ sub: number; email: string }>(token)
        return { id: payload.sub, email: payload.email }
    }
}

@WebSocketGateway({ cors: { origin: '*' } })
export class AuthGateway {
    constructor(private authService: AuthService) {}

    // 在连接时验证 token
    async handleConnection(client: Socket) {
        const token = client.handshake.auth.token
        try {
            const user = await this.authService.validateToken(token)
            client.data.user = user // 将用户信息挂到 client 上
        } catch {
            client.disconnect()
        }
    }

    @SubscribeMessage('privateMessage')
    handlePrivate(client: Socket, payload: { to: string; content: string }) {
        // 向指定用户发送私信
        client.to(payload.to).emit('privateMessage', {
            from: client.data.user.id,
            content: payload.content
        })
    }
}

// ====== 4) 与 HTTP 控制器共享服务 ======
@Injectable()
export class NotificationService {
    private server: Server

    setServer(server: Server) {
        this.server = server
    }

    // 在 HTTP 控制器中调用，广播通知
    notifyAll(event: string, data: any) {
        this.server.emit(event, data)
    }

    // 向指定房间发送
    notifyRoom(room: string, event: string, data: any) {
        this.server.to(room).emit(event, data)
    }
}

@Controller('notify')
export class NotifyController {
    constructor(private readonly notificationService: NotificationService) {}

    @Post()
    broadcast(@Body() body: { event: string; data: unknown }) {
        this.notificationService.notifyAll(body.event, body.data)
        return { sent: body.event }
    }

    @Post('room')
    broadcastRoom(@Body() body: { room: string; event: string; data: unknown }) {
        this.notificationService.notifyRoom(body.room, body.event, body.data)
        return { sent: body.event, room: body.room }
    }
}

@Module({
    imports: [JwtModule.register({ secret: JWT_SECRET })],
    controllers: [NotifyController],
    providers: [AuthGateway, AuthService, NotificationService]
})
export class NotifyModule {}

@Module({
    imports: [ChatModule, NotifyModule]
})
class AppModule {}

/** 等一个事件；超时就返回提示，别让脚本卡死 */
function waitFor(socket: ClientSocket, event: string, timeoutMs = 3000) {
    return new Promise<unknown>(resolve => {
        const timer = setTimeout(() => resolve(`<${timeoutMs}ms 内没收到 ${event}>`), timeoutMs)
        socket.once(event, (payload: unknown) => {
            clearTimeout(timer)
            resolve(payload)
        })
    })
}

function waitConnect(socket: ClientSocket) {
    return new Promise<void>(resolve => {
        if (socket.connected) return resolve()
        socket.once('connect', () => resolve())
    })
}

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { logger: false })
    await app.listen(0, '127.0.0.1')
    const port = (app.getHttpServer().address() as { port: number }).port
    const base = `http://127.0.0.1:${port}`

    // 真实项目里可以在网关的 afterInit(server) 里 setServer；这里直接从容器里取
    app.get(NotificationService).setServer(app.get(ChatGateway).server)

    console.log('=== 1) 两个客户端连上 /chat 命名空间 ===')
    const alice = io(`${base}/chat`)
    const bob = io(`${base}/chat`)
    await Promise.all([waitConnect(alice), waitConnect(bob)])
    console.log(`  alice=${alice.id} bob=${bob.id}`)

    console.log('\n=== 2) alice 发一条 message：server.emit 广播，两个人都收到 ===')
    const aliceGets = waitFor(alice, 'message')
    const bobGets = waitFor(bob, 'message')
    alice.emit('message', { content: '大家好' })
    console.log(`  alice 收到：${JSON.stringify(await aliceGets)}`)
    console.log(`  bob   收到：${JSON.stringify(await bobGets)}`)

    console.log('\n=== 3) 房间：client.join(room) 之后，client.to(room) 只推给同房间的人 ===')
    bob.emit('join', 'room-A')
    await new Promise(resolve => setTimeout(resolve, 200))
    const bobRoomNotice = waitFor(bob, 'notification')
    alice.emit('join', 'room-A')
    console.log(`  bob 收到：${await bobRoomNotice}`)
    console.log('  （alice 自己不会收到——client.to(room) 不包含发送者）')

    console.log('\n=== 4) HTTP 控制器触发 WS 广播：NotificationService 共享同一个 server ===')
    const httpNotice = waitFor(alice, 'notice')
    const res = await fetch(`${base}/notify`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ event: 'notice', data: { text: '由 HTTP 接口触发的广播' } })
    })
    console.log(`  POST /notify → ${res.status} ${JSON.stringify(await res.json())}`)
    console.log(`  alice 在 WS 上收到：${JSON.stringify(await httpNotice)}`)

    console.log('\n=== 5) 连接时校验 token：坏的直接 disconnect ===')
    const bad = io(base, { auth: { token: 'not-a-jwt' } })
    const badDisconnect = waitFor(bad, 'disconnect')
    console.log(`  带坏 token 连接 → 收到 disconnect（reason: ${await badDisconnect}）`)
    bad.close()

    const carolToken = app.get(AuthService).issueToken({ id: 1, email: 'carol@ex.com' })
    const daveToken = app.get(AuthService).issueToken({ id: 2, email: 'dave@ex.com' })
    const carol = io(base, { auth: { token: carolToken } })
    const dave = io(base, { auth: { token: daveToken } })
    await Promise.all([waitConnect(carol), waitConnect(dave)])
    console.log(`  carol(id=1)、dave(id=2) 都连上了`)

    console.log('\n=== 6) 私信：client.to(目标 socket id) 定向推送，from 来自 client.data.user ===')
    const daveGets = waitFor(dave, 'privateMessage')
    carol.emit('privateMessage', { to: dave.id, content: '这条只发给你' })
    console.log(`  dave 收到：${JSON.stringify(await daveGets)}`)

    console.log('\n=== 7) 断线钩子 ===')
    bob.close()
    await new Promise(resolve => setTimeout(resolve, 300))
    console.log('  上面那行「客户端已断开: ...」就是 handleDisconnect 打的')

    for (const s of [alice, bob, carol, dave]) s.close()
    await app.close()

    console.log('\n说明：/chat 是命名空间（同一端口上多路复用），房间是 namespace 内部的再分组。')
    console.log('说明：连接时就把 token 验掉、用户挂到 client.data 上，后续 handler 随取随用。')
}

void bootstrap()
