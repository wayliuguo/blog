/**
 * 05 泛型：把类型变成可以传的参数
 *
 * 运行：npm run check / npm run check:errors
 */

// ---- any 会丢掉「进什么、出什么」这条信息 ----
function firstAny(list: any[]): any {
    return list[0]
}
const r0 = firstAny([1, 2, 3]) // any：后面怎么写都不报错

function first<T>(list: T[]): T {
    return list[0]
}
const r1: number = first([1, 2, 3]) // T 被推断为 number
//ERR const r2: string = first([1, 2, 3]) // 编译错误：T 是 number

// ---- 约束 extends 与默认类型参数 ----
interface HasLength {
    length: number
}
function longest<T extends HasLength>(a: T, b: T): T {
    return a.length >= b.length ? a : b
}
const longer = longest('ab', 'abcd') // T 推断为 string
//ERR longest(1, 2) // 编译错误：number 没有 length

interface Result<T = unknown> {
    code: number
    data: T
}
const ok: Result<{ id: number }> = { code: 0, data: { id: 1 } }

// ---- keyof 约束：属性名必须是对象真实存在的 key ----
function get<T extends object, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key]
}
const user = { id: 1, name: 'well' }
const name: string = get(user, 'name') // 返回值类型跟着 key 走
//ERR get(user, 'email') // 编译错误：'email' 不是 user 的 key

// ---- 条件类型遇到「裸类型参数」会分发 ----
type ToArray<T> = T extends unknown ? T[] : never
type Distributed = ToArray<string | number> // string[] | number[]

// 用元组包一层就能阻止分发
type ToArrayNoDist<T> = [T] extends [unknown] ? T[] : never
type Merged = ToArrayNoDist<string | number> // (string | number)[]

// ---- 泛型可以出现在函数、接口、类型别名、类上 ----
interface Box<T> {
    value: T
}
type BoxFactory = <T>(value: T) => Box<T>

class Stack<T> {
    private items: T[] = []
    push(item: T): void {
        this.items.push(item)
    }
    pop(): T | undefined {
        return this.items.pop()
    }
}
const stack = new Stack<number>()
stack.push(1)
//ERR stack.push('x') // 编译错误：Stack<number> 只收 number

export { first, longest, get, stack }
