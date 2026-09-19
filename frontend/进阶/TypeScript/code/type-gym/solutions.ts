// 类型体操训练场 · 答案版
// 本文件先集中放 50 道题的类型定义（按文章引用顺序分组），再把断言统一放到末尾，
// 这样文章里整段引用的定义都是文件中的连续片段。跑 `npm run gym` 应当 0 错误。
import type { Equal, Expect } from './utils'

// ───────────────────────── A. 元组与基础 ─────────────────────────
type MyExclude<T, U> = T extends U ? never : T
type MyExtract<T, U> = T extends U ? T : never
type MyNonNullable<T> = T extends null | undefined ? never : T
type TupleToUnion<T> = T extends [infer F, ...infer R] ? F | TupleToUnion<R> : never
type First<T> = T extends [infer F, ...any[]] ? F : never
type Last<T> = T extends [...any[], infer L] ? L : never
type Length<T extends any[]> = T['length']
type Includes<T extends any[], U> = T extends [infer F, ...infer R]
  ? Equal<F, U> extends true
    ? true
    : Includes<R, U>
  : false

// ───────────────────────── B. 函数与 infer ─────────────────────────
declare class Foo {
  value: number
}
type MyReturnType<F> = F extends (...a: any) => infer R ? R : never
type MyAwaited<T> = T extends Promise<infer U> ? MyAwaited<U> : T
type MyParameters<F> = F extends (...a: infer P) => any ? P : never
type MyInstanceType<T> = T extends new (...a: any) => infer R ? R : never
type ElementOf<T> = T extends (infer E)[] ? E : never
type FirstParam<F> = F extends (a: infer A, ...b: any) => any ? A : never
type Tail<F extends any[]> = F extends [any, ...infer R] ? R : []

// ───────────────────────── C. 映射类型与修饰符 ─────────────────────────
type MyReadonly<T> = { readonly [K in keyof T]: T[K] }
type MyPartial<T> = { [K in keyof T]?: T[K] }
type MyRequired<T> = { [K in keyof T]-?: T[K] }
type Mutable<T> = { -readonly [K in keyof T]: T[K] }
type MyPick<T, K extends keyof T> = { [P in K]: T[P] }
type MyOmit<T, K extends keyof T> = { [P in Exclude<keyof T, K>]: T[P] }
type KeysToUppercase<T> = { [K in keyof T as Uppercase<K & string>]: T[K] }
type MyRecord<K extends keyof any, V> = { [P in K]: V }

// ───────────────────────── D. 条件类型与递归 ─────────────────────────
type Reverse<T extends any[]> = T extends [infer F, ...infer R] ? [...Reverse<R>, F] : []
type Flatten<T extends any[]> = T extends [infer F, ...infer R]
  ? F extends any[]
    ? [...F, ...Flatten<R>]
    : [F, ...Flatten<R>]
  : []
type Repeat<N extends number, T, A extends any[] = []> = A['length'] extends N
  ? A
  : Repeat<N, T, [T, ...A]>
type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T
type DeepReadonly<T> = T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T
type Get<T, K extends keyof T> = T[K]
type Concat<A extends any[], B extends any[]> = [...A, ...B]
type Push<T extends any[], V> = [...T, V]
type IsNever<T> = [T] extends [never] ? true : false

// ───────────────────────── E. 模板字面量类型 ─────────────────────────
type CapitalizeStr<S extends string> = S extends `${infer C}${infer R}` ? `${Uppercase<C>}${R}` : S
type Join<D extends string, T extends string[]> = T extends [
  infer F extends string,
  ...infer R extends string[]
]
  ? R['length'] extends 0
    ? F
    : `${F}${D}${Join<D, R>}`
  : ''
type Trim<S extends string> = S extends ` ${infer R}` | `${infer R} ` ? Trim<R> : S
type ParseParams<S extends string> = S extends `${string}/:${infer P}/${infer R}`
  ? P | ParseParams<R>
  : S extends `${string}/:${infer P}`
  ? P
  : never
type EventName<K extends string> = `on${Capitalize<K>}`
type Replace<S extends string, F extends string, T extends string> = S extends `${infer P}${F}${infer X}`
  ? `${P}${T}${X}`
  : S
type StartsWith<S extends string, P extends string> = S extends `${P}${string}` ? true : false
type EndsWith<S extends string, P extends string> = S extends `${string}${P}` ? true : false

// ───────────────────────── F. 实战组合 ─────────────────────────
type ApiResponse<T> = { code: number; data: T; msg: string }
type LoadingState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string }
type FormErrors<T> = { [K in keyof T]?: string }
type Merge<A, B> = { [K in keyof A | keyof B]: K extends keyof B ? B[K] : K extends keyof A ? A[K] : never }
type ValueOf<T> = T[keyof T]
type If<C extends boolean, T, F> = C extends true ? T : F
type And<A extends boolean, B extends boolean> = A extends true
  ? B extends true
    ? true
    : false
  : false
type Or<A extends boolean, B extends boolean> = A extends true ? true : B extends true ? true : false
type Not<T extends boolean> = T extends true ? false : true
type IsTuple<T> = T extends readonly any[] ? (number extends T['length'] ? false : true) : false

// ───────────────────────── 断言（判题，统一放末尾）─────────────────────────
type _t1a = Expect<Equal<First<[1, 2, 3]>, 1>>
type _t1b = Expect<Equal<First<['a', true]>, 'a'>>
type _t2 = Expect<Equal<Last<[1, 2, 3]>, 3>>
type _t3 = Expect<Equal<Length<[1, 2, 3]>, 3>>
type _t4 = Expect<Equal<MyExclude<'a' | 'b' | 'c', 'a'>, 'b' | 'c'>>
type _t5 = Expect<Equal<MyExtract<string | number, string>, string>>
type _t6 = Expect<Equal<MyNonNullable<string | null | undefined>, string>>
type _t7 = Expect<Equal<TupleToUnion<[1, 'a', true]>, 1 | 'a' | true>>
type _t8a = Expect<Equal<Includes<[1, 2, 3], 2>, true>>
type _t8b = Expect<Equal<Includes<[1, 2, 3], 4>, false>>
type _t9 = Expect<Equal<MyReturnType<() => 42>, 42>>
type _t10 = Expect<Equal<MyParameters<(a: number, b: string) => void>, [number, string]>>
type _t11 = Expect<Equal<MyAwaited<Promise<Promise<number>>>, number>>
type _t12 = Expect<Equal<MyInstanceType<typeof Foo>, Foo>>
type _t13 = Expect<Equal<ElementOf<number[]>, number>>
type _t14 = Expect<Equal<FirstParam<(x: boolean, y: string) => void>, boolean>>
type _t15 = Expect<Equal<Tail<[1, 2, 3]>, [2, 3]>>
type _t16 = Expect<Equal<Reverse<[1, 2, 3]>, [3, 2, 1]>>
type _t17 = Expect<Equal<MyReadonly<{ a: number; b: string }>, { readonly a: number; readonly b: string }>>
type _t18 = Expect<Equal<MyPartial<{ a: number; b: string }>, { a?: number; b?: string }>>
type _t19 = Expect<Equal<MyRequired<{ a?: number; b?: string }>, { a: number; b: string }>>
type _t20 = Expect<Equal<Mutable<{ readonly a: number }>, { a: number }>>
type _t21 = Expect<Equal<MyPick<{ a: 1; b: 2; c: 3 }, 'a' | 'b'>, { a: 1; b: 2 }>>
type _t22 = Expect<Equal<MyOmit<{ a: 1; b: 2; c: 3 }, 'c'>, { a: 1; b: 2 }>>
type _t23 = Expect<Equal<MyRecord<'x' | 'y', number>, { x: number; y: number }>>
type _t24 = Expect<Equal<KeysToUppercase<{ name: string; age: number }>, { NAME: string; AGE: number }>>
type _t25 = Expect<Equal<Get<{ a: 1; b: 2 }, 'b'>, 2>>
type _t26 = Expect<Equal<DeepPartial<{ a: { b: number } }>, { a?: { b?: number } }>>
type _t27 = Expect<Equal<DeepReadonly<{ a: { b: number } }>, { readonly a: { readonly b: number } }>>
type _t28 = Expect<Equal<Flatten<[1, [2, 3], [4]]>, [1, 2, 3, 4]>>
type _t29 = Expect<Equal<Concat<[1, 2], [3, 4]>, [1, 2, 3, 4]>>
type _t30 = Expect<Equal<Push<[1, 2], 3>, [1, 2, 3]>>
type _t31 = Expect<Equal<Repeat<3, 0>, [0, 0, 0]>>
type _t32a = Expect<Equal<IsNever<never>, true>>
type _t32b = Expect<Equal<IsNever<string>, false>>
type _t33 = Expect<Equal<CapitalizeStr<'hello'>, 'Hello'>>
type _t34 = Expect<Equal<Join<'-', ['a', 'b', 'c']>, 'a-b-c'>>
type _t35 = Expect<Equal<Trim<'  hi  '>, 'hi'>>
type _t36 = Expect<Equal<Replace<'foobar', 'bar', 'baz'>, 'foobaz'>>
type _t37 = Expect<Equal<EventName<'click'>, 'onClick'>>
type _t38 = Expect<Equal<ParseParams<'/user/:id/post/:pid'>, 'id' | 'pid'>>
type _t39a = Expect<Equal<StartsWith<'hello', 'he'>, true>>
type _t39b = Expect<Equal<StartsWith<'hello', 'lo'>, false>>
type _t40a = Expect<Equal<EndsWith<'hello', 'lo'>, true>>
type _t40b = Expect<Equal<EndsWith<'hello', 'he'>, false>>
type _t41 = Expect<Equal<ApiResponse<number>, { code: number; data: number; msg: string }>>
type _t42 = Expect<
  Equal<
    LoadingState<number>,
    { status: 'loading' } | { status: 'success'; data: number } | { status: 'error'; error: string }
  >
>
type _t43 = Expect<Equal<FormErrors<{ name: string; age: number }>, { name?: string; age?: string }>>
type _t44 = Expect<Equal<Merge<{ a: 1; b: 2 }, { b: 3; c: 4 }>, { a: 1; b: 3; c: 4 }>>
type _t45 = Expect<Equal<ValueOf<{ a: 1; b: 2 }>, 1 | 2>>
type _t46a = Expect<Equal<If<true, 1,2>, 1>>
type _t46b = Expect<Equal<If<false, 1, 2>, 2>>
type _t47a = Expect<Equal<And<true, false>, false>>
type _t47b = Expect<Equal<And<true, true>, true>>
type _t48a = Expect<Equal<Or<false, false>, false>>
type _t48b = Expect<Equal<Or<false, true>, true>>
type _t49a = Expect<Equal<Not<true>, false>>
type _t49b = Expect<Equal<Not<false>, true>>
type _t50a = Expect<Equal<IsTuple<[1]>, true>>
type _t50b = Expect<Equal<IsTuple<number[]>, false>>
type _t50c = Expect<Equal<IsTuple<[]>, true>>
