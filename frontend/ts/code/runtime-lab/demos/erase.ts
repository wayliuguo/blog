import assert from 'node:assert'

// 接口与类型别名在运行时不存在：它们只是编译期的"注解"，编译后整段消失
interface User {
    id: number
    name: string
}
type Point = { x: number; y: number }

console.log('typeof User  =', typeof User) // undefined
console.log('typeof Point =', typeof Point) // undefined

// 类会保留，因为它本身就是运行时的值（一个构造函数）
class Account {
    balance = 0
}
console.log('typeof Account =', typeof Account) // 'function'

// 普通枚举编译成"双向映射"的真实对象：既能正向取值，也能反查名字
enum Role {
    Admin,
    User
}
console.log('Role.Admin =', Role.Admin) // 0
console.log('Role[0]    =', Role[0]) // 'Admin'

assert.strictEqual(typeof User, 'undefined')
assert.strictEqual(typeof Point, 'undefined')
assert.strictEqual(typeof Account, 'function')
assert.strictEqual(Role[0], 'Admin')
console.log('\n结论：能写在类型位置的，运行时未必存在；能 new 的，一定存在。')
