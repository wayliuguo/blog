/**
 * 09 常见编译错误速查（本文件的错误行都用 //ERR 封住，npm run check:errors 时才解封）
 *
 * 用法：对着错误码反查"我大概写错了什么"。TS 的报错分两层——
 * 第一层是"这两个类型不兼容"，第二层才是细节原因，先看第二层。
 */

declare const obj: { a: number }
declare function take(x: { a: number }): void
declare const loose: { a: number }
declare const dict: Record<string, number>
declare const key: string
declare const n: number
declare const u: unknown

// TS2339 属性不存在：多半是拼错，或这个值还没被收窄到有该属性的类型
//ERR const e1 = obj.b

// TS2322 赋值类型不匹配：等号右边的类型不在左边声明的范围内
//ERR const e2: string = 1

// TS2345 实参类型不匹配：对象字面量多写了字段（额外属性检查）也会报这个
//ERR take({ a: 1, b: 2 })

// TS2554 实参个数不对
//ERR take()

// TS2367 比较永远不成立：typeof 收窄后的类型与目标字面量没有交集
//ERR const e5 = n === '1'

// TS7053 用 string 索引一个没有索引签名的对象（隐式 any）
const e6 = dict[key] // OK：Record<string, number> 有索引签名
//ERR const e7 = loose[key] // 编译错误：{ a: number } 没有 string 索引签名

// TS18046 / TS2571 unknown 未收窄就使用
//ERR const e8 = u.toString()

// 重载不匹配：TS 按顺序挑最贴近的签名报错（这里是 TS2345）；
// 当候选多于一个且全部失败时，你会看到 TS2769 "No overload matches this call"
declare function load(a: string): string
declare function load(a: number, b: number): number
//ERR load(true)

// TS2322 的另一种常见形态：把联合类型直接当其中一支用
declare const maybeStr: string | undefined
//ERR const e10: number = maybeStr.length

export { e6 }
