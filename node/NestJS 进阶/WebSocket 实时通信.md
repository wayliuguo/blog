# WebSocket 实时通信

> NestJS 内置了 WebSocket 支持，通过 Gateway 实现实时双向通信。

---

## 安装依赖

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
npm install -D @types/socket.io
```

## 基础 Gateway

> 摘自 `./code/advanced-lab/src/05-websocket-gateway.ts`（运行：`npm run 05gateway`）

```typescript
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
```

实测输出（`npm run 05gateway`，脚本用 `socket.io-client` 连上去，前 3 段）：

```
=== 1) 两个客户端连上 /chat 命名空间 ===
客户端已连接: sJgVlh21UG_n5JGBAAAA
客户端已连接: evbyaLA68ryKEq0zAAAB
  alice=sJgVlh21UG_n5JGBAAAA bob=evbyaLA68ryKEq0zAAAB

=== 2) alice 发一条 message：server.emit 广播，两个人都收到 ===
  alice 收到：{"clientId":"sJgVlh21UG_n5JGBAAAA","content":"大家好","timestamp":"2026-09-17T07:11:59.878Z"}
  bob   收到：{"clientId":"sJgVlh21UG_n5JGBAAAA","content":"大家好","timestamp":"2026-09-17T07:11:59.878Z"}

=== 3) 房间：client.join(room) 之后，client.to(room) 只推给同房间的人 ===
  bob 收到：sJgVlh21UG_n5JGBAAAA 加入了房间 room-A
  （alice 自己不会收到——client.to(room) 不包含发送者）
```

对比第 2 段和第 3 段：`server.emit` 只写事件名，同一个命名空间里所有人（含自己）都收到；`client.to(room).emit` 多了个房间限定，而且**不含发送者**，所以 bob 收到了 alice 的入房通知、alice 自己没收到。

## 在模块中注册

> 摘自 `./code/advanced-lab/src/05-websocket-gateway.ts`（运行：`npm run 05gateway`）

```typescript
@Module({
    providers: [ChatGateway]
})
export class ChatModule {}
```

把它写进 `AppModule` 的 `imports` 之后，`/chat` 命名空间才会挂到 io server 上——上面第 1 段那两行「客户端已连接」就是它生效的证明。

## 带身份验证的 Gateway

> 摘自 `./code/advanced-lab/src/05-websocket-gateway.ts`（运行：`npm run 05gateway`）

```typescript
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

// …（AuthService.validateToken 就是用真实的 @nestjs/jwt 验签，验不过会抛错）

    async validateToken(token: string) {
        const payload = this.jwtService.verify<{ sub: number; email: string }>(token)
        return { id: payload.sub, email: payload.email }
    }
```

实测输出（`npm run 05gateway` 第 5、6 段；坏 token 连接后立刻被服务端踢掉，好 token 则能拿到私信，`from` 就是 `client.data.user.id`）：

```
=== 5) 连接时校验 token：坏的直接 disconnect ===
  带坏 token 连接 → 收到 disconnect（reason: io server disconnect）
  carol(id=1)、dave(id=2) 都连上了

=== 6) 私信：client.to(目标 socket id) 定向推送，from 来自 client.data.user ===
  dave 收到：{"from":1,"content":"这条只发给你"}
```

`client.handshake.auth.token` 对应客户端连接时的 `io(url, { auth: { token } })`；验证通过后把用户挂在 `client.data` 上，后面每个 handler 里都能直接读，不用再验一次。

## 生产场景：实时消息通知

```
客户端 A   ──→  Gateway  ──→  服务器处理
    │                            │
    │                     ┌──────┴──────┐
    │                     │ 存入数据库   │
    │                     │ 检查对方在线  │
    │                     └──────┬──────┘
    │                            │
    └──── server.emit('message') ──→  客户端 B
```

## 与 HTTP 控制器共享服务

> 摘自 `./code/advanced-lab/src/05-websocket-gateway.ts`（运行：`npm run 05gateway`）

```typescript
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
```

实测输出（`npm run 05gateway` 第 4 段，一次 HTTP POST 触发了 WebSocket 广播）：

```
=== 4) HTTP 控制器触发 WS 广播：NotificationService 共享同一个 server ===
  POST /notify → 201 {"sent":"notice"}
  alice 在 WS 上收到：{"text":"由 HTTP 接口触发的广播"}
```

`setServer` 是给 `NotificationService` 注入 io server 的地方——真实项目里在网关的 `afterInit(server)` 里调一次即可，脚本为了少一堆样板代码，直接从容器里取 `ChatGateway.server` 塞进去。

## 配套代码

本篇的可运行示例在仓库 `node/NestJS 进阶/code/advanced-lab`：一个真实 `@nestjs/*` + socket.io 的聊天服务，脚本自己用 `socket.io-client` 连上去，把连接、广播、入房间、私信、鉴权失败被踢、HTTP 触发广播都跑一遍。

| 文件 | 说明 | 对应小节 |
| --- | --- | --- |
| `./code/advanced-lab/src/05-websocket-gateway.ts` | `ChatGateway`（连接钩子 + 广播 + 房间）、`ChatModule` 注册、带 token 鉴权的 `AuthGateway`、被 HTTP 控制器复用的 `NotificationService` | 基础 Gateway · 在模块中注册 · 带身份验证的 Gateway · 与 HTTP 控制器共享服务 |
| `../网络编程与实时通信/code/net-lab/src/08-websocket.js` | 原生 WebSocket 与心跳（对照 Gateway 到底封装了什么） | 基础 Gateway |

运行方式：`code/advanced-lab` 目录下 `npm install` 后 `npm run 05gateway`；原生版在 `code/net-lab` 下 `npm run 08`。

---

## 参考

- 本模块总结：[总结](../NestJS%20入门/总结.md)
- 本模块面试题：[面试题](../NestJS%20入门/面试题.md)
- 上一篇：[文件上传实战](./文件上传实战)
- 下一篇：[定时任务与队列](./定时任务与队列)