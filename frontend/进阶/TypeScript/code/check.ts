/**
 * 05-TypeScript 章节·类型校验示例
 *
 * 本文件是给“会装 TypeScript”的读者准备的编译校验入口，可选，不强制安装。
 *
 * 两种校验方式（任选其一，都是只做类型检查、不产出 JS，安全无副作用）：
 *   1) 若本机已全局安装 typescript：npx tsc --noEmit check.ts
 *   2) 临时拉取 typescript（无需改动项目，仅这一次命令）：npx -y typescript tsc --noEmit check.ts
 *      或：npm i -D typescript && npx tsc --noEmit check.ts
 *
 * 运行时会报哪些编译错误？把下面对实际值做的“类型标注”理解成『约束』，
 * 一旦值与标注不符，tsc 就会在编译阶段报错——这正体现了 TS 的价值：
 * 类型是编译期的，运行时仍是 JS。
 */

// ---- 结构类型（鸭子类型）：只要“形状”对得上即可 ----
interface LabelledValue {
    label: string
}
function printLabel(obj: LabelledValue): void {
    console.log(obj.label)
}
const myObj = { size: 10, label: 'Size 10 Object' }
printLabel(myObj) // OK：多出来的 size 不影响结构兼容
// printLabel({ size: 10 }); // 编译错误：缺少 label

// ---- 联合类型 + 类型守卫 ----
type Padding = string | number
function padLeft(value: string, padding: Padding): string {
    if (typeof padding === 'number') {
        return Array(padding + 1).join(' ') + value
    }
    return padding + value
}
padLeft('hi', '  ') // OK
padLeft('hi', 4) // OK
// padLeft("hi", true); // 编译错误：boolean 不属于 Padding

// ---- 交叉类型 ----
interface Person {
    name: string
}
interface Loggable {
    record: () => void
}
type PersonLoggable = Person & Loggable // 同时拥有两者成员

// ---- 泛型容器：Box<T> 保持“存入类型=取出类型” ----
interface Box<T> {
    value: T
}
const strBox: Box<string> = { value: 'hello' }

// ---- 泛型 + infer 提取返回类型（复现内置 ReturnType） ----
type MyReturnType<T extends (...args: any[]) => any> = T extends (...args: any[]) => infer R ? R : never
type Fn = (a: number, b: string) => boolean
type R1 = MyReturnType<Fn> // boolean

// ---- 手写 Partial / Exclude（映射类型与条件分发） ----
type MyPartial<T> = { [K in keyof T]?: T[K] }
type MyExclude<T, U> = T extends U ? never : T

type User = { id: number; name: string; email: string }
type NameAndId = Pick<User, 'id' | 'name'> // 内置工具类型
type NoEmail = Omit<User, 'email'>

export {}
