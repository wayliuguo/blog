/**
 * 08 - 切换 Fastify 平台：两个适配器的差异
 *
 * 同一个 Nest 应用分别用 Express（默认）与 Fastify 两种适配器各起一遍，逐个验证：
 *   CORS / 静态资源 / 视图引擎 / Cookie 插件 / 安全头 / 文件上传解析器
 * 最后把两个平台"同名不同写法"的 API 打印对照。
 *
 * 运行：npm run 08fastify
 */
import 'reflect-metadata'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { request } from 'node:http'

import { Controller, Get, Module, Post, Req } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import cookieParser from 'cookie-parser'
import Fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'
import fastifyHelmet from '@fastify/helmet'
import multipart from '@fastify/multipart'

/** 静态资源目录（真实项目里就是项目根下的 uploads/） */
const UPLOADS = join(tmpdir(), 'advanced-lab2-uploads')

// ====== 两个平台各自的控制器 ======

@Controller()
class ExpressPingController {
    @Get('ping')
    ping() {
        return { platform: 'express' }
    }

    @Get('cookies')
    cookies(@Req() req: any) {
        return { cookies: req.cookies }
    }
}

@Module({ controllers: [ExpressPingController] })
class ExpressAppModule {}

@Controller()
class FastifyPingController {
    @Get('ping')
    ping() {
        return { platform: 'fastify' }
    }

    /** 文件上传：注册 @fastify/multipart 后，直接从请求上取文件 */
    @Post('upload')
    async upload(@Req() req: any) {
        const file = await req.file()
        const content = await file.toBuffer()
        return { filename: file.filename, size: content.length }
    }
}

@Module({ controllers: [FastifyPingController] })
class FastifyAppModule {}

// ====== Express 适配器（默认）======
async function startExpress() {
    const app = await NestFactory.create<NestExpressApplication>(ExpressAppModule)

    // Express 特性
    app.useStaticAssets(UPLOADS, { prefix: '/uploads' })
    app.setViewEngine('hbs')
    app.use(cookieParser())

    await app.listen(0, '127.0.0.1')
    return app
}

// ====== Fastify 适配器 ======
async function startFastify(withUploadParser: boolean) {
    const app = await NestFactory.create<NestFastifyApplication>(FastifyAppModule, new FastifyAdapter())

    // Fastify 的 CORS 配置
    app.enableCors({
        origin: ['http://localhost:5173'],
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    })

    // 配置静态资源（Fastify 方式）
    app.useStaticAssets({
        root: UPLOADS,
        prefix: '/uploads/'
    })

    // Express 中间件不能直接搬：换成 Fastify 插件，统一用 app.register() 注册
    await app.register(fastifyCookie as any)
    await app.register(fastifyHelmet as any)

    if (withUploadParser) {
        // 文件上传：还要额外注册 multipart 解析器
        await app.register(multipart as any)
    }

    await app.listen(0, '0.0.0.0')
    return app
}

// ====== 请求工具 ======
function get(base: string, path: string, headers: Record<string, string> = {}) {
    return new Promise<{ status: number; headers: Record<string, any>; body: string }>((resolve, reject) => {
        const req = request(`${base}${path}`, { headers }, res => {
            let body = ''
            res.on('data', c => (body += c))
            res.on('end', () => resolve({ status: res.statusCode!, headers: res.headers, body }))
        })
        req.on('error', reject)
        req.end()
    })
}

function portOf(app: any): number {
    return app.getHttpServer().address().port
}

async function main() {
    // 准备静态资源目录
    mkdirSync(UPLOADS, { recursive: true })
    writeFileSync(join(UPLOADS, 'hello.txt'), 'hello static\n')

    // ====== Fastify ======
    let fastifyApp: NestFastifyApplication
    let uploadParser: string
    try {
        fastifyApp = await startFastify(true)
        uploadParser = '注册成功'
    } catch (err: any) {
        // fastify-multer 内部是 addContentTypeParser('multipart', fn)，
        // 而 Fastify 5 要求 content type 是合法 MIME，裸 'multipart' 会被拒绝
        uploadParser = `注册失败 ${err.code}: ${err.message}`
        fastifyApp = await startFastify(false)
    }
    const fBase = `http://127.0.0.1:${portOf(fastifyApp)}`
    const fastify = fastifyApp.getHttpAdapter().getInstance()

    console.log('=== Fastify 适配器 ===')
    console.log(`服务地址 ${fBase}`)

    const fPing = await get(fBase, '/ping', { origin: 'http://localhost:5173' })
    console.log(`  GET /ping                          -> ${fPing.status} ${fPing.body}`)
    console.log(`    access-control-allow-origin      = ${fPing.headers['access-control-allow-origin']}`)
    console.log(`    x-dns-prefetch-control（helmet）  = ${fPing.headers['x-dns-prefetch-control']}`)

    const fStatic = await get(fBase, '/uploads/hello.txt')
    console.log(`  GET /uploads/hello.txt             -> ${fStatic.status} ${JSON.stringify(fStatic.body)}`)

    console.log(`  reply 上挂上了 setCookie           = ${fastify.hasReplyDecorator('setCookie')}`)
    console.log(`  multipart 解析器                   = ${uploadParser}`)

    await fastifyApp.close()

    // ====== Express ======
    const expressApp = await startExpress()
    const eBase = `http://127.0.0.1:${portOf(expressApp)}`

    console.log('\n=== Express 适配器（默认）===')
    console.log(`服务地址 ${eBase}`)

    const ePing = await get(eBase, '/ping')
    console.log(`  GET /ping                          -> ${ePing.status} ${ePing.body}`)

    const eStatic = await get(eBase, '/uploads/hello.txt')
    console.log(`  GET /uploads/hello.txt             -> ${eStatic.status} ${JSON.stringify(eStatic.body)}`)

    const eCookie = await get(eBase, '/cookies', { cookie: 'sid=abc123; theme=dark' })
    console.log(`  GET /cookies（带 Cookie 头）        -> ${eCookie.status} ${eCookie.body}`)

    await expressApp.close()

    console.log('\n=== 两个平台的 API 对照 ===')
    console.log('  静态资源   Express: useStaticAssets(dir, { prefix })   Fastify: useStaticAssets({ root, prefix })')
    console.log(
        '  视图引擎   Express: setViewEngine("hbs")               Fastify: setViewEngine({ engine, templates })'
    )
    console.log('  Cookie     Express: app.use(cookieParser())            Fastify: app.register(@fastify/cookie)')
    console.log('  安全头     Express: app.use(helmet())                  Fastify: app.register(@fastify/helmet)')
    console.log('  文件上传   Express: FileInterceptor 直接可用            Fastify: 先 register(解析器)')

    rmSync(UPLOADS, { recursive: true, force: true })
}

void main()
