/**
 * 04 对象类型：interface 与 type 怎么选
 *
 * 运行：npm run check / npm run check:errors
 */

// ---- interface 可以声明合并，type 不行 ----
interface ApiConfig {
    baseURL: string
}
interface ApiConfig {
    timeout: number
}
const api: ApiConfig = { baseURL: '/api', timeout: 3000 } // 两个声明合并了

// type 能表达 interface 表达不了的东西：联合、元组、映射、条件
type ID = string | number
type Pair = [string, number]
type Nullable<T> = T | null

// ---- 可选 / 只读 / 索引签名 ----
interface Options {
    color?: string
    readonly id: number
}

interface Dict {
    [key: string]: unknown
}
const dict: Dict = { anything: 1, other: 'x' }
// 索引签名的代价：取出来的值都是 unknown，用之前要自己收窄
//ERR const n: number = dict.anything // 编译错误：unknown 不能赋给 number

// ---- 额外属性检查：只有对象字面量直接赋值才会触发 ----
interface Opt {
    color?: string
    width?: number
}
declare function create(o: Opt): void

const extra = { color: 'red', opacity: 0.5 }
create(extra) // OK：先赋给变量，不再触发检查
create({ color: 'red', opacity: 0.5 } as Opt) // OK：断言
//ERR create({ color: 'red', opacity: 0.5 }) // 编译错误：opacity 不在 Opt 里

// ---- 调用签名与构造签名 ----
interface Comparator {
    (a: number, b: number): number
}
const cmp: Comparator = (a, b) => a - b // a、b 由上下文推断为 number

interface ClockCtor {
    new (hour: number): { hour: number }
}
declare const Clock: ClockCtor
const clock = new Clock(9)

// ---- this 参数：给回调里的 this 定类型（编译后擦除，不占实参位） ----
interface Button {
    text: string
    onClick(this: Button, type: string): void
}
declare const btn: Button
btn.onClick('click') // OK：this 是 btn

const detached = btn.onClick
//ERR detached('click') // 编译错误：脱离了 Button 的 this 上下文

// ---- 函数重载：多个签名，一份实现 ----
function parse(input: string): string[]
function parse(input: number): number
function parse(input: string | number): string[] | number {
    return typeof input === 'string' ? input.split('') : input
}
const arr: string[] = parse('abc')
const num: number = parse(1)
//ERR const bad: boolean = parse('abc') // 编译错误：重载里没有返回 boolean 的签名

export { api, dict, create, cmp, clock, arr, num }
