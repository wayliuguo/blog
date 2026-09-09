# WebSocket 实时通信

> NestJS 内置了 WebSocket 支持，通过 Gateway 实现实时双向通信。

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

## 面试题

### Q1: WebSocket 和 HTTP 轮询的优缺点？

WebSocket 全双工通信，实时性高，适合聊天/推送；HTTP 轮询实现简单但延迟高、浪费带宽。NestJS 的 Gateway 封装了连接管理，开发者只需关注业务逻辑。

### Q2: Gateway 如何在 HTTP 控制器中推送消息？

通过共享服务持有 `Server` 实例，在控制器中注入该服务调用 `server.emit()`。

---

## 参考

- 上一篇：[文件上传实战](./06-文件上传实战)
- 下一篇：[定时任务与队列](./08-定时任务与队列)