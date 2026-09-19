// 类型体操训练场 · 题目（未解版）
// 每道题的答案位都写成 `TODO`（= never），所以下面的 `Expect<Equal<…>>` 全部不成立 ——
// 用 `npm run gym:todo` 跑会看到 50 处类型错误。把 TODO 换成正确实现后，错误消失。
import type { Equal, Expect, TODO } from './utils'

// ───────────────────────── A. 元组与基础 ─────────────────────────

// 题 1：取元组的第一个元素
type First<T> = TODO
type _t1a = Expect<Equal<First<[1, 2, 3]>, 1>>
type _t1b = Expect<Equal<First<['a', true]>, 'a'>>

// 题 2：取元组的最后一个元素
type Last<T> = TODO
type _t2 = Expect<Equal<Last<[1, 2, 3]>, 3>>

// 题 3：取元组长度
type Length<T extends any[]> = TODO
type _t3 = Expect<Equal<Length<[1, 2, 3]>, 3>>

// 题 4：从 T 中剔除可赋给 U 的成员（对应内置 Exclude）
type MyExclude<T, U> = TODO
type _t4 = Expect<Equal<MyExclude<'a' | 'b' | 'c', 'a'>, 'b' | 'c'>>

// 题 5：从 T 中保留可赋给 U 的成员（对应内置 Extract）
type MyExtract<T, U> = TODO
type _t5 = Expect<Equal<MyExtract<string | number, string>, string>>

// 题 6：剔除 null / undefined（对应内置 NonNullable）
type MyNonNullable<T> = TODO
type _t6 = Expect<Equal<MyNonNullable<string | null | undefined>, string>>

// 题 7：把元组转成联合类型
type TupleToUnion<T> = TODO
type _t7 = Expect<Equal<TupleToUnion<[1, 'a', true]>, 1 | 'a' | true>>

// 题 8：判断元组中是否包含某类型
type Includes<T extends any[], U> = TODO
type _t8a = Expect<Equal<Includes<[1, 2, 3], 2>, true>>
type _t8b = Expect<Equal<Includes<[1, 2, 3], 4>, false>>

// ───────────────────────── B. 函数与 infer ─────────────────────────

// 题 9：提取函数返回类型（对应内置 ReturnType）
type MyReturnType<F> = TODO
type _t9 = Expect<Equal<MyReturnType<() => 42>, 42>>

// 题 10：提取函数参数元组（对应内置 Parameters）
type MyParameters<F> = TODO
type _t10 = Expect<Equal<MyParameters<(a: number, b: string) => void>, [number, string]>>

// 题 11：递归解开 Promise（对应内置 Awaited）
type MyAwaited<T> = TODO
type _t11 = Expect<Equal<MyAwaited<Promise<Promise<number>>>, number>>

// 题 12：提取 class 的实例类型（对应内置 InstanceType）
declare class Foo {
  value: number
}
type MyInstanceType<T> = TODO
type _t12 = Expect<Equal<MyInstanceType<typeof Foo>, Foo>>

// 题 13：提取数组元素类型
type ElementOf<T> = TODO
type _t13 = Expect<Equal<ElementOf<number[]>, number>>

// 题 14：提取函数的第一个参数类型
type FirstParam<F> = TODO
type _t14 = Expect<Equal<FirstParam<(x: boolean, y: string) => void>, boolean>>

// 题 15：去掉元组第一项（取尾部）
type Tail<F extends any[]> = TODO
type _t15 = Expect<Equal<Tail<[1, 2, 3]>, [2, 3]>>

// 题 16：反转元组
type Reverse<T extends any[]> = TODO
type _t16 = Expect<Equal<Reverse<[1, 2, 3]>, [3, 2, 1]>>

// ───────────────────────── C. 映射类型与修饰符 ─────────────────────────

// 题 17：把所有属性变成只读（对应内置 Readonly）
type MyReadonly<T> = TODO
type _t17 = Expect<Equal<MyReadonly<{ a: number; b: string }>, { readonly a: number; readonly b: string }>>

// 题 18：把所有属性变成可选（对应内置 Partial）
type MyPartial<T> = TODO
type _t18 = Expect<Equal<MyPartial<{ a: number; b: string }>, { a?: number; b?: string }>>

// 题 19：把所有属性变成必填（对应内置 Required）
type MyRequired<T> = TODO
type _t19 = Expect<Equal<MyRequired<{ a?: number; b?: string }>, { a: number; b: string }>>

// 题 20：去掉所有只读（变为可变）
type Mutable<T> = TODO
type _t20 = Expect<Equal<Mutable<{ readonly a: number }>, { a: number }>>

// 题 21：挑选部分键（对应内置 Pick）
type MyPick<T, K extends keyof T> = TODO
type _t21 = Expect<Equal<MyPick<{ a: 1; b: 2; c: 3 }, 'a' | 'b'>, { a: 1; b: 2 }>>

// 题 22：剔除部分键（对应内置 Omit）
type MyOmit<T, K extends keyof T> = TODO
type _t22 = Expect<Equal<MyOmit<{ a: 1; b: 2; c: 3 }, 'c'>, { a: 1; b: 2 }>>

// 题 23：构造键到值的映射（对应内置 Record）
type MyRecord<K extends keyof any, V> = TODO
type _t23 = Expect<Equal<MyRecord<'x' | 'y', number>, { x: number; y: number }>>

// 题 24：把对象的所有键名改为大写
type KeysToUppercase<T> = TODO
type _t24 = Expect<Equal<KeysToUppercase<{ name: string; age: number }>, { NAME: string; AGE: number }>>

// ───────────────────────── D. 条件类型与递归 ─────────────────────────

// 题 25：按键取对象属性
type Get<T, K extends keyof T> = TODO
type _t25 = Expect<Equal<Get<{ a: 1; b: 2 }, 'b'>, 2>>

// 题 26：递归 Partial（嵌套对象也变可选）
type DeepPartial<T> = TODO
type _t26 = Expect<Equal<DeepPartial<{ a: { b: number } }>, { a?: { b?: number } }>>

// 题 27：递归 Readonly（嵌套对象也变只读）
type DeepReadonly<T> = TODO
type _t27 = Expect<Equal<DeepReadonly<{ a: { b: number } }>, { readonly a: { readonly b: number } }>>

// 题 28：拍平嵌套元组
type Flatten<T extends any[]> = TODO
type _t28 = Expect<Equal<Flatten<[1, [2, 3], [4]]>, [1, 2, 3, 4]>>

// 题 29：拼接两个元组
type Concat<A extends any[], B extends any[]> = TODO
type _t29 = Expect<Equal<Concat<[1, 2], [3, 4]>, [1, 2, 3, 4]>>

// 题 30：向元组末尾追加一项
type Push<T extends any[], V> = TODO
type _t30 = Expect<Equal<Push<[1, 2], 3>, [1, 2, 3]>>

// 题 31：把某类型重复 N 次，得到长度为 N 的元组
type Repeat<N extends number, T, A extends any[] = []> = TODO
type _t31 = Expect<Equal<Repeat<3, 0>, [0, 0, 0]>>

// 题 32：判断一个类型是否是 never
type IsNever<T> = TODO
type _t32a = Expect<Equal<IsNever<never>, true>>
type _t32b = Expect<Equal<IsNever<string>, false>>

// ───────────────────────── E. 模板字面量类型 ─────────────────────────

// 题 33：把字符串首字母大写
type CapitalizeStr<S extends string> = TODO
type _t33 = Expect<Equal<CapitalizeStr<'hello'>, 'Hello'>>

// 题 34：用分隔符连接字符串元组
type Join<D extends string, T extends string[]> = TODO
type _t34 = Expect<Equal<Join<'-', ['a', 'b', 'c']>, 'a-b-c'>>

// 题 35：去掉字符串首尾空格
type Trim<S extends string> = TODO
type _t35 = Expect<Equal<Trim<'  hi  '>, 'hi'>>

// 题 36：把子串 From 替换为 To
type Replace<S extends string, F extends string, T extends string> = TODO
type _t36 = Expect<Equal<Replace<'foobar', 'bar', 'baz'>, 'foobaz'>>

// 题 37：把事件名变成 onXxx 形式
type EventName<K extends string> = TODO
type _t37 = Expect<Equal<EventName<'click'>, 'onClick'>>

// 题 38：从路由模板里提取 :param 参数名
type ParseParams<S extends string> = TODO
type _t38 = Expect<Equal<ParseParams<'/user/:id/post/:pid'>, 'id' | 'pid'>>

// 题 39：判断字符串是否以 P 开头
type StartsWith<S extends string, P extends string> = TODO
type _t39a = Expect<Equal<StartsWith<'hello', 'he'>, true>>
type _t39b = Expect<Equal<StartsWith<'hello', 'lo'>, false>>

// 题 40：判断字符串是否以 P 结尾
type EndsWith<S extends string, P extends string> = TODO
type _t40a = Expect<Equal<EndsWith<'hello', 'lo'>, true>>
type _t40b = Expect<Equal<EndsWith<'hello', 'he'>, false>>

// ───────────────────────── F. 实战组合 ─────────────────────────

// 题 41：后端接口的响应信封
type ApiResponse<T> = TODO
type _t41 = Expect<Equal<ApiResponse<number>, { code: number; data: number; msg: string }>>

// 题 42：带加载态的异步数据（联合 + 判别）
type LoadingState<T> = TODO
type _t42 = Expect<
  Equal<
    LoadingState<number>,
    { status: 'loading' } | { status: 'success'; data: number } | { status: 'error'; error: string }
  >
>

// 题 43：表单错误信息结构（每个字段一个可选错误串）
type FormErrors<T> = TODO
type _t43 = Expect<Equal<FormErrors<{ name: string; age: number }>, { name?: string; age?: string }>>

// 题 44：合并两个对象类型，后者覆盖前者（对应 Object.assign 的静态类型）
type Merge<A, B> = TODO
type _t44 = Expect<Equal<Merge<{ a: 1; b: 2 }, { b: 3; c: 4 }>, { a: 1; b: 3; c: 4 }>>

// 题 45：取对象所有属性值的联合
type ValueOf<T> = TODO
type _t45 = Expect<Equal<ValueOf<{ a: 1; b: 2 }>, 1 | 2>>

// 题 46：条件选择
type If<C extends boolean, T, F> = TODO
type _t46a = Expect<Equal<If<true, 1, 2>, 1>>
type _t46b = Expect<Equal<If<false, 1, 2>, 2>>

// 题 47：逻辑与
type And<A extends boolean, B extends boolean> = TODO
type _t47a = Expect<Equal<And<true, false>, false>>
type _t47b = Expect<Equal<And<true, true>, true>>

// 题 48：逻辑或
type Or<A extends boolean, B extends boolean> = TODO
type _t48a = Expect<Equal<Or<false, false>, false>>
type _t48b = Expect<Equal<Or<false, true>, true>>

// 题 49：逻辑非
type Not<T extends boolean> = TODO
type _t49a = Expect<Equal<Not<true>, false>>
type _t49b = Expect<Equal<Not<false>, true>>

// 题 50：判断一个类型是不是元组（不含数组）
type IsTuple<T> = TODO
type _t50a = Expect<Equal<IsTuple<[1]>, true>>
type _t50b = Expect<Equal<IsTuple<number[]>, false>>
type _t50c = Expect<Equal<IsTuple<[]>, true>>
