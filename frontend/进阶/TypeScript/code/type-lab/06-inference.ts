/**
 * 06 类型推断：什么时候该标注，什么时候交给编译器
 *
 * 运行：npm run check / npm run check:errors
 */

// ---- 上下文推断：回调参数不用手写类型 ----
const nums = [1, 2, 3]
const doubled = nums.map((n) => n * 2) // n 由 map 的签名推断为 number
//ERR const bad = nums.map((n) => n.toUpperCase()) // 编译错误：number 没有 toUpperCase

// ---- 空数组：不标注就不知道将来装什么 ----
const empty: number[] = []
empty.push(1)

// ---- 返回值：对外 API 建议显式标注，避免 any 扩散 ----
function double(x: number) {
    return x * 2 // 推断为 number，简单场景够用
}
function parseJSON(text: string): unknown {
    return JSON.parse(text) // 显式标注 unknown，把收窄的义务交给调用方
}
//ERR const len = parseJSON('{}').length // 编译错误：unknown 必须先收窄

// ---- 推断不出来就退化成 any，noImplicitAny 会拦住 ----
//ERR function sum(a, b) { return a + b } // 编译错误：参数隐式 any

// ---- 字面量推断与 as const ----
let mutable = 'GET' // string
const frozen = 'GET' // 'GET'
const actions = ['GET', 'POST'] // string[]
const actionsConst = ['GET', 'POST'] as const // readonly ['GET', 'POST']

// ---- 泛型入参推断：从实参反推 T、K ----
declare function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>
const picked = pick({ id: 1, name: 'well', age: 18 }, ['id', 'name']) // { id: number; name: string }
const onlyId: number = picked.id

export { doubled, empty, double, parseJSON, mutable, frozen, actions, actionsConst, onlyId }
