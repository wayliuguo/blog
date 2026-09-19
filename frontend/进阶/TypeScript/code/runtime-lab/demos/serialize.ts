import assert from 'node:assert'

// JSON 序列化会丢类型：Date / Map / Set / undefined 都保不住
const original = {
    at: new Date('2026-01-01T00:00:00Z'),
    map: new Map([['a', 1]]),
    set: new Set([1, 2]),
    missing: undefined
}
const text = JSON.stringify(original)
const back = JSON.parse(text)
console.log('序列化后:', text)
console.log('at  变成:', back.at, '→', back.at instanceof Date ? 'Date' : 'string')
console.log('map 变成:', JSON.stringify(back.map), '(Map 退化成普通对象)')
console.log('missing 字段:', 'missing' in back ? '还在' : '已丢失')

assert.strictEqual(back.at instanceof Date, false) // 不再是 Date
assert.strictEqual('missing' in back, false) // undefined 字段被丢弃

// 正确做法：显式约定序列化 / 反序列化（把类型信息一并带过去）
function encode(value: unknown): string {
    return JSON.stringify(value, (_k, v) => {
        if (v instanceof Date) return { __t: 'Date', v: v.toISOString() }
        if (v instanceof Map) return { __t: 'Map', v: [...v.entries()] }
        return v
    })
}
const safe = JSON.parse(encode(original))
console.log('带类型编码后 at =', safe.at) // { __t: 'Date', v: '...' }
console.log('\n结论：JSON 是"值的形状"，不是"类型"。跨进程必须自带类型信息或显式编解码。')
