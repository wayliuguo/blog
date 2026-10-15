import assert from 'node:assert'

// 品牌类型：给 string 贴一个编译期标签，阻止"任意字符串"流入
type UserId = string & { readonly __brand: 'UserId' }
type OrderId = string & { readonly __brand: 'OrderId' }

function makeUserId(raw: string): UserId {
    if (!/^\d+$/.test(raw)) throw new Error('UserId 必须是数字串')
    return raw as UserId // 全仓库唯一允许"贴标签"的地方
}
function makeOrderId(raw: string): OrderId {
    if (!/^ORD-/.test(raw)) throw new Error('OrderId 必须以 ORD- 开头')
    return raw as OrderId
}

const uid = makeUserId('42')
const oid = makeOrderId('ORD-7')

// 编译期：UserId 与 OrderId 不可混用（哪怕底层都是 string）
// const bad: OrderId = uid // TS2345：类型不兼容

function loadUser(id: UserId): string {
    return `user:${id}`
}
console.log(loadUser(uid))
assert.throws(() => makeUserId('abc')) // 运行期也拦得住
console.log('\n结论：品牌类型把"运行时校验"压缩进了编译期，错误提前到写代码时。')
