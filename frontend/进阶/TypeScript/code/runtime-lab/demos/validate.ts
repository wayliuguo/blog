import assert from 'node:assert'

// 手写一个极简"模式 → 校验器"：把 unknown 收敛成可信类型
type Schema =
    | { kind: 'string' }
    | { kind: 'number' }
    | { kind: 'object'; fields: Record<string, Schema> }

function validate(schema: Schema, input: unknown): unknown {
    if (schema.kind === 'string') {
        if (typeof input !== 'string') throw new Error('期望 string')
        return input
    }
    if (schema.kind === 'number') {
        if (typeof input !== 'number') throw new Error('期望 number')
        return input
    }
    if (schema.kind === 'object') {
        if (typeof input !== 'object' || input === null || Array.isArray(input)) {
            throw new Error('期望 object')
        }
        const out: Record<string, unknown> = {}
        for (const [key, sub] of Object.entries(schema.fields)) {
            out[key] = validate(sub, (input as Record<string, unknown>)[key])
        }
        return out
    }
    throw new Error('未知 schema')
}

// 用一份 schema 描述"用户"——前后端共享这一份契约
const UserSchema: Schema = {
    kind: 'object',
    fields: { id: { kind: 'number' }, name: { kind: 'string' } }
}

// 来自接口 / localStorage / fetch 的永远是 unknown
const fromWire = JSON.parse('{"id":1,"name":"Ada"}') as unknown
const user = validate(UserSchema, fromWire) as { id: number; name: string }
console.log('解析成功:', user)
assert.strictEqual(user.name, 'Ada')

// 缺字段 / 类型错 → 抛错，而不是默默相信类型系统已经担保过
let failed = false
try {
    validate(UserSchema, JSON.parse('{"id":"oops"}'))
} catch (e) {
    failed = true
    console.log('拦截到非法输入:', (e as Error).message)
}
assert.strictEqual(failed, true)
console.log('\n结论：类型系统保证不了"外部数据长这样"，必须有一道运行时闸门。')
