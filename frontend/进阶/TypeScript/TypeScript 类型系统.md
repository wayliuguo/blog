# TypeScript 类型系统

TypeScript 的类型系统不是"给变量加个冒号"，而是一套**在编译期对值的集合做运算**的规则：类型描述值的范围，赋值是集合的包含判断，泛型与条件类型是对集合做映射与分支。本篇讲类型本身——心智模型、基础类型、收窄、对象类型、泛型、推断、类型运算、类的类型，以及报错怎么读。配置、`.d.ts` 声明文件、构建集成与 JS 迁移见下一篇 [TypeScript 工程实践](./TypeScript%20工程实践.md)。

## 一、类型系统的心智模型

### 类型就是值的集合

把每个类型想成一个集合：`string` 是所有字符串的集合，`'GET' | 'POST'` 是只含两个元素的子集，`never` 是空集，`unknown` 是全集。于是"能不能赋值"就变成了一个包含判断——**子集可以赋给超集，反过来不行**。

联合类型 `|` 是并集，交叉类型 `&` 是交集，这些运算都可以在集合视角下直接理解。

> 摘自 `./code/type-lab/01-assignability.ts`（运行：`npm run check:errors`）

```ts
type Digit = '0' | '1' | '2' | '3'

const d: Digit = '2'
const s: string = d // OK：子集可以赋给超集
//ERR const d2: Digit = s // 编译错误：string 太大，无法保证落在 Digit 里
```

解封 `//ERR` 行后编译器给出的判断：

```text
01-assignability.ts
  TS2322  Type 'string' is not assignable to type 'Digit'.
        const d2: Digit = s // 编译错误：string 太大，无法保证落在 Digit 里
```

`unknown` 与 `never` 也在这个框架里：任何值都能赋给 `unknown`（全集），而没有任何值能赋给 `never`（空集）。所以函数返回 `never` 就意味着"这里到不了"。

### 结构类型：只看形状，不看名字

TypeScript 用的是**结构类型**（structural typing，俗称鸭式辨型）：两个类型是否兼容，只取决于成员是否对得上，与它们的名字、是否 `implements` 无关。这是它和 Java / C# 那类名义类型系统最根本的区别。

> 摘自 `./code/type-lab/01-assignability.ts`（运行：`npm run check:errors`）

```ts
interface Point2D {
    x: number
    y: number
}

class Vec2 {
    constructor(public x: number, public y: number) {}
}

const p: Point2D = new Vec2(1, 2) // OK：形状吻合即可，不要求显式 implements

// 经过变量传递时，多出来的字段不影响兼容
const rich = { x: 1, y: 2, z: 3 }
const p2: Point2D = rich // OK

// 但对象字面量直接赋值会触发「额外属性检查」
//ERR const p3: Point2D = { x: 1, y: 2, z: 3 } // 编译错误：z 不在 Point2D 里
```

注意最后一行：同一个对象，先赋给变量再传参就通过，直接写字面量就报错。这不是结构类型失效，而是 TS 专门加的**额外属性检查**（excess property check）——字面量多写的字段十有八九是手抖拼错，编译器宁可误报也要拦一下。

### 可赋值性的两条规则：返回值协变、参数逆变

判断函数之间能不能赋值，方向是反的：

- **返回值协变**：返回值类型更窄（子集）是安全的——调用方期望 `{ id: number }`，你给 `{ id: number; name: string }`，它只用得着 `id`。
- **参数逆变**：参数类型更宽（超集）才是安全的——调用方会传任意 `string` 进来，你若按 `'a'` 处理就会漏掉其他字符串。

> 摘自 `./code/type-lab/01-assignability.ts`（运行：`npm run check:errors`）

```ts
type Handler = (arg: string) => void

// 参数逆变：接受更宽（父集）的参数类型是安全的
const wider: Handler = (arg: string | number) => void arg
//ERR const narrower: Handler = (arg: 'a') => void arg // 编译错误：拿到 string 却按 'a' 处理

// 返回值协变：返回任意值都可以赋给返回 void 的函数类型
type Voider = () => void
const v: Voider = () => 1 // OK：调用方不会用到这个返回值
```

参数逆变只在开启 `strictFunctionTypes` 后才严格检查（属于 `strict` 的一部分）。关闭它，参数会退化成"双向兼容"，能过编译但拦不住真实 bug。

### 类型只在编译期存在

TS 编译成 JS 后，类型信息会被全部擦除。这不是实现细节，而是理解 TS 的前提：**你在类型层面写的一切约束，运行时都不复存在**——所以类型永远替代不了运行时校验（比如接口返回的数据）。

> 摘自 `./code/type-lab/11-erase-demo.ts`（运行：`npm run erase`）

```ts
interface User {
    id: number
    name: string
}

enum Color {
    Red,
    Green
}

function greet(user: User): string {
    return 'hi ' + user.name
}

const color: Color = Color.Green
```

编译产物（typescript 5.8.2 实测）：

```text
---- 编译产物 ----
var Color;
(function (Color) {
    Color[Color["Red"] = 0] = "Red";
    Color[Color["Green"] = 1] = "Green";
})(Color || (Color = {}));
function greet(user) {
    return 'hi ' + user.name;
}
const color = Color.Green;

---- 结论（typescript 5.8.2） ----
类型注解与 interface 是否出现在产物里： 否，已被擦除
enum 是否留下运行时代码： 是（enum 是少数会生成对象的类型语法）
```

`interface` 和所有类型注解消失了，但 `enum` 留下了真实的对象代码——这也是很多团队改用字面量联合替代 `enum` 的原因之一（见第二节）。

## 二、基础类型速览

TS 的基础类型与 JS 一一对应，这里只列**TS 相对 JS 多出来的部分**和容易踩的点。

| 类型 | 是什么 | 注意 |
| --- | --- | --- |
| `any` | 关闭类型检查 | 会沿着表达式传染，能不用就不用 |
| `unknown` | 未知类型 | 全集，用之前必须收窄，是 `any` 的安全替代 |
| `never` | 不可能出现的值 | 空集，用于穷尽性检查 |
| `void` | 函数没有返回值 | |
| `object` | 非原始类型 | 太宽，优先写具体结构 |
| `T[]` / `Array<T>` | 数组 | 两种写法等价 |
| `[A, B]` | 元组 | 定长，每个位置类型固定 |
| `bigint` / `symbol` | 大整数 / 唯一值 | 需要 `target` ≥ ES2020 |

### any 与 unknown 的分工

`any` 是"我放弃检查"，`unknown` 是"我不知道，你先用收窄证明它是什么"。所有来自外部的数据（接口响应、`JSON.parse`、用户输入）都应该落到 `unknown`，而不是 `any`。

> 摘自 `./code/type-lab/02-basic-types.ts`（运行：`npm run check:errors`）

```ts
a.foo.bar() // 编译通过（any 放弃了检查），运行时可能崩
//ERR u.foo // 编译错误：unknown 必须先收窄
```

### 字面量会放宽，as const 能锁住

字面量类型默认是**可放宽的**（widening）：`let` 声明会放宽成 `string`，`const` 声明保留字面量。对象的属性同理——属性是可写的，所以也会被放宽。

> 摘自 `./code/type-lab/02-basic-types.ts`（运行：`npm run check`）

```ts
let mutable = 'GET' // string
const frozen = 'GET' // 推断为 'GET'
const cfg = { method: 'GET' } // method 推断为 string
const cfgConst = { method: 'GET' } as const // method 推断为 'GET'
```

`as const` 会递归地把所有属性变成 `readonly` 字面量类型。需要"既能改又能保持字面量"时，用下面这个操作符。

### satisfies：要校验，但别把推断弄丢了

`satisfies`（TS 4.9+）解决的是一个两难：用类型注解会丢掉精确的字面量推断，不用又没法校验形状。它只做校验、不改变推断结果。

> 摘自 `./code/type-lab/02-basic-types.ts`（运行：`npm run check:errors`）

```ts
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
```

`m1` 通过、`m2` 报错，就是这个操作符存在的全部理由。

### 枚举的替代品

`enum` 会生成运行时对象（见第一节的编译产物），且在 `isolatedModules`、类型与值同名等场景下容易出状况。多数场景可以用"常量对象 + 字面量联合"替代，类型与值一次拿到：

> 摘自 `./code/type-lab/02-basic-types.ts`（运行：`npm run check:errors`）

```ts
const Direction = { Up: 'UP', Down: 'DOWN' } as const
type Direction = (typeof Direction)[keyof typeof Direction] // 'UP' | 'DOWN'

declare function go(dir: Direction): void
go('UP')
//ERR go('LEFT') // 编译错误：不在联合里
```

值（`Direction.Up`）和类型（`Direction`）同名共存——TS 允许一个名字同时存在于值空间和类型空间。

## 三、收窄：把联合类型变成具体类型

拿到一个联合类型，你只能访问所有分支共有的成员。**收窄**（narrowing）就是在某段代码里把类型确定为其中一支的过程，这是 TS 里使用频率最高的技巧。

### 判别式联合：用一个标签字段

给联合的每个成员加一个字面量类型的标签字段（通常叫 `kind` 或 `type`），`switch` 之后 TS 会自动收窄。这是可维护性最好的写法。

> 摘自 `./code/type-lab/03-narrowing.ts`（运行：`npm run check`）

```ts
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
```

`default` 分支里的 `assertNever` 不是装饰，而是**穷尽性守卫**：它的参数是 `never`，一旦有人给 `Shape` 加了新成员却忘了处理，`s` 就不再是 `never`，编译立刻失败。

> 摘自 `./code/type-lab/03-narrowing.ts`（运行：`npm run check:errors`）

```ts
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
```

```text
03-narrowing.ts
  TS2345  Argument of type 'Triangle' is not assignable to parameter of type 'never'.
        return assertNever(s)
```

这一条价值极高：它把"漏改一个 switch 分支"从线上事故变成了编译错误。

### 内置收窄手段

`typeof`、`instanceof`、`in`、`Array.isArray`、真值判断、`===` 字面量比较都能触发收窄。

> 摘自 `./code/type-lab/03-narrowing.ts`（运行：`npm run check`）

```ts
function format(x: string | number | string[] | null): string {
    if (x === null) return 'null'
    if (typeof x === 'string') return x.toUpperCase()
    if (typeof x === 'number') return x.toFixed(2)
    if (Array.isArray(x)) return x.join(',')
    return String(x)
}
```

两个坑：

- `typeof null === 'object'`，判空必须用 `=== null`，不能靠 `typeof`。
- 真值判断（`if (text)`）会把 `0`、`''`、`false` 一起吞掉。判断"有没有值"请用 `!== undefined`，判断"是不是空字符串"请显式比较。

### 自定义类型谓词

收窄逻辑要复用，就写成返回 `x is T` 的函数。

> 摘自 `./code/type-lab/03-narrowing.ts`（运行：`npm run check`）

```ts
function isCircle(s: Shape): s is Circle {
    return s.kind === 'circle'
}
```

但要记住：**谓词是向编译器做出的承诺，它不校验实现**。下面这段代码能编译通过，然后在运行时崩掉：

> 摘自 `./code/type-lab/03-narrowing.ts`（运行：`npm run check`）

```ts
const isString = (x: unknown): x is string => typeof x === 'number'
declare const v: unknown
if (isString(v)) {
    const upper: string = v.toUpperCase() // 编译通过，但运行时 v 其实是 number
}
```

写谓词时，让判断条件与谓词类型严格对应，别把它当成"断言的逃生舱"。

## 四、对象类型：interface 与 type

### 两者的实质差异

`interface` 与 `type` 在描述对象形状时几乎等价，真正的差别只有三条：

1. **interface 可以声明合并**，同名声明会被叠加（这对扩展第三方类型、给库打补丁很重要）；`type` 同名会直接报重复定义。
2. **`type` 能表达 interface 表达不了的类型**：联合、元组、映射类型、条件类型的结果。
3. **`interface` 只能描述对象形状**，`type` 可以给任意类型起别名。

> 摘自 `./code/type-lab/04-object-types.ts`（运行：`npm run check`）

```ts
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
```

选择建议：**描述对象/类的公开结构用 `interface`**（可合并、报错信息更可读），**做类型运算、起别名、写联合用 `type`**。团队统一即可，不必纠结。

### 可选、只读与索引签名

> 摘自 `./code/type-lab/04-object-types.ts`（运行：`npm run check:errors`）

```ts
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
```

索引签名是"放弃对 key 的检查"换来的灵活性——写下去之后，拼错 key 也不会报错了。能枚举的 key 尽量枚举。

### 额外属性检查与三种绕法

对象字面量直接赋值给目标类型时，多出的字段会报错。三种绕法各有代价：

> 摘自 `./code/type-lab/04-object-types.ts`（运行：`npm run check:errors`）

```ts
interface Opt {
    color?: string
    width?: number
}
declare function create(o: Opt): void

const extra = { color: 'red', opacity: 0.5 }
create(extra) // OK：先赋给变量，不再触发检查
create({ color: 'red', opacity: 0.5 } as Opt) // OK：断言
//ERR create({ color: 'red', opacity: 0.5 }) // 编译错误：opacity 不在 Opt 里
```

推荐顺序：先想想这个字段是不是本该写进 `Opt`（绝大多数情况）；确实要透传，用索引签名；断言是最后的手段，因为它同时关掉了这一处的所有检查。

### 调用签名、构造签名与重载

接口不只描述数据，也能描述"可调用"和"可 new"。

> 摘自 `./code/type-lab/04-object-types.ts`（运行：`npm run check:errors`）

```ts
interface Comparator {
    (a: number, b: number): number
}
const cmp: Comparator = (a, b) => a - b // a、b 由上下文推断为 number

interface ClockCtor {
    new (hour: number): { hour: number }
}
declare const Clock: ClockCtor
const clock = new Clock(9)
```

TS 还允许给函数声明 `this` 的类型：它是参数列表里的第一个"假参数"，编译后擦除、不占实参位置。把方法从对象上摘下来单独调用时，这条约束就会生效。

> 摘自 `./code/type-lab/04-object-types.ts`（运行：`npm run check:errors`）

```ts
// ---- this 参数：给回调里的 this 定类型（编译后擦除，不占实参位） ----
interface Button {
    text: string
    onClick(this: Button, type: string): void
}
declare const btn: Button
btn.onClick('click') // OK：this 是 btn

const detached = btn.onClick
//ERR detached('click') // 编译错误：脱离了 Button 的 this 上下文
```

```text
04-object-types.ts
  TS2684  The 'this' context of type 'void' is not assignable to method's 'this' of type 'Button'.
        detached('click') // 编译错误：脱离了 Button 的 this 上下文
```

重载让一个函数对不同的入参给出精确的出参类型，注意实现签名不属于重载列表：

> 摘自 `./code/type-lab/04-object-types.ts`（运行：`npm run check:errors`）

```ts
function parse(input: string): string[]
function parse(input: number): number
function parse(input: string | number): string[] | number {
    return typeof input === 'string' ? input.split('') : input
}
const arr: string[] = parse('abc')
const num: number = parse(1)
//ERR const bad: boolean = parse('abc') // 编译错误：重载里没有返回 boolean 的签名
```

能用联合类型 + 收窄讲清楚的场景，不要上重载——重载越多，实现签名越难维护。

## 五、泛型

### 为什么需要泛型

用 `any` 能"通吃"所有类型，代价是丢掉了**入参与返回值之间的关系**：`firstAny([1,2,3])` 的结果是 `any`，后面怎么写都不报错。泛型把这条关系保留下来。

> 摘自 `./code/type-lab/05-generics.ts`（运行：`npm run check:errors`）

```ts
function firstAny(list: any[]): any {
    return list[0]
}
const r0 = firstAny([1, 2, 3]) // any：后面怎么写都不报错

function first<T>(list: T[]): T {
    return list[0]
}
const r1: number = first([1, 2, 3]) // T 被推断为 number
//ERR const r2: string = first([1, 2, 3]) // 编译错误：T 是 number
```

泛型不会让函数变复杂，它只是把"调用时才知道的类型"变成了一个参数 `T`。

### 约束与默认类型参数

`extends` 约束 `T` 必须满足某个形状——这既是对调用方的限制，也是函数体内部能安全使用某些成员的依据。

> 摘自 `./code/type-lab/05-generics.ts`（运行：`npm run check:errors`）

```ts
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
```

### keyof 约束：让 key 与对象绑定

`K extends keyof T` 是最实用的一条约束：属性名必须是该对象真实存在的 key，返回值类型 `T[K]` 还会跟着 key 变。

> 摘自 `./code/type-lab/05-generics.ts`（运行：`npm run check:errors`）

```ts
function get<T extends object, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key]
}
const user = { id: 1, name: 'well' }
const name: string = get(user, 'name') // 返回值类型跟着 key 走
//ERR get(user, 'email') // 编译错误：'email' 不是 user 的 key
```

```text
05-generics.ts
  TS2345  Argument of type '"email"' is not assignable to parameter of type '"name" | "id"'.
        get(user, 'email') // 编译错误：'email' 不是 user 的 key
```

### 条件类型的分发

条件类型 `T extends U ? X : Y` 遇到**裸类型参数**时会按联合的每个成员分别计算（分发）；用元组包一层 `[T] extends [U]` 可以阻止分发。这是写工具类型时最容易踩的分水岭。

> 摘自 `./code/type-lab/05-generics.ts`（运行：`npm run check`）

```ts
type ToArray<T> = T extends unknown ? T[] : never
type Distributed = ToArray<string | number> // string[] | number[]

// 用元组包一层就能阻止分发
type ToArrayNoDist<T> = [T] extends [unknown] ? T[] : never
type Merged = ToArrayNoDist<string | number> // (string | number)[]
```

`Exclude<T, U>` 正依赖分发——它靠"逐个判断、不匹配的给 `never`"来过滤联合成员。

### 泛型能出现在哪些位置

函数、接口、类型别名、类都可以带类型参数，含义不同：

> 摘自 `./code/type-lab/05-generics.ts`（运行：`npm run check:errors`）

```ts
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
```

`interface Box<T>` 的 `T` 在**声明接口时**确定（用的时候写 `Box<string>`），而 `type BoxFactory = <T>(...)` 的 `T` 在**每次调用时**确定——这个区别在写工厂、回调类型时常被忽略。

## 六、类型推断

### 上下文推断：回调参数不用手写类型

参数类型常常来自它所在的位置（赋值目标、函数签名），这叫上下文类型。所以 `.map((n) => ...)` 里的 `n` 不用标注。

> 摘自 `./code/type-lab/06-inference.ts`（运行：`npm run check:errors`）

```ts
const nums = [1, 2, 3]
const doubled = nums.map((n) => n * 2) // n 由 map 的签名推断为 number
//ERR const bad = nums.map((n) => n.toUpperCase()) // 编译错误：number 没有 toUpperCase
```

### 什么时候必须标注

- **空数组**：不标注就不知道将来装什么，后续 `push` 全靠猜。
- **对外 API 的返回值**：推断结果可能比你想要的宽，也可能把 `any` 扩散出去。
- **推断不出来时**：参数没有类型来源，会退化成隐式 `any`，`noImplicitAny` 直接拦下。

> 摘自 `./code/type-lab/06-inference.ts`（运行：`npm run check:errors`）

```ts
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
```

### 字面量推断与 as const

> 摘自 `./code/type-lab/06-inference.ts`（运行：`npm run check`）

```ts
let mutable = 'GET' // string
const frozen = 'GET' // 'GET'
const actions = ['GET', 'POST'] // string[]
const actionsConst = ['GET', 'POST'] as const // readonly ['GET', 'POST']
```

`as const` 加的是 `readonly`，所以 `actionsConst` 不能 `push`——这正是它作为常量表的意义。

### 泛型入参推断

调用泛型函数时，`T`、`K` 通常都能从实参反推出来，不需要显式写。

> 摘自 `./code/type-lab/06-inference.ts`（运行：`npm run check`）

```ts
declare function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>
const picked = pick({ id: 1, name: 'well', age: 18 }, ['id', 'name']) // { id: number; name: string }
const onlyId: number = picked.id
```

## 七、类型运算：从已有类型算出新类型

类型也能做计算：遍历（`keyof` + 映射）、分支（条件类型）、提取（`infer`）。工具类型就是这些运算的组合。

### keyof 与索引访问

> 摘自 `./code/type-lab/07-type-ops.ts`（运行：`npm run check`）

```ts
interface User {
    id: number
    name: string
    email: string
}

// ---- keyof 与索引访问 ----
type UserKeys = keyof User // 'id' | 'name' | 'email'
type IdType = User['id'] // number
type IdOrName = User['id' | 'name'] // number | string
```

`T[K]` 是"取值的类型"，`keyof T` 是"取键的联合"，二者配合就能让类型跟着数据结构走——改了 `User`，所有派生的类型自动跟着变。

### 映射类型与修饰符

映射类型就是"遍历 key 生成新类型"，`+`/`-` 控制 `?` 与 `readonly`：

> 摘自 `./code/type-lab/07-type-ops.ts`（运行：`npm run check`）

```ts
type MyPartial<T> = { [K in keyof T]?: T[K] }
type MyRequired<T> = { [K in keyof T]-?: T[K] }
type MyReadonly<T> = { readonly [K in keyof T]: T[K] }
type MyMutable<T> = { -readonly [K in keyof T]: T[K] }
```

`as` 子句还能连属性名一起改（key remapping）：

> 摘自 `./code/type-lab/07-type-ops.ts`（运行：`npm run check`）

```ts
type Getters<T> = {
    [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]
}
type UserGetters = Getters<User> // getId / getName / getEmail
```

把不要的 key 映射成 `never`，再用 `[keyof T]` 收拢，就能按类型过滤字段：

> 摘自 `./code/type-lab/07-type-ops.ts`（运行：`npm run check`）

```ts
type StringKeys<T> = {
    [K in keyof T]: T[K] extends string ? K : never
}[keyof T]
type UserStringKeys = StringKeys<User> // 'name' | 'email'
```

### 条件类型与 infer

`infer` 用来在匹配过程中"捕获"某个位置的类型，是提取类工具类型的核心。

> 摘自 `./code/type-lab/07-type-ops.ts`（运行：`npm run check`）

```ts
type IsArray<T> = T extends unknown[] ? true : false
type MyReturnType<T> = T extends (...args: never[]) => infer R ? R : never
type MyParameters<T> = T extends (...args: infer P) => unknown ? P : never

type Fn = (a: number, b: string) => boolean
type FnReturn = MyReturnType<Fn> // boolean
type FnParams = MyParameters<Fn> // [a: number, b: string]

// 递归：一层层解开 Promise
type DeepAwaited<T> = T extends Promise<infer R> ? DeepAwaited<R> : T
type A = DeepAwaited<Promise<Promise<number>>> // number
```

`MyReturnType` 的约束里写 `never[]` 而不是 `any[]`：参数位置是逆变的，`never[]` 能匹配任意参数列表，同时避免 `any` 扩散。

### 内置工具类型

| 工具类型 | 作用 |
| --- | --- |
| `Partial<T>` / `Required<T>` | 全部属性转可选 / 转必填 |
| `Readonly<T>` | 全部属性转只读 |
| `Pick<T, K>` / `Omit<T, K>` | 挑出 / 去掉指定 key |
| `Record<K, V>` | 用一组 key 构造同构对象 |
| `Exclude<T, U>` / `Extract<T, U>` | 从联合中剔除 / 保留 |
| `NonNullable<T>` | 去掉 `null` 与 `undefined` |
| `ReturnType<T>` / `Parameters<T>` / `InstanceType<T>` | 取函数返回类型 / 参数元组 / 实例类型 |
| `Awaited<T>` | 解开 Promise（递归） |

它们都不是魔法，`Omit` 就是 `Pick` 加 `Exclude`：

> 摘自 `./code/type-lab/07-type-ops.ts`（运行：`npm run check:errors`）

```ts
type MyExclude<T, U> = T extends U ? never : T
type MyOmit<T, K extends keyof T> = Pick<T, MyExclude<keyof T, K>>
type PublicUser = MyOmit<User, 'email'> // { id: number; name: string }

declare const pub: PublicUser
const pubId: number = pub.id
//ERR pub.email // 编译错误：email 已被 Omit 掉
```

## 八、类与类型

现代前端项目里类用得越来越少，但两件事必须清楚：**一个类同时创建了"实例类型"和"构造函数值"**，以及 **TS 对类的检查只覆盖实例侧**。

> 摘自 `./code/type-lab/08-classes.ts`（运行：`npm run check:errors`）

```ts
class Clock {
    static brand = 'Seiko'
    constructor(public hour: number) {} // 参数属性：声明 + 赋值一步完成
    tick(): void {}
}

// ---- 一个类同时创建了两样东西：实例类型 + 构造函数值 ----
type ClockInstance = Clock // 实例类型（写注解时用）
type ClockCtor = typeof Clock // 构造函数类型（工厂 / DI 时用）

const c: ClockInstance = new Clock(9)
//ERR const wrong: ClockInstance = Clock // 编译错误：Clock 是构造函数，不是实例

declare function factory(Ctor: new (hour: number) => ClockInstance): ClockInstance
factory(Clock) // OK：结构对得上就行
```

`implements` 只校验实例侧，静态成员不在它的检查范围内；`abstract` 类不能实例化，但可以同时提供实现和契约。

> 摘自 `./code/type-lab/08-classes.ts`（运行：`npm run check:errors`）

```ts
interface Ticker {
    tick(): void
}
class MyTicker implements Ticker {
    tick(): void {}
}
//ERR class BadTicker implements Ticker {} // 编译错误：缺少 tick
```

一个容易忽略的事实：**`private` / `protected` 成员会让结构类型退化成"名义类型"**——两个形状完全相同、但 `private` 来自不同声明的类互不兼容。

> 摘自 `./code/type-lab/08-classes.ts`（运行：`npm run check:errors`）

```ts
class A {
    private tag = 'a'
}
class B {
    private tag = 'a'
}
declare const b: B
//ERR const aa: A = b // 编译错误：private 必须来自同一处声明，即使形状一样
```

```text
08-classes.ts
  TS2322  Type 'B' is not assignable to type 'A'.   Types have separate declarations of a private property 'tag'.
        const aa: A = b // 编译错误：private 必须来自同一处声明，即使形状一样
```

## 九、常见编译错误速查

报错信息分两层看：第一层是"这两个类型不兼容"，第二层才是具体原因——**看细节那一层**，第一层往往只是复述你的代码。

> 摘自 `./code/type-lab/09-errors.ts`（运行：`npm run check:errors`）

```ts
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
```

| 错误码 | 典型原因 | 怎么修 |
| --- | --- | --- |
| TS2322 | 赋值/返回类型不匹配 | 看第二层细节，确认是右边太宽还是左边太窄 |
| TS2339 | 属性不存在 | 拼错，或该值还没被收窄到有此属性的分支 |
| TS2345 | 实参类型不匹配 | 含字面量额外属性检查、重载不匹配 |
| TS2353 | 对象字面量多了字段 | 见第四节"额外属性检查" |
| TS2554 | 实参个数不对 | |
| TS2367 | 比较的两个类型没有交集 | 通常是 `typeof` 收窄写错了 |
| TS7053 | 用 `string` 索引无索引签名的对象 | 给类型加索引签名，或把 key 收窄成字面量联合 |
| TS18046 / TS2571 | `unknown` 未收窄 | 先 `typeof` / 谓词收窄再用 |
| TS18048 | 可能为 `undefined` | 判空、可选链，或调整类型定义 |
| TS2769 | 所有重载都不匹配 | 逐个签名比对参数 |

**一条通用排查法**：把鼠标停在表达式上看推断结果是什么，如果推断结果和你以为的不一样，问题出在推断这步，而不是赋值那步。

## 小结

- TypeScript 类型系统
  - 类型系统的心智模型
    - 类型即集合：可赋值 = 子集包含于超集
    - 结构类型：只看成员形状，与名字、implements 无关
    - 可赋值性：返回值协变、参数逆变（`strictFunctionTypes`）
    - 类型只在编译期存在，运行时被擦除（`enum` 除外）
  - 基础类型速览
    - `any` 关闭检查、`unknown` 必须收窄、`never` 是空集
    - 字面量会放宽，`as const` 锁住，`satisfies` 校验但不改变推断
    - 元组定长；常量对象 + 字面量联合可替代 `enum`
  - 收窄
    - 判别式联合（`kind` 标签）+ `assertNever` 穷尽性守卫
    - `typeof` / `in` / `instanceof` / `Array.isArray` / 真值判断
    - 自定义谓词 `x is T` 是对编译器的承诺，不校验实现
  - 对象类型
    - `interface` 可声明合并；`type` 能表达联合、元组、映射与条件
    - 可选 `?`、只读 `readonly`、索引签名及其代价
    - 额外属性检查只作用于对象字面量
    - 调用签名 / 构造签名 / 函数重载
  - 泛型
    - 保留"入参与返回值之间的关系"，优于 `any`
    - `extends` 约束、`K extends keyof T`、`T[K]`
    - 条件类型遇到裸类型参数会分发，`[T] extends [U]` 可阻止
    - 接口泛型在声明时确定，函数泛型在调用时确定
  - 类型推断
    - 上下文推断让回调参数免标注
    - 空数组、对外 API 返回值、推断失败处需要显式标注
    - 字面量 widening 与 `as const`
  - 类型运算
    - `keyof T` 取键、`T[K]` 取值
    - 映射类型与 `+/-` 修饰符、`as` 重映射、按类型过滤 key
    - 条件类型与 `infer` 提取，可递归解 Promise
    - 内置工具类型与手写实现
  - 类与类型
    - 类同时创建实例类型与构造函数值（`typeof Class`）
    - `implements` 只检查实例侧
    - `private` 让结构类型退化成名义类型
  - 常见编译错误速查
    - 先看报错的第二层细节
    - 错误码到原因的对照表

## 配套代码

本篇的可运行示例在仓库 `frontend/进阶/TypeScript/code/`。

| 文件 | 演示什么 | 对应小节 |
| --- | --- | --- |
| `./code/type-lab/01-assignability.ts` | 类型即集合、结构类型、额外属性检查、参数逆变与返回值协变 | 一、类型系统的心智模型 |
| `./code/type-lab/02-basic-types.ts` | `any` 与 `unknown`、字面量 widening 与 `as const`、`satisfies`、元组、枚举替代 | 二、基础类型速览 |
| `./code/type-lab/03-narrowing.ts` | 判别式联合、`assertNever` 穷尽性守卫、内置收窄手段、自定义谓词 | 三、收窄 |
| `./code/type-lab/04-object-types.ts` | `interface` 声明合并、可选与只读、索引签名、额外属性检查、调用/构造签名、重载 | 四、对象类型 |
| `./code/type-lab/05-generics.ts` | 泛型推断、`extends` 约束、`keyof` 约束、条件类型分发、泛型的位置 | 五、泛型 |
| `./code/type-lab/06-inference.ts` | 上下文推断、必须标注的三种场景、字面量推断、泛型入参推断 | 六、类型推断 |
| `./code/type-lab/07-type-ops.ts` | `keyof` 与索引访问、映射类型与修饰符、key 重映射、`infer`、手写 `Omit` | 七、类型运算 |
| `./code/type-lab/08-classes.ts` | 实例侧与静态侧、`implements`、`private` 的名义性、抽象类 | 八、类与类型 |
| `./code/type-lab/09-errors.ts` | 常见编译错误速查表（错误行用 `//ERR` 封住） | 九、常见编译错误速查 |
| `./code/type-lab/11-erase-demo.ts` | 被擦除的样本源码：带 interface、类型注解与 enum 的一段 TS | 一、类型系统的心智模型 |
| `./code/type-lab/10-erase.cjs` | 编译 11-erase-demo.ts 并对比产物，展示类型信息去哪了 | 一、类型系统的心智模型 |
| `./code/site/structural.html` | 浏览器里验证结构类型：多出的字段不影响兼容 | 一、类型系统的心智模型 |
| `./code/site/union-intersection.html` | 联合与交叉类型交互演示 | 三、收窄 |
| `./code/site/generic-infer.html` | 泛型容器保持"存入 = 取出"，`infer` 提取返回类型 | 五、泛型 · 七、类型运算 |
| `./code/site/utility-practice.html` | 内置工具类型（`Pick`/`Omit`/`Partial`/`Record` 等）交互演示 | 七、类型运算 |

运行方式（均在 `code` 目录）：

- `npm run check`：检查全部示例，当前状态应当 0 错误
- `npm run check:errors`：解封所有 `//ERR` 演示行，打印真实报错
- `npm run erase`：展示类型擦除后的编译产物
- `npm start`：启动 `http://localhost:5186/`，查看浏览器 demo

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[原生与跨端框架差异](../../基础/小程序/原生与跨端框架差异.md)
- 下一篇：[TypeScript 工程实践](./TypeScript%20工程实践.md)
