/**
 * 07 - 微服务架构：四种传输方式的配置差异
 *
 * 本脚本只做「配置对照」——把 TCP / Redis / RabbitMQ 的
 * 「微服务端选项」与「网关客户端选项」打印出来，不真的去连中间件
 * （本机没有 RabbitMQ，连不上会一直重试，反而看不到结果）。
 *
 * 想跑通真实链路请看同目录的 microservice-demo（纯 TCP，无需中间件）：
 *   npm run start:user / start:order / start:gateway
 *
 * 运行：npm run 07transports
 */
import { Transport } from '@nestjs/microservices'

// ====== 微服务端：NestFactory.createMicroservice(Module, options) 的第二个参数 ======

// 用户微服务：TCP，本机 3001（microservice-demo 用的就是这一份）
export const tcpServerOptions = {
    transport: Transport.TCP,
    options: {
        host: '127.0.0.1',
        port: 3001
    }
}

// RabbitMQ 传输：urls 指向 broker，queue 是消费队列，
// queueOptions.durable = false 表示队列不持久化（broker 重启后队列消失）
export const rmqServerOptions = {
    transport: Transport.RMQ,
    options: {
        urls: ['amqp://localhost:5672'],
        queue: 'user_queue',
        queueOptions: { durable: false }
    }
}

// Redis 传输：基于 Pub/Sub，不需要额外中间件，只要一个能连上的 Redis
export const redisServerOptions = {
    transport: Transport.REDIS,
    options: {
        host: 'localhost',
        port: 6379
    }
}

// ====== 网关客户端：ClientsModule.register([...]) 里的一项 ======
// name 就是后面 @Inject('USER_SERVICE') 用的 Token

export const rmqClientOptions = {
    name: 'USER_SERVICE',
    transport: Transport.RMQ,
    options: {
        urls: ['amqp://localhost:5672'],
        queue: 'user_queue'
    }
}

export const redisClientOptions = {
    name: 'USER_SERVICE',
    transport: Transport.REDIS,
    options: { host: 'localhost', port: 6379 }
}

// ====== 打印对照 ======
const rows: Array<[string, { transport: Transport; options?: unknown }]> = [
    ['TCP   服务端', tcpServerOptions],
    ['RMQ   服务端', rmqServerOptions],
    ['REDIS 服务端', redisServerOptions],
    ['RMQ   客户端', rmqClientOptions],
    ['REDIS 客户端', redisClientOptions]
]

console.log('=== 各传输方式的 transport 与 options ===')
for (const [label, config] of rows) {
    console.log(`${label}  transport = ${config.transport} (${Transport[config.transport]})`)
    console.log(`    options = ${JSON.stringify(config.options)}`)
}

console.log('\n=== Transport 枚举里可直接用的传输类型 ===')
const transports = Object.keys(Transport).filter(key => isNaN(Number(key)))
console.log(transports.join(', '))
