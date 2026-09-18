/**
 * 03 - 微信小程序登录：用 code 换 openid，再走和账号密码登录一样的 JWT 签发流程
 *
 * 真实项目里这一步是请求 https://api.weixin.qq.com/sns/jscode2session；
 * 本机跑的时候，文件末尾会起一个本地 stub 顶替微信服务器，所以不用真的 appid/secret
 * 也能把「换 openid → 查找或创建用户 → 签发 JWT」整条链路跑通。
 *
 * 运行：npm run 03wechat
 */
import { Injectable, Module, UnauthorizedException } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { JwtModule, JwtService } from '@nestjs/jwt'
import axios from 'axios'
import http from 'node:http'

const JWT_SECRET = 'lab-only-secret'

/** 真实的微信接口地址；本机演示时由 useLocalWechatStub() 指向本地 stub */
let wechatEndpoint = 'https://api.weixin.qq.com/sns/jscode2session'
export function useLocalWechatStub(url: string) {
    wechatEndpoint = url
}

/** 用户表里的一行 */
interface UserRow {
    id: number
    wechatOpenId: string
}

/** 演示用的内存版用户表，方法名照着 TypeORM Repository 写 */
@Injectable()
export class UserRepository {
    private readonly rows: UserRow[] = []
    private seq = 0

    async findOneBy(where: Partial<UserRow>): Promise<UserRow | null> {
        return this.rows.find(row => row.wechatOpenId === where.wechatOpenId) ?? null
    }

    create(data: Partial<UserRow>): UserRow {
        return { id: 0, wechatOpenId: '', ...data }
    }

    async save(row: UserRow): Promise<UserRow> {
        row.id = ++this.seq
        this.rows.push(row)
        return row
    }
}

@Injectable()
export class WechatAuthService {
    constructor(
        private userRepository: UserRepository,
        private jwtService: JwtService
    ) {}

    async wechatLogin(code: string) {
        // 1. 用 code 向微信服务器换取 session_key 和 openid
        const response = await axios.get(wechatEndpoint, {
            params: {
                appid: 'your-app-id',
                secret: 'your-app-secret',
                js_code: code,
                grant_type: 'authorization_code'
            }
        })

        // 微信出错时返回的是 HTTP 200 + errcode，必须自己判
        if (response.data.errcode) {
            throw new UnauthorizedException(`微信登录失败：${response.data.errmsg}`)
        }

        const { openid, session_key } = response.data

        // 2. 查找或创建用户
        let user = await this.userRepository.findOneBy({ wechatOpenId: openid })
        if (!user) {
            user = this.userRepository.create({ wechatOpenId: openid })
            user = await this.userRepository.save(user)
        }

        // 3. 签发 JWT
        const payload = { sub: user.id, openid: openid }
        return {
            access_token: this.jwtService.sign(payload),
            session_key // 演示用：真实项目里 session_key 绝不能返回给前端
        }
    }
}

@Module({
    imports: [JwtModule.register({ secret: JWT_SECRET })],
    providers: [WechatAuthService, UserRepository]
})
class AppModule {}

/** 本地 stub：假装自己是微信服务器，只认 code === 'good-code' */
function startWechatStub() {
    const server = http.createServer((req, res) => {
        const url = new URL(req.url ?? '/', 'http://127.0.0.1')
        const code = url.searchParams.get('js_code') ?? ''
        console.log(
            `  [stub] 收到请求 ${url.pathname}?appid=${url.searchParams.get('appid')}` +
                `&js_code=${code}&grant_type=${url.searchParams.get('grant_type')}`
        )
        res.setHeader('content-type', 'application/json; charset=utf-8')
        if (code === 'good-code') {
            res.end(JSON.stringify({ openid: 'oX9kZ5fakeOpenId', session_key: 'fake-session-key' }))
        } else {
            res.end(JSON.stringify({ errcode: 40029, errmsg: 'invalid code, rid: 65f0a1b2-3c4d5e6f' }))
        }
    })
    return new Promise<{ base: string; close: () => Promise<void> }>(resolve => {
        server.listen(0, '127.0.0.1', () => {
            const port = (server.address() as { port: number }).port
            resolve({
                base: `http://127.0.0.1:${port}/sns/jscode2session`,
                close: () => new Promise<void>(done => server.close(() => done()))
            })
        })
    })
}

function decodePayload(token: string) {
    const [, payload] = token.split('.')
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
}

async function bootstrap() {
    const stub = await startWechatStub()
    useLocalWechatStub(stub.base)
    console.log(`本地 stub 已启动：${stub.base}\n`)

    const app = await NestFactory.createApplicationContext(AppModule, { logger: false })
    const wechatAuthService = app.get(WechatAuthService)

    console.log('=== 1) 第一次用 code 登录：openid 没见过的用户会被创建 ===')
    const first = await wechatAuthService.wechatLogin('good-code')
    console.log(`  access_token 的 payload = ${JSON.stringify(decodePayload(first.access_token))}`)

    console.log('\n=== 2) 同一个 openid 再登一次：复用已有用户，不重复建号 ===')
    const second = await wechatAuthService.wechatLogin('good-code')
    console.log(`  access_token 的 payload = ${JSON.stringify(decodePayload(second.access_token))}`)
    console.log('  两次的 sub 都是 1 —— 说明第二次走的是「查到已有用户」而不是新建（新建会变成 2）')

    console.log('\n=== 3) code 无效时：微信返回 errcode，服务端要自己判并转成 401 ===')
    try {
        await wechatAuthService.wechatLogin('bad-code')
    } catch (err) {
        console.log(`  抛出：${err.constructor.name}: ${(err as Error).message}`)
    }

    console.log('\n说明：微信登录只换了「身份来源」——用 code 换到的 openid 当唯一标识，')
    console.log('说明：之后的 JWT 签发流程和账号密码登录完全一样（payload 里同样放 sub）。')

    await app.close()
    await stub.close()
}

void bootstrap()
