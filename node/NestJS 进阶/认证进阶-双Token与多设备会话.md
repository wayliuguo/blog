# 认证进阶：双 Token 与多设备会话

> 登录注册实战里我们做到了"能登录"，但生产环境还要回答三个更难的问题：Refresh Token 泄露了怎么办？同一用户用手机和电脑同时登录怎么互不踢下线？用户点"退出登录"到底删了什么？这一篇把这些问题一次性讲透。

---

## 关于技术栈：本篇为什么用 Prisma 举例

本体系前面（[数据库集成](../NestJS%20入门/数据库集成)、[Express 项目模板](../Express%20与%20Koa/Express%20项目模板)）统一使用 **TypeORM**，而这一篇的示例用 **Prisma**。两者不是替代关系，而是同一层的两种实现：

| 对比项 | TypeORM | Prisma |
|--------|---------|--------|
| 模型定义 | 装饰器实体（`@Entity` / `@Column`） | `schema.prisma` 声明 + 生成 Client |
| 迁移 | `migration:generate` / `migration:run` | `migrate dev` / `migrate deploy` |
| 类型来源 | 依赖装饰器元数据，部分场景需手写类型 | 由生成的 Client 保证，编辑器提示完整 |
| 集成方式 | `@nestjs/typeorm` + `Repository` 注入 | `PrismaService` 封装 + `this.prisma.user.findUnique` |
| 常见场景 | 已有 NestJS 生态习惯、存量项目 | 新项目、schema 驱动、强类型诉求 |

**为什么这里用 Prisma 举例**：会话表（`AuthSession`）的查询高度依赖精确的字段类型推导 —— 比如 `findUnique({ where: { tokenHash } })`，Prisma 生成的类型能让"字段名写错"在编译期就暴露，示例不容易被误读。

你完全可以用 TypeORM 实现完全相同的逻辑。**表结构、哈希入库、轮换、多设备登出这几件事的思路一模一样**，只是把「按哈希查一条会话」这一步换成 ORM 自己的写法。

本篇的配套脚本 `./code/advanced-lab2/src/11-refresh-token.ts` 用一张内存表顶替 Prisma Client（方法名与参数形状完全对齐），所以下面所有代码都能真的跑起来：

> 摘自 `./code/advanced-lab2/src/11-refresh-token.ts`（运行：`npm run 11refresh`）

```typescript
// Prisma 写法：按 userId + 哈希 + 未吊销 三个条件取一条会话
const session = await this.prisma.authSession.findFirst({
    where: { userId: payload.sub, refreshTokenHash: incomingHash, revoked: false }
})
```

换成 TypeORM 就是 `sessionRepo.findOne({ where: { userId, tokenHash: incomingHash, revoked: false } })`；换成 Redis 就是把哈希当 key 存 `redisService.set('token:refresh:' + hash, payload, ttl)`（本项目 `nestjs-template` 用的正是这一种，见 `./code/nestjs-template/src/modules/auth/auth.service.ts`）。

学习时请关注**设计**（为什么哈希、为什么要轮换、为什么登出后 Access Token 仍短暂有效），而不是 ORM 的语法差异。

---

## 从单 Token 到双 Token

单 Token 方案有一个绕不开的矛盾：有效期长则泄露危害大，有效期短则用户体验差。双 Token 把"访问凭证"和"续期凭证"拆开：

| Token | 有效期 | 存放位置 | 职责 | 泄露后果 |
|-------|--------|----------|------|----------|
| Access Token | 短，如 15m | 前端内存 / `Authorization` 头 | 访问业务接口 | 短期有效，危害有限 |
| Refresh Token | 长，如 7d | HttpOnly Cookie | 换发新的 Access Token | 可配合"哈希入库 + 轮换 + 吊销"兜底 |

> 决策模型：**Access Token 越短越安全，Refresh Token 越长越省心，但 Refresh Token 必须有"服务端能主动作废"的能力**，否则就退化成了无法吊销的长效 JWT。"客户端存不住服务端管不了"是单 Token 的死穴，双 Token + 服务端会话表正是解药。

## 用 HttpOnly Cookie 保存 Refresh Token

Refresh Token 不该进 `localStorage`（XSS 一打就穿），而应由服务端通过 `Set-Cookie` 写入 HttpOnly Cookie。注意登录接口的返回值里**只有 Access Token**，Refresh Token 只走 Cookie：

> 摘自 `./code/advanced-lab2/src/11-refresh-token.ts`（运行：`npm run 11refresh`）

```typescript
    @Post('login')
    async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: ResponseStub) {
        const { access_token, refresh_token } = await this.authService.login(dto)

        res.cookie('refresh_token', refresh_token, {
            httpOnly: true, // JS 读不到，挡掉大多数 XSS 窃取
            secure: true, // 仅 HTTPS 传输
            sameSite: 'strict', // 跨站请求不自动带，缓解 CSRF
            path: '/auth/refresh', // 只在刷新接口携带，缩小暴露面
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        return { access_token } // Access Token 走响应体
    }
```

注意 `maxAge` 这里填的是**毫秒**（Express 的约定），Express 内部会转成秒再写进响应头。实测输出里的 `Max-Age=604800` 就是 7 天：

实测输出（`npm run 11refresh`，Token 值已用占位符替代）：

```
  Set-Cookie = refresh_token=<JWT>; Max-Age=604800; Path=/auth/refresh; HttpOnly; Secure; SameSite=Strict
```

| 选项 | 作用 | 边界 |
|------|------|------|
| `httpOnly` | 禁止 JS 读取 Cookie | 降低 XSS 窃取，但**不解决 XSS 本身**——被注入脚本仍可借浏览器带 Cookie 发请求 |
| `secure` | 仅 HTTPS 下发/传输 | 防明文抓包 |
| `sameSite` | 跨站不自动携带 | 缓解 CSRF；需要跨站携带时要权衡用 `lax` |
| `path` | 限定携带路径 | 缩小 Token 暴露面 |

> XSS 与 CSRF 是两条不同的攻击线：HttpOnly 治的是"XSS 偷 Token 明文"，sameSite 治的是"CSRF 借 Cookie 发力"。两者都只是加固，**根本原因还是修掉 XSS/CSRF 漏洞本身**。

## Refresh Token 必须哈希后入库

很多人把 Refresh Token 当成"长一点的 JWT"随手存库，这里有个隐蔽的大坑：**bcrypt 只处理输入的前 72 字节**。

> 摘自 `./code/advanced-lab2/src/11-refresh-token.ts`（运行：`npm run 11refresh`）

```typescript
    // 前 72 字节完全相同、尾部不同的两个「Token」
    const common = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImRldmljZSI6ImExIn0.' + 'x'.repeat(10)
    const refreshTokenA = common + '-ALICE-signature'
    const refreshTokenB = common + '-BOB-signature-different'

    const hashA = await bcrypt.hash(refreshTokenA, 10)
    const ok = await bcrypt.compare(refreshTokenB, hashA)
```

这不是理论风险，脚本里当场就能复现：

实测输出（`npm run 11refresh`）：

```
=== 1) bcrypt 的 72 字节截断：两个不同的 Token 被判成同一个 ===
  公共前缀长度                      = 79 字节（> 72）
  refreshTokenA / B 长度            = 95 / 103 字节
  两个 Token 是同一个吗             = false
  bcrypt.compare(B, bcrypt.hash(A)) = true   ← 校验被绕过
  sha256(A) = fdcf3e33cadde8a02d32b1d861c890ecabfae484244245e7b50da4b91e3d25fa
  sha256(B) = d697d4d1812e42a2e198bda84a34a7dcd025f115055832ecacb4651eb6759c78
  两个 SHA-256 相等吗               = false
```

两个内容完全不同的 Token，bcrypt 认为它们是同一个（比对返回 `true`），SHA-256 则给出了两个完全不同的哈希。

而 Refresh Token 并不需要"可还原"（你只需要校验"这次带来的 Token 是不是当初发的那个"），所以**用 SHA-256 做单向哈希入库**就够了：

> 摘自 `./code/advanced-lab2/src/11-refresh-token.ts`（运行：`npm run 11refresh`）

```typescript
import { createHash, randomBytes } from 'node:crypto'

// …
// 把 Refresh Token 转成固定长度的哈希再存库
function hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
}

// …
        // 签发后只存哈希。签名带一个随机 jti：否则同一秒内两次登录会签出完全相同的 Token
        const refreshToken = this.jwtService.sign(
            { sub: user.id, jti: randomBytes(16).toString('hex') },
            { expiresIn: '7d' }
        )
        await this.prisma.authSession.create({
            data: {
                userId: user.id,
                refreshTokenHash: hashRefreshToken(refreshToken), // 存哈希，不存明文
                deviceId: dto.deviceId,
                userAgent: dto.userAgent ?? null,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        })

// …
        // 刷新时：对客户端带来的明文算哈希，再去库里比对
        const incomingHash = hashRefreshToken(incomingRefreshToken)
        const session = await this.prisma.authSession.findFirst({
            where: { userId: payload.sub, refreshTokenHash: incomingHash, revoked: false }
        })
        if (!session) throw new UnauthorizedException('Refresh Token 无效或已被使用')
```

关于那个随机 `jti`：JWT 的时间戳精度只到**秒**，如果 Refresh Token 的 payload 只有 `{ sub }`，同一秒内同一用户的两台设备会签出**逐字节相同**的 Token，哈希自然也一样——后面"按哈希查一条会话"就会查错行，轮换、单设备登出全部失效。加一个随机 `jti` 才能保证每次签发都唯一。脚本里把这一点也验证了：

实测输出（`npm run 11refresh`）：

```
  会话数              = 2
  两台设备哈希不同吗   = true
```

> 结论：**Token 明文只在这次响应里给客户端一次，服务端永远只保存它的 SHA-256 哈希**。即使数据库被拖库，攻击者拿到的也只是哈希，无法直接拿去刷新。

## AuthSession 表：支持多设备会话

单 Token 方案的另一个硬伤是"新设备登录会顶掉旧设备"。要支持多设备互不覆盖，需要一张 **User 1:N AuthSession** 的会话表，每个设备一条记录：

```prisma
// prisma/schema.prisma
model User {
    id         Int          @id @default(autoincrement())
    email      String       @unique
    password   String
    sessions   AuthSession[]
}

model AuthSession {
    id               Int      @id @default(autoincrement())
    userId           Int
    user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    refreshTokenHash String   // SHA-256 哈希，不是明文
    deviceId         String   // 设备指纹，用于区分"这是哪台设备"
    userAgent        String?  // 登录时的 UA，便于用户识别"我都在哪些设备登录过"
    expiresAt        DateTime // Refresh Token 过期时间
    revoked          Boolean  @default(false) // 是否已吊销（登出/轮换时置 true）
    createdAt        DateTime @default(now())
}
```

| 字段 | 用途 |
|------|------|
| `refreshTokenHash` | 校验刷新请求是否来自真实签发的 Token |
| `deviceId` | 区分设备，避免一台设备刷新把另一台踢下线 |
| `userAgent` | 给用户展示"当前活跃设备"列表 |
| `expiresAt` | 服务端侧的过期闸门，过期直接拒刷 |
| `revoked` | 软删除标记，登出/轮换时置位，无需物理删行 |

> 这套表让"服务端能主动作废某个 Token"成为可能——这是 JWT 本身做不到的。它把无状态 JWT 的便利，和会话可控性重新缝合起来。

## Refresh Token Rotation（刷新轮换）

"轮换"的意思是：**每次用 Refresh Token 换 Access Token，都签发一个全新的 Refresh Token，并让旧的立刻失效**。这样即便旧 Token 被窃取，窃取者一旦使用就会被发现（因为合法用户已经用掉过它），且旧 Token 已失效。

> 摘自 `./code/advanced-lab2/src/11-refresh-token.ts`（运行：`npm run 11refresh`）

```typescript
    async refresh(incomingRefreshToken: string) {
        // 1. 先校验 JWT 签名与过期
        let payload: any
        try {
            payload = await this.jwtService.verifyAsync(incomingRefreshToken)
        } catch {
            throw new UnauthorizedException('Refresh Token 已过期')
        }

        // 2. 算哈希，查库比对（确认这是服务端签发且未吊销的那条）
        const incomingHash = hashRefreshToken(incomingRefreshToken)
        const session = await this.prisma.authSession.findFirst({
            where: { userId: payload.sub, refreshTokenHash: incomingHash, revoked: false }
        })
        if (!session) throw new UnauthorizedException('Refresh Token 无效或已被使用')

        // 3. 关键：旧 Token 立即失效（置位 revoked），并签发新一对 Token
        await this.prisma.authSession.update({
            where: { id: session.id },
            data: { revoked: true }
        })

        const newAccessToken = this.jwtService.sign({ sub: payload.sub }, { expiresIn: '15m' })
        const newRefreshToken = this.jwtService.sign(
            { sub: payload.sub, jti: randomBytes(16).toString('hex') },
            { expiresIn: '7d' }
        )

        // 4. 写入新的会话记录（新哈希、新设备上下文）
        await this.prisma.authSession.create({
            data: {
                userId: payload.sub,
                refreshTokenHash: hashRefreshToken(newRefreshToken),
                deviceId: session.deviceId,
                userAgent: session.userAgent,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        })

        return { access_token: newAccessToken, refresh_token: newRefreshToken }
    }
```

> 攻击者用偷来的旧 Token 重放时，因为库里那条记录的 `revoked` 已经被合法刷新置为 `true`，哈希比对会失败，直接返回 401——这就是轮换带来的"重放即失效"保护。

实测输出（`npm run 11refresh`）：

```
=== 4) 轮换：刷新后旧 Refresh Token 立即失效 ===
  device-A 刷新成功    = true
  旧会话 revoked       = true
  新会话沿用 deviceId  = device-A
  拿旧 Token 再刷一次  = Refresh Token 无效或已被使用
  device-B 被牵连了吗  = revoked: false
```

注意最后一行：device-A 的刷新没有波及 device-B，两台设备的会话是彼此独立的行。

## 登出：单设备与全设备

登出本质就是"把对应的会话记录作废"，两者都是软删除：

> 摘自 `./code/advanced-lab2/src/11-refresh-token.ts`（运行：`npm run 11refresh`）

```typescript
    // 单设备登出：只吊销当前这条会话
    async logout(currentRefreshToken: string) {
        const hash = hashRefreshToken(currentRefreshToken)
        await this.prisma.authSession.updateMany({
            where: { refreshTokenHash: hash, revoked: false },
            data: { revoked: true }
        })
    }

    // 全设备登出：吊销该用户所有会话
    async logoutAllDevices(userId: number) {
        await this.prisma.authSession.updateMany({
            where: { userId, revoked: false },
            data: { revoked: true }
        })
    }
```

实测输出（`npm run 11refresh`）：

```
=== 5) 登出 ===
  单设备登出后 device-A 活跃会话数 = 0
  登出后再刷新                    = Refresh Token 无效或已被使用
  device-B 仍然活跃               = 1
  全设备登出后活跃会话数          = 0
  device-B 的旧 Token 还能刷吗    = Refresh Token 无效或已被使用
```

单设备登出只把 device-A 的行置为 `revoked`，device-B 还能继续刷新；`logoutAllDevices` 之后连 device-B 的旧 Token 也刷不动了。

> 需要注意的权衡：**登出后，手里那张 Access Token 在其短生命周期内（如 15m）仍然可能有效**。这是双 Token 设计的固有取舍——要么每次请求都查库校验 Access Token（失去无状态优势、加重 DB 压力），要么接受这 15 分钟的窗口。生产上通常接受这个窗口，或对高敏接口额外做"用户版本号/黑名单"校验。

## 常见坑

| 坑 | 现象 | 解决 |
|----|------|------|
| `verifyAsync` 忘记 `await` | 异常被吞，错误变成 500 而非 401 | `await this.jwtService.verifyAsync(token)`，把校验错误显式转成 `UnauthorizedException` |
| Cookie 跨域带不上 | 前端跨域请求后端，Cookie 不发送 | 后端 `sameSite` 放宽到 `lax`/`none` + `secure`，前端 `fetch` 带 `credentials: 'include'` |
| 过期时间校验缺失 | 库里 `expiresAt` 已过但仍能刷新 | 刷新时同时判断 `expiresAt > now()` 与 `revoked` |
| Refresh Token 明文入库 | 拖库即失陷 | 永远只存 SHA-256 哈希 |
| 轮换后旧 Token 还能用 | 没置位 `revoked` | 每次刷新先把旧记录 `revoked = true` |

## 小结

- **双 Token 分工**：单 Token 长则泄露危害大、短则体验差且无法主动吊销；Access 短(15m)放内存/`Authorization` 头管接口，Refresh 长(7d)放 HttpOnly Cookie 只管换发；Refresh 必须可服务端作废否则退化成长效 JWT
- **HttpOnly Cookie 四选项**：`httpOnly` 降 XSS 窃取(不解决 XSS)、`secure` 仅 HTTPS、`sameSite` 缓解 CSRF(跨站权衡 `lax`)、`path` 缩暴露面
- **Refresh 存储用 SHA-256 而非 bcrypt**：单向哈希入库、明文只给一次、拖库也拿不到可用 Token；bcrypt 只处理前 72 字节会截断长 Token 致哈希误判
- **AuthSession 表支持多设备**：User 1:N，每设备一条记录互不顶号；字段 `userId`/`refreshTokenHash`/`deviceId`/`userAgent`/`expiresAt`/`revoked`(软删)
- **轮换与登出**：刷新先 `revoked=true` 旧记录再签新对（偷来的旧 Token 一用即 401）；登出按 `refreshTokenHash`(单设备)或 `userId`(全设备)批量软删；Access 的 15m 窗口要么查库失无状态、要么接受高敏加黑名单
- **常见坑**
  - `verifyAsync` 记得 `await`：否则异常被吞变 500 而非 401
  - 跨域 Cookie 带不上：后端 `sameSite=lax/none`+`secure`、前端 `fetch` 带 `credentials:'include'`
  - 刷新缺过期校验：同时判断 `expiresAt>now()` 与 `revoked`
- **ORM 同层**：Prisma 仅图类型推导，`findUnique({ where: { tokenHash } })` 对应 `sessionRepo.findOne({ where: { tokenHash } })`，设计思路一致

---

## 配套代码

本篇的可运行示例在仓库 `node/NestJS 进阶/code/advanced-lab2`：用一张内存表顶替 Prisma Client，把双 Token 的登录 / 刷新轮换 / 多设备 / 登出全部真跑一遍。

| 文件 | 说明 | 对应小节 |
| --- | --- | --- |
| `./code/advanced-lab2/src/11-refresh-token.ts` | 内存版 AuthSession：bcrypt 72 字节截断复现、SHA-256 哈希入库、HttpOnly Cookie、多设备、轮换、单/全设备登出 | 全部小节 |
| `./code/advanced-lab2/README.md` | 脚本清单、运行命令与实测输出 | 全部小节 |
| `./code/nestjs-template/src/modules/auth/auth.service.ts` | TypeORM + Redis 版的同一套设计（哈希当 key、轮换即删 key） | Refresh Token 必须哈希后入库 · 关于技术栈 |
| `./code/nestjs-template/src/modules/auth/auth.controller.ts` | 真实项目里 refresh / logout 接口的接线方式 | 用 HttpOnly Cookie 保存 Refresh Token |

运行方式见 `advanced-lab2/README.md` 与 `nestjs-template/README.md`。

---

## 参考

- 本模块总结：[总结](../NestJS%20入门/总结.md)
- 本模块面试题：[面试题](../NestJS%20入门/面试题.md)
- 上一篇：[NestJS 项目模板](./NestJS%20项目模板)
- 下一篇：[IoC 与依赖注入原理](./IoC%20与依赖注入原理)
