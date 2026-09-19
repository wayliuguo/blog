/**
 * 07 类型运算：从已有类型算出新类型
 *
 * 运行：npm run check / npm run check:errors
 */

interface User {
    id: number
    name: string
    email: string
}

// ---- keyof 与索引访问 ----
type UserKeys = keyof User // 'id' | 'name' | 'email'
type IdType = User['id'] // number
type IdOrName = User['id' | 'name'] // number | string

// ---- 映射类型：遍历 key 生成新类型，+/- 控制修饰符 ----
type MyPartial<T> = { [K in keyof T]?: T[K] }
type MyRequired<T> = { [K in keyof T]-?: T[K] }
type MyReadonly<T> = { readonly [K in keyof T]: T[K] }
type MyMutable<T> = { -readonly [K in keyof T]: T[K] }

// key 重映射：连属性名一起改
type Getters<T> = {
    [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]
}
type UserGetters = Getters<User> // getId / getName / getEmail

// 按条件过滤 key：先映射成 key 或 never，再用 [keyof T] 收拢
type StringKeys<T> = {
    [K in keyof T]: T[K] extends string ? K : never
}[keyof T]
type UserStringKeys = StringKeys<User> // 'name' | 'email'

// ---- 条件类型与 infer ----
type IsArray<T> = T extends unknown[] ? true : false
type MyReturnType<T> = T extends (...args: never[]) => infer R ? R : never
type MyParameters<T> = T extends (...args: infer P) => unknown ? P : never

type Fn = (a: number, b: string) => boolean
type FnReturn = MyReturnType<Fn> // boolean
type FnParams = MyParameters<Fn> // [a: number, b: string]

// 递归：一层层解开 Promise
type DeepAwaited<T> = T extends Promise<infer R> ? DeepAwaited<R> : T
type A = DeepAwaited<Promise<Promise<number>>> // number

// ---- 手写 Omit = Pick + Exclude ----
type MyExclude<T, U> = T extends U ? never : T
type MyOmit<T, K extends keyof T> = Pick<T, MyExclude<keyof T, K>>
type PublicUser = MyOmit<User, 'email'> // { id: number; name: string }

declare const pub: PublicUser
const pubId: number = pub.id
//ERR pub.email // 编译错误：email 已被 Omit 掉

export type { UserKeys, IdType, IdOrName, UserGetters, UserStringKeys, FnReturn, FnParams, A, PublicUser }
export { pubId }
