import assert from 'node:assert'

// 端到端类型安全的核心：前后端共享"同一份契约"。
// 这里用一份 schema 同时服务"服务端序列化"和"客户端反序列化 + 校验"。

type User = { id: number; name: string }
const UserSchema = { id: 'number', name: 'string' } as const

// —— 服务端（node）—— 把领域对象序列化成 wire 格式
function serialize(user: User): string {
    return JSON.stringify(user)
}

// —— 客户端 —— 拿到 unknown，按同一份 schema 收窄成可信类型
function parse(input: unknown): User {
    if (typeof input !== 'object' || input === null) throw new Error('不是对象')
    const o = input as Record<string, unknown>
    if (typeof o.id !== UserSchema.id || typeof o.name !== UserSchema.name) {
        throw new Error('字段类型不符契约')
    }
    return o as User
}

const wire = serialize({ id: 1, name: 'Ada' }) // 跨网络后类型信息彻底丢失
const received = JSON.parse(wire) as unknown // 到客户端手里只剩 unknown
const user = parse(received)
console.log('wire   =', wire)
console.log('还原   =', user)
assert.strictEqual(user.name, 'Ada')

// 真实项目里这一步由 tRPC / OpenAPI codegen / GraphQL codegen 代劳：
// 它们从同一份 schema 生成两端类型，使"改了字段名"能在编译期就暴露。
console.log('\n结论：类型在线上传不过去，跨边界必须靠"契约 + 校验"重建。')
