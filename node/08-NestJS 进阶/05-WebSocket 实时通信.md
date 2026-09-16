# WebSocket 实时通信

> NestJS 内置了 WebSocket 支持，通过 Gateway 实现实时双向通信。
> 承上：[WebSocket 与 SSE 实时通信](../03-网络编程与实时通信/03-WebSocket%20与%20SSE%20实时通信) —— 先理解 WS 协议与握手，才看得懂 Gateway 在封装什么；以及 [自定义装饰器](./01-自定义装饰器) —— 带身份验证的 Gateway 要在连接时读 token，思路来自装饰器与 Guard
> 启下：[定时任务与队列](./06-定时任务与队列) —— 用 `@Cron` 跑周期任务，并用 Bull 队列把发邮件这类异步任务丢给消费者、配置重试与延迟

---

## 安装依赖

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
npm install -D @types/socket.io
```

## 基础 Gateway

```typescript
import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'

@WebSocketGateway({
    cors: { origin: '*' },
    namespace: '/chat',        // 命名空间，可选
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
            timestamp: new Date(),
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

## 在模块中注册

```typescript
import { Module } from '@nestjs/common'

@Module({
    providers: [ChatGateway],
})
export class ChatModule {}
```

## 带身份验证的 Gateway

```typescript
import { WebSocketGateway, SubscribeMessage, WsException } from '@nestjs/websockets'
import { Socket } from 'socket.io'
import { AuthService } from '../auth/auth.service'

@WebSocketGateway({ cors: { origin: '*' } })
export class AuthGateway {
    constructor(private authService: AuthService) {}

    // 在连接时验证 token
    async handleConnection(client: Socket) {
        const token = client.handshake.auth.token
        try {
            const user = await this.authService.validateToken(token)
            client.data.user = user  // 将用户信息挂到 client 上
        } catch {
            client.disconnect()
        }
    }

    @SubscribeMessage('privateMessage')
    handlePrivate(client: Socket, payload: { to: string; content: string }) {
        // 向指定用户发送私信
        client.to(payload.to).emit('privateMessage', {
            from: client.data.user.id,
            content: payload.content,
        })
    }
}
```

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

```typescript
import { Injectable } from '@nestjs/common'
import { Server } from 'socket.io'

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

## 小结

- **Gateway 就是 WebSocket 层的 Controller**：`@WebSocketGateway({ cors, namespace })` 声明，并且要作为 provider 写进模块
- **两个连接钩子**：实现 `OnGatewayConnection` 的 `handleConnection` 与 `OnGatewayDisconnect` 的 `handleDisconnect`
- **@WebSocketServer() 拿到服务端实例**：`server.emit` 全局广播，`client.to(room).emit` 定向推送给房间
- **@SubscribeMessage 处理客户端消息**：回调签名 `(client, payload)`，房间用 `client.join(room)` 加入
- **连接时就要校验 token**：从 `client.handshake.auth.token` 取令牌，验证失败直接 `client.disconnect()` 断开
- **用户信息挂在 client.data 上**：验证通过后 `client.data.user = user`，后续的消息处理器里随取随用
- **HTTP 与 WS 共享同一个 Service**：把 server 注入 NotificationService，HTTP 控制器也能触发 WebSocket 广播

---

## 配套代码

本篇的可运行示例在仓库 `node/03-网络编程与实时通信/code/net-lab`。

| 文件 | 演示什么 |
| --- | --- |
| `08-websocket.js` | 原生 WebSocket 与心跳（对照 NestJS Gateway） |

运行方式见 `net-lab/README.md`。

---

## 参考

- 本模块总结：[总结](../07-NestJS 入门/总结.md)
- 本模块面试题：[面试题](../07-NestJS 入门/面试题.md)
- 上一篇：[文件上传实战](./04-文件上传实战)
- 下一篇：[定时任务与队列](./06-定时任务与队列)