/**
 * 02 基础类型速览：只讲 TS 相对 JS 多出来的那部分
 *
 * 运行：npm run check / npm run check:errors
 */

// ---- any 是「关闭检查」，unknown 是「我不知道，用之前先收窄」 ----
declare const a: any
declare const u: unknown

a.foo.bar() // 编译通过（any 放弃了检查），运行时可能崩
//ERR u.foo // 编译错误：unknown 必须先收窄

// ---- 字面量会放宽（widening），as const 可以把它锁住 ----
let mutable = 'GET' // 推断为 string
const frozen = 'GET' // 推断为 'GET'
const cfg = { method: 'GET' } // method 推断为 string
const cfgConst = { method: 'GET' } as const // method 推断为 'GET'

// ---- satisfies：校验形状，同时保留最精确的推断 ----
type Method = 'GET' | 'POST'
type Route = { method: Method; path: string }

const routes = {
    home: { method: 'GET', path: '/' },
    login: { method: 'POST', path: '/login' }
} satisfies Record<string, Route>

// 若换成类型注解，method 会被放宽成 Method，'GET' 这个精确信息就丢了
const routes2: Record<string, Route> = { home: { method: 'GET', path: '/' } }
//ERR const m2: 'GET' = routes2.home.method // 编译错误：这里 method 的类型是 Method

// 而 satisfies 保留了字面量（下面这行正常模式能通过）
const m1: 'GET' = routes.home.method

// ---- 元组：定长，且每个位置的类型固定 ----
const tuple: [string, number] = ['a', 1]
const first: string = tuple[0]
//ERR const third = tuple[2] // 编译错误：长度为 2 的元组不存在索引 2

// ---- 枚举的替代品：字面量联合 + as const（不额外生成运行时对象） ----
const Direction = { Up: 'UP', Down: 'DOWN' } as const
type Direction = (typeof Direction)[keyof typeof Direction] // 'UP' | 'DOWN'

declare function go(dir: Direction): void
go('UP')
//ERR go('LEFT') // 编译错误：不在联合里

export { mutable, frozen, cfg, cfgConst, m1 }
