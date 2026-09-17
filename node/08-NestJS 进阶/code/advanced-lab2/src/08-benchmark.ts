/**
 * 08 - 切换 Fastify 平台：同一份业务代码换适配器的压测对比
 *
 * 用一个最小的 /ping 控制器，分别挂到 Express（默认）与 Fastify 适配器上，
 * 用 autocannon 以同样的连接数与时长各压一轮，打印实测 req/s。
 *
 * 运行：npm run 08bench
 */
import 'reflect-metadata'

import { Controller, Get, Module } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'

const autocannon = require('autocannon')

@Controller()
class PingController {
    @Get('ping')
    ping() {
        return { ok: true }
    }
}

@Module({ controllers: [PingController] })
class BenchModule {}

const CONNECTIONS = 100
const DURATION = 5

function portOf(app: any): number {
    return (app.getHttpServer().address() as { port: number }).port
}

async function bench(label: string, app: any) {
    const port = portOf(app)
    const result = await autocannon({
        url: `http://127.0.0.1:${port}/ping`,
        connections: CONNECTIONS,
        duration: DURATION
    })
    console.log(
        `  ${label.padEnd(8)} ${Math.round(result.requests.average).toLocaleString('en-US')} req/s` +
            `   latency avg ${result.latency.average} ms / p99 ${result.latency.p99} ms` +
            `   吞吐 ${(result.throughput.average / 1024).toFixed(1)} KB/s`
    )
    return result
}

async function main() {
    const expressApp = await NestFactory.create<NestExpressApplication>(BenchModule, { logger: false })
    await expressApp.listen(0, '127.0.0.1')
    const expressPort = portOf(expressApp)

    const fastifyApp = await NestFactory.create<NestFastifyApplication>(BenchModule, new FastifyAdapter(), {
        logger: false
    })
    await fastifyApp.listen(0, '127.0.0.1')
    const fastifyPort = portOf(fastifyApp)

    console.log(`=== autocannon GET /ping · ${CONNECTIONS} 连接 · ${DURATION} 秒 ===`)
    console.log(`  Express  http://127.0.0.1:${expressPort}/ping`)
    console.log(`  Fastify  http://127.0.0.1:${fastifyPort}/ping\n`)

    const check = await fetch(`http://127.0.0.1:${expressPort}/ping`)
    console.log(`  同一个 PingController 返回：${await check.text()}\n`)

    const e = await bench('Express', expressApp)
    const f = await bench('Fastify', fastifyApp)

    console.log(`\n  Fastify / Express = ${(f.requests.average / e.requests.average).toFixed(2)} 倍`)

    await expressApp.close()
    await fastifyApp.close()
}

void main()
