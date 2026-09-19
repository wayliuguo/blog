# TypeScript 类型与运行时

TypeScript 给 JavaScript 加了一套静态类型系统，但有一个事实贯穿所有工程决策：**类型只活在编译期，运行时跑的是擦除类型之后的纯 JavaScript**。本章专门拆这条边界——哪些东西编译后还在、哪些彻底消失，以及当"外部数据"闯进系统时，为什么必须自己再设一道闸门。

## 一、核心命题：类型只存在于编译期

`tsc` 做的事可以概括为一句话：**用类型做检查，然后把类型全部删掉**。你写的 `: User`、接口、`type` 别名，在产物里一个字节都不留。这不是实现细节，而是 TypeScript 的设计原则"structural typing + erasure"——类型不参与运行时，保证编译出的 JS 与手写 JS 行为一致、零运行时开销。

但"擦除"是**选择性**的：不是所有 TS 语法都消失。类、枚举、装饰器会编译成真实运行时的值；接口、`type`、泛型参数、类型断言则蒸发。能否"在运行时找到它"，是判断一个构造属于哪一类的最快标准。

## 二、擦除的可见后果

直接看运行时里各种构造的"存活情况"：

> 摘自 `./code/runtime-lab/demos/erase.ts`（运行：`npm run runtime`）

```typescript
interface User { id: number; name: string }
type Point = { x: number; y: number }
```

接口和 `type` 别名在运行时连影子都没有——`typeof User` 是 `undefined`。而类本身是构造函数，必然保留：

> 摘自 `./code/runtime-lab/demos/erase.ts`（运行：`npm run runtime`）

```typescript
class Account { balance = 0 }
```

更有迷惑性的是**普通枚举**：它编译成一个双向映射的真实对象，既能正向取值，也能用值反查名字：

> 摘自 `./code/runtime-lab/demos/erase.ts`（运行：`npm run runtime`）

```typescript
enum Role { Admin, User }
console.log('Role.Admin =', Role.Admin)
console.log('Role[0]    =', Role[0])
```

实测输出：

```
typeof User  = undefined
typeof Point = undefined
typeof Account = function
Role.Admin = 0
Role[0]    = Admin
```

**结论**：能写在类型位置的，运行时未必存在；能 `new` 的，一定存在。一个典型坑是拿 `instanceof` 去判断一个接口——接口根本不存在，这样写必崩。

## 三、unknown 与外部数据：类型守护不了运行时

类型系统的安全保证有一个前提：**数据在编译期就已知形状**。而真实系统里，绝大多数数据来自外部——接口返回、localStorage、WebSocket 推送、用户粘贴。它们进入 TS 程序时，类型只能是 `unknown`（或 `any`），因为编译器无从得知网络那头到底回了什么。

这正是类型系统力所不及的地方。即便你声明了 `fetchUser(): User`，函数体内的 `return JSON.parse(resp)` 也只产出一个 `unknown`；所谓 `User` 只是你"告诉"编译器的，运行时没有任何东西去验证它真长那样。字段缺失、类型错配、多一层嵌套——类型系统全程沉默。

## 四、运行时校验：从 unknown 到 typed 的桥

解法是在边界上做**运行时校验**：拿到 `unknown`，按一份 schema 收窄成可信类型，不合规就抛错。下面是一个极简手写校验器：

> 摘自 `./code/runtime-lab/demos/validate.ts`（运行：`npm run runtime`）

```typescript
function validate(schema: Schema, input: unknown): unknown {
    if (schema.kind === 'string') {
        if (typeof input !== 'string') throw new Error('期望 string')
        return input
    }
    if (schema.kind === 'number') {
        if (typeof input !== 'number') throw new Error('期望 number')
        return input
    }
    // …
    if (schema.kind === 'object') {
        if (typeof input !== 'object' || input === null || Array.isArray(input)) {
            throw new Error('期望 object')
        }
        const out: Record<string, unknown> = {}
        for (const [key, sub] of Object.entries(schema.fields)) {
            out[key] = validate(sub, (input as Record<string, unknown>)[key])
        }
        return out
    }
    throw new Error('未知 schema')
}
```

用一份 schema 描述"用户"，并把它同时当作校验规则和文档：

> 摘自 `./code/runtime-lab/demos/validate.ts`（运行：`npm run runtime`）

```typescript
const UserSchema: Schema = {
    kind: 'object',
    fields: { id: { kind: 'number' }, name: { kind: 'string' } }
}
```

非法输入会被这道闸门拦下，而不是被类型系统"默认相信"：

> 摘自 `./code/runtime-lab/demos/validate.ts`（运行：`npm run runtime`）

```typescript
let failed = false
try {
    validate(UserSchema, JSON.parse('{"id":"oops"}'))
} catch (e) {
    failed = true
    console.log('拦截到非法输入:', (e as Error).message)
}
```

实测输出：

```
解析成功: { id: 1, name: 'Ada' }
拦截到非法输入: 期望 number
```

工程上这一步通常用成熟库代劳——`zod`（`schema.parse` 同时产出类型与校验）、`io-ts`、`superstruct`。核心思想都一样：**schema 是单一事实源，既生成类型，又执行校验**。"类型体操"里写出的复杂类型，往往就是给这类 schema 做类型推导用的。

## 五、类型守卫与断言函数

校验是从外部收窄 unknown；守卫与断言则是在程序内部、把"运行时判断"提升成"编译期收窄"的两套原语。

类型守卫用一个返回 `a is T` 的函数，让 `if` 分支内自动收窄联合类型：

> 摘自 `./code/runtime-lab/demos/guards.ts`（运行：`npm run runtime`）

```typescript
function isFish(a: Animal): a is Fish {
    return a.kind === 'fish'
}
function move(a: Animal) {
    if (isFish(a)) a.swim() // 这里 a 被收窄成 Fish
    else a.fly() // 这里 a 是 Bird
}
```

断言函数则反过来——不满足就抛，满足后调用点收窄：

> 摘自 `./code/runtime-lab/demos/guards.ts`（运行：`npm run runtime`）

```typescript
function assertNever(x: never): never {
    throw new Error('未穷尽分支: ' + JSON.stringify(x))
}
function describe(a: Animal): string {
    switch (a.kind) {
        case 'fish':
            return '鱼'
        case 'bird':
            return '鸟'
        default:
            return assertNever(a) // 若未来新增 kind，这里编译期就会报错
    }
}
```

`assertNever` 配合 `never` 类型是个极实用的套路：联合类型每加一个成员，忘记处理的分支会立刻编译报错，把"漏写分支"这种运行期 bug 提前到写代码时。

## 六、品牌类型：把运行时校验压进编译期

"任意 `string` 都能当 id 传"是另一类高频 bug。品牌类型（branded type）给底层类型贴一个编译期标签，让不同语义的 `string` 互相不兼容，而贴标签的入口被严格收口：

> 摘自 `./code/runtime-lab/demos/brand.ts`（运行：`npm run runtime`）

```typescript
type UserId = string & { readonly __brand: 'UserId' }
type OrderId = string & { readonly __brand: 'OrderId' }

function makeUserId(raw: string): UserId {
    if (!/^\d+$/.test(raw)) throw new Error('UserId 必须是数字串')
    return raw as UserId
}
```

`makeUserId` 是全仓库唯一允许"贴标签"的地方——它既做运行期格式校验，又返回带品牌的值。之后 `UserId` 与 `OrderId` 即便底层都是 `string` 也不可混用，误用会在编译期直接报错，运行期也拦得住非法格式。

## 七、序列化陷阱：JSON 会丢类型

跨进程/跨存储传递数据时，`JSON.stringify` 是默认手段，但它只保留"值的形状"，丢光类型信息：`Date` 变字符串、`Map`/`Set` 退化成普通对象、`undefined` 字段直接消失：

> 摘自 `./code/runtime-lab/demos/serialize.ts`（运行：`npm run runtime`）

```typescript
const original = {
    at: new Date('2026-01-01T00:00:00Z'),
    map: new Map([['a', 1]]),
    set: new Set([1, 2]),
    missing: undefined
}
const text = JSON.stringify(original)
const back = JSON.parse(text)
```

实测输出：

```
序列化后: {"at":"2026-01-01T00:00:00.000Z","map":{},"set":{}}
at  变成: 2026-01-01T00:00:00.000Z → string
map 变成: {} (Map 退化成普通对象)
missing 字段: 已丢失
```

正确做法是在序列化时显式带上类型标记，反序列化侧按标记重建：

> 摘自 `./code/runtime-lab/demos/serialize.ts`（运行：`npm run runtime`）

```typescript
function encode(value: unknown): string {
    return JSON.stringify(value, (_k, v) => {
        if (v instanceof Date) return { __t: 'Date', v: v.toISOString() }
        if (v instanceof Map) return { __t: 'Map', v: [...v.entries()] }
        return v
    })
}
```

这节的本质是提醒：**JSON 不是类型系统**。凡是涉及跨边界的数据，要么自带类型信息（schema/标记），要么在两端各写一套对称的编解码。

## 八、端到端类型安全：跨边界的契约

把第七节的教训推到极致，就是"端到端类型安全"：前后端共享**同一份契约**，服务端据此序列化，客户端据此校验与收窄，类型错误在编译期就能暴露，而不是等到线上 500。

> 摘自 `./code/runtime-lab/demos/contract.ts`（运行：`npm run runtime`）

```typescript
function serialize(user: User): string {
    return JSON.stringify(user)
}

function parse(input: unknown): User {
    if (typeof input !== 'object' || input === null) throw new Error('不是对象')
    const o = input as Record<string, unknown>
    if (typeof o.id !== UserSchema.id || typeof o.name !== UserSchema.name) {
        throw new Error('字段类型不符契约')
    }
    return o as User
}
```

实测输出：

```
wire   = {"id":1,"name":"Ada"}
还原   = { id: 1, name: 'Ada' }
```

手写 schema 是"契约"的最小形态。规模化的方案由工具代劳，思路完全一致——从同一份 schema 生成两端类型：

- **tRPC**：函数签名即契约，服务端定义、客户端直接 import 类型，无需手写 HTTP 层。
- **OpenAPI codegen**：后端先写 OpenAPI 描述，前端 `openapi-typescript` 生成 TS 类型，接口字段改名编译期即报错。
- **GraphQL codegen**：`.graphql` 文件生成前端使用的精确类型。

共同收益：把"运行时才发现的字段错配"前移成"编译期就红的签名"。

## 九、类型发布：把类型发给消费者

当你把库发布出去时，消费者需要的不是你的 `.ts` 源码，而是编译出的**声明文件（`.d.ts`）**——它只包含类型，运行时不产生任何代码。

源文件长这样：

> 摘自 `./code/runtime-lab/publish/mathlib.ts`（运行：`npm run runtime`）

```typescript
export interface Vec2 {
    x: number
    y: number
}

export type Id = string & { readonly __brand: 'Id' }

export function add(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x + b.x, y: a.y + b.y }
}
```

`tsc --emitDeclarationOnly` 从它生成的就是下面这份——消费者 `import { add, type Vec2 }` 拿到的就是这些类型，运行时零成本：

> 摘自 `./code/runtime-lab/publish/mathlib.d.ts`（运行：`npm run runtime`）

```typescript
export interface Vec2 {
    x: number;
    y: number;
}
export type Id = string & {
    readonly __brand: 'Id';
};
export declare function add(a: Vec2, b: Vec2): Vec2;
```

生成声明文件这件事本身也能在运行时完成（演示"类型发布"的本质）：

> 摘自 `./code/runtime-lab/demos/publish.ts`（运行：`npm run runtime`）

```typescript
import { emitDts } from '../_tsc.cjs'
// …
const dts = emitDts(src)
```

发布带类型的包时还要注意两点：用 `package.json` 的 `"types"` 字段（或 `exports` 里的 `"types"` 条件）指向 `.d.ts`；若用 bundler 打包，确保声明文件随包发出，否则消费者装了包却拿不到类型。

## 十、方法论：什么时候信类型、什么时候必须运行时检查

把前面的结论收敛成一张决策表：

- **可以信任类型**：纯内部逻辑、数据从 `new`/字面量/函数返回值产生、没有跨越进程或 I/O 边界。这类地方类型系统提供完整保护。
- **必须运行时检查**：一切 `unknown`/`any` 入口（网络、存储、环境变量、反序列化）；一切"类型系统以为对、运行时未必对"的构造（枚举反向映射、品牌类型的值、序列化后的数据）。
- **用守卫/断言收窄**：内部联合类型分支、穷尽性检查，首选 `is` 守卫与 `assertNever`。
- **用品牌类型防混用**：语义不同的底层同型值（各类 id、各种 token）。
- **跨边界必有契约 + 校验**：前后端、服务间、持久化层，永远假设对端可能不守约。

一句话：**类型负责"写代码时没错"，运行时检查负责"跑起来时没被骗"。两者覆盖不同的边界，缺一不可。**

## 小结

- **擦除是选择性的**：接口 / `type` / 泛型 / 类型断言编译后消失；类 / 枚举 / 装饰器保留为真实运行时值
- **类型只在编译期存在**
  - 能写在 `: ` 后面的未必能在运行时找到（`instanceof` 接口必崩）
  - 普通枚举编译成双向映射对象（正向取值 + 值反查名字）
- **外部数据 = unknown**：类型系统无法担保网络/存储/反序列化的形状
  - 校验层是 unknown → typed 的桥：手写 schema 或 zod/io-ts，schema 作单一事实源
  - 非法输入必须抛错，不能靠类型系统"默认相信"
- **编译期与运行时的桥**
  - 类型守卫 `a is T`：把运行时判断提升成编译期收窄
  - 断言函数 + `assertNever`：未穷尽分支在编译期报错
  - 品牌类型：给底层同型值贴编译期标签，防混用（入口收口 + 运行期校验）
- **JSON 不是类型系统**：Date/Map/Set/undefined 序列化后保不住，跨进程需自带类型信息或对称编解码
- **端到端类型安全**：前后端共享同一份契约（tRPC / OpenAPI codegen / GraphQL codegen），字段错配前移成编译期错误
- **类型发布 = 发 .d.ts**：消费者 import 的是类型、运行时零成本；用 `types` / `exports.types` 指向声明文件

## 配套代码

| 文件 | 作用 | 对应小节 |
|---|---|---|
| `./code/runtime-lab/demos/erase.ts` | 擦除的运行时后果：接口/类/枚举存活对比 | 二 |
| `./code/runtime-lab/demos/validate.ts` | 手写 mini 校验器，unknown → typed | 四 |
| `./code/runtime-lab/demos/guards.ts` | 类型守卫 / 断言函数 / assertNever | 五 |
| `./code/runtime-lab/demos/brand.ts` | 品牌类型 | 六 |
| `./code/runtime-lab/demos/serialize.ts` | JSON 序列化丢类型 + 带标记编解码 | 七 |
| `./code/runtime-lab/demos/contract.ts` | 共享契约的序列化/校验（端到端边界） | 八 |
| `./code/runtime-lab/demos/publish.ts` | 运行时生成 .d.ts（类型发布本质） | 九 |
| `./code/runtime-lab/publish/mathlib.ts` | 被发布的带类型库源文件 | 九 |
| `./code/runtime-lab/publish/mathlib.d.ts` | 由源文件 emit 出的声明文件 | 九 |
| `./code/runtime-lab/run.cjs` | 转译并执行全部 demo，node:assert 自检 | 全篇 |

## 参考

- [TypeScript 模块总结](./总结)
- [TypeScript 面试题](./面试题)
- [TypeScript 类型系统](./TypeScript%20类型系统)（结构类型 / 可赋值性 / 收窄的基础）
- [TypeScript 类型体操](./TypeScript%20类型体操)（复杂类型为 schema 做类型推导）
- [TypeScript 官方 Handbook：Type Compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)
- [zod 文档](https://zod.dev/)（schema 即单一事实源的代表实现）
