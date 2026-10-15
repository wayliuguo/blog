/**
 * 03 收窄（Narrowing）：把联合类型在某段代码里变成具体类型
 *
 * 运行：npm run check / npm run check:errors
 */

// ---- 判别式联合：用一个字面量字段做"标签"，最实用的一招 ----
interface Circle {
    kind: 'circle'
    radius: number
}
interface Square {
    kind: 'square'
    size: number
}
type Shape = Circle | Square

function area(s: Shape): number {
    switch (s.kind) {
        case 'circle':
            return Math.PI * s.radius ** 2
        case 'square':
            return s.size ** 2
        default:
            return assertNever(s)
    }
}

// 穷尽性守卫：参数是 never，漏掉分支就会在编译期报错
function assertNever(x: never): never {
    throw new Error('未处理的分支: ' + JSON.stringify(x))
}

// 新增一个成员却忘记处理 → default 里的 s 不再是 never，立刻报错
//ERR interface Triangle { kind: 'triangle'; a: number }
//ERR function area2(s: Shape | Triangle): number {
//ERR     switch (s.kind) {
//ERR         case 'circle':
//ERR             return 0
//ERR         case 'square':
//ERR             return 0
//ERR         default:
//ERR             return assertNever(s)
//ERR     }
//ERR }

// ---- 内置收窄手段：typeof / Array.isArray / in / 真值判断 ----
function format(x: string | number | string[] | null): string {
    if (x === null) return 'null'
    if (typeof x === 'string') return x.toUpperCase()
    if (typeof x === 'number') return x.toFixed(2)
    if (Array.isArray(x)) return x.join(',')
    return String(x)
}

interface Dog {
    bark(): void
}
interface Cat {
    meow(): void
}
function speak(animal: Dog | Cat): void {
    if ('bark' in animal) animal.bark()
    else animal.meow()
}

// ---- 自定义类型谓词：把收窄逻辑封装成函数复用 ----
function isCircle(s: Shape): s is Circle {
    return s.kind === 'circle'
}

declare const maybe: Shape
if (isCircle(maybe)) {
    const r: number = maybe.radius // OK：谓词把 maybe 收窄成 Circle
}

// 谓词是「你对编译器的承诺」，写错了检查就形同虚设（编译通过，运行时崩）
const isString = (x: unknown): x is string => typeof x === 'number'
declare const v: unknown
if (isString(v)) {
    const upper: string = v.toUpperCase() // 编译通过，但运行时 v 其实是 number
}

// ---- 真值判断会把 0 和 '' 一起吞掉 ----
function printLen(text: string | undefined): number {
    if (text) return text.length // text 为 '' 时走不到这里
    return 0
}

export { area, format, speak, isCircle, printLen }
