# TypeScript 类型体操

类型体操（type gymnastics）指**只用类型层面、在编译期完成的计算**：用条件类型、映射类型、`infer`、模板字面量、递归把"值的集合"当成数据进行变换。它不是面试炫技——`ts-toolbelt`、`type-fest`、Vue3 / Prisma 的类型推导里到处是它；能不能徒手写出一个 `DeepReadonly`、`ParseParams`，直接区分"会用 TS"和"懂 TS"。本篇给一套可运行的训练场，把九类套路逐一拆开练。配置与基础类型见上一篇 [TypeScript 类型系统](./TypeScript%20类型系统.md)，工程落地见下一篇 [TypeScript 工程实践](./TypeScript%20工程实践.md)。

## 一、热身：怎么"判题"

类型体操没有运行时，练手靠的是**让编译器当裁判**。核心是一个相等判定：

> 摘自 `./code/type-gym/utils.ts`（运行：`npm run gym`）

```ts
export type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false
export type Expect<T extends true> = T
```

`Equal<A, B>` 用条件类型判断两个类型是否结构等价：如果"只能接收 `A` 的函数"能赋值给"只能接收 `B` 的函数"，说明 `A`、`B` 等价。`Expect<T extends true>` 把关——`Equal<你的答案, 期望>` 一旦不等就编译失败，红的就是没做对的题。

训练场两份文件共用这套工具：`exercises.ts` 里每道题的答案位写成 `TODO`（即 `never`），于是 50 道题共 61 条断言全部不成立；`solutions.ts` 把 `TODO` 换成正确答案，应当 0 错误。两个命令给出真实结论：

```
typescript 5.8.2 · solutions（答案） · 0 个诊断
✓ 0 错误（答案全部成立）

typescript 5.8.2 · exercises（未解题） · 61 个诊断
exercises.ts  61 处
```

练的时候，先 `npm run gym` 确认答案全绿，再把 `solutions.ts` 里某题的答案**改回 `TODO`** 或你的写法，跑 `npm run gym:todo` 看那一条是否还报错——这就是你的类型单测。

## 二、套路一：条件类型 + `infer`（提取）

体操里一半的题目都在"从一个类型里把另一段抠出来"，`infer` 就是干这个的：在 `extends` 的位置声明一个"待推断的类型变量"。

> 摘自 `./code/type-gym/solutions.ts`（运行：`npm run gym`）

```ts
type MyReturnType<F> = F extends (...a: any) => infer R ? R : never
type MyAwaited<T> = T extends Promise<infer U> ? MyAwaited<U> : T
type MyParameters<F> = F extends (...a: infer P) => any ? P : never
type MyInstanceType<T> = T extends new (...a: any) => infer R ? R : never
```

要点：`infer R` 只能出现在 `extends` 右侧的条件分支里，推断出的值只在那个分支可用；`MyAwaited` 递归解开嵌套 `Promise`，`MyInstanceType` 用 `new (...)` 构造签名把 class 的实例类型抠出来。这正是内置 `ReturnType` / `Awaited` / `Parameters` / `InstanceType` 的实现骨架。

## 三、套路二：映射类型 + 修饰符（改写键与值）

需要"对对象的每个属性做同一件事"时，用映射类型 `[K in keyof T]` 遍历键，修饰符 `?` / `readonly` 及其负号 `-?` / `-readonly` 负责增删可选项与只读性。

> 摘自 `./code/type-gym/solutions.ts`（运行：`npm run gym`）

```ts
type MyReadonly<T> = { readonly [K in keyof T]: T[K] }
type MyPartial<T> = { [K in keyof T]?: T[K] }
type MyRequired<T> = { [K in keyof T]-?: T[K] }
type Mutable<T> = { -readonly [K in keyof T]: T[K] }
type MyPick<T, K extends keyof T> = { [P in K]: T[P] }
type MyOmit<T, K extends keyof T> = { [P in Exclude<keyof T, K>]: T[P] }
type KeysToUppercase<T> = { [K in keyof T as Uppercase<K & string>]: T[K] }
```

`MyOmit` 是先 `Exclude` 掉要删的键再映射；`KeysToUppercase` 用了 **key 重映射**（`as Uppercase<...>`）——这是 TS 4.1 后映射类型最强大的地方：键本身也能被计算。这些正是内置 `Readonly` / `Partial` / `Required` / `Pick` / `Omit` 的源码级实现。

## 四、套路三：递归类型（处理不定长结构）

元组、嵌套对象这种"长度或深度不固定"的结构，靠递归在类型上展开。`infer` 拆出首项与剩余项，对剩余项再调自己。

> 摘自 `./code/type-gym/solutions.ts`（运行：`npm run gym`）

```ts
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
```

`Reverse` / `Flatten` 用元组解构递归；`Repeat` 用"累加元组长度"逼近数字 `N`（类型里没有循环，靠递归 + 长度比较模拟）；`DeepPartial` / `DeepReadonly` 对嵌套对象逐层加修饰符。注意 `Deep*` 两题用 `T extends object` 当递归终止条件——基本类型（number / string）不满足 `object`，直接原样返回，不会无限递归。

## 五、套路四：模板字面量类型（玩字符串）

TS 4.1 起字符串也能在类型上做模式匹配，`${infer X}` 在类型字符串里抠片段，`Uppercase` / `Capitalize` 等内置辅助改写大小写。

> 摘自 `./code/type-gym/solutions.ts`（运行：`npm run gym`）

```ts
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
```

`ParseParams` 把 `'/user/:id/post/:pid'` 解析成 `'id' | 'pid'` 的联合——这正是前端路由类型化（把 `:param` 收进路由的 params 类型）的底层做法。`Trim` 演示了模板字面量的**分布式匹配**：`` ` ${infer R}` `` 和 `` `${infer R} ` `` 两个分支把首尾空格轮流吃掉。

## 六、套路五：联合与分发（集合运算）

联合类型本质是"值的集合"，很多"筛选 / 拆解"题是在对集合做运算。关键认知：**裸 `T extends U ? X : Y` 在 `T` 是联合时会逐成员分发**——这正是 `Exclude` 的由来。

> 摘自 `./code/type-gym/solutions.ts`（运行：`npm run gym`）

```ts
type MyExclude<T, U> = T extends U ? never : T
type MyExtract<T, U> = T extends U ? T : never
type MyNonNullable<T> = T extends null | undefined ? never : T
type TupleToUnion<T> = T extends [infer F, ...infer R] ? F | TupleToUnion<R> : never
```

`MyExclude` 利用分发：`'a'|'b'|'c'` 逐个判断能否赋给 `'a'`，能的变 `never`（联合里 `never` 被吸收），剩下的就是 `'b'|'c'`。`TupleToUnion` 是另一种"拆解"——把元组逐元素拆成联合。

## 七、从体操到实战

套路不是为了难而难，下面四题直接对应日常类型设计：接口信封、异步加载态、表单错误、对象合并。

> 摘自 `./code/type-gym/solutions.ts`（运行：`npm run gym`）

```ts
type ApiResponse<T> = { code: number; data: T; msg: string }
type LoadingState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string }
type FormErrors<T> = { [K in keyof T]?: string }
type Merge<A, B> = { [K in keyof A | keyof B]: K extends keyof B ? B[K] : K extends keyof A ? A[K] : never }
```

`LoadingState` 用**判别联合**把三种状态收进一个类型（按 `status` 收窄就能安全拿到 `data` 或 `error`）；`FormErrors` 把任意表单类型映射成"每个字段一个可选错误串"；`Merge` 让后一个对象覆盖前一个——注意它写成映射类型而不是 `Omit<A, keyof B> & B`：交叉类型在被 `Equal` 这类严格相等判定比较时不可靠，映射版本产出的是**扁平对象**，无论判题还是阅读都更干净。

## 八、练习方法论：一道题怎么拆

不要盯着空类型发呆，按四步走：

1. **先写 Expected**：把你期望的输出类型直接敲出来（比如 `Expect<Equal<First<[1,2,3]>, 1>>`），这逼你想清"答案长什么样"。
2. **认套路**：是提取（`infer`）？改键（`as` / 映射）？拆元组（递归解构）？还是集合运算（分发）？
3. **写 Answer**：先用 `any` / `infer` 占位跑通结构，再收紧约束。
4. **交给编译器判**：`npm run gym` 看那条断言是否变绿，红了就读报错信息反推——类型错误的信息（TS2344 / TS2536 等）比猜测准得多。

训练场 50 道题按 A–F 六组覆盖了上面全部套路：A 元组与基础、B 函数与 `infer`、C 映射与修饰符、D 条件与递归、E 模板字面量、F 实战组合。把 `exercises.ts` 的 `TODO` 逐个填掉，就是一次完整集训。

## 九、常见陷阱

- **递归深度**：`Reverse` / `Flatten` 这类对长元组递归会撞编译器上限，真实项目里别拿它处理无限长结构；`Flatten` 对嵌套超过几层的元组就不划算。
- **`Equal` 与交叉类型**：`Equal<X & Y, Z>` 经常误判为 `false`，因为条件类型的双向赋值检查对交叉类型不友好。要比较就用扁平对象（见 `Merge` 那题），或只对单一对象类型用 `Equal`。
- **模板字面量的 `string` 兜底**：`` `${string}/:${infer P}` `` 里的 `string` 是贪婪的，多段 `/:` 的路由要先吃最长的那段再递归，否则会漏掉中间参数。
- **`infer` 只能用于条件分支**：写在 `extends` 右侧之外会直接报语法错；推断出来的值也只在命中分支内有效。

## 配套代码

本篇的可运行训练场在仓库 `frontend/进阶/TypeScript/code/type-gym/`。

| 文件 | 演示什么 | 对应小节 |
| --- | --- | --- |
| `./code/type-gym/utils.ts` | `Equal` / `Expect` 相等判定与判题器原理 | 一、热身 |
| `./code/type-gym/exercises.ts` | 50 道题未解版，每题答案位是 `TODO`，跑 `npm run gym:todo` 见 61 处错误 | 八、练习方法论 |
| `./code/type-gym/solutions.ts` | 50 道题答案版，跑 `npm run gym` 应当 0 错误 | 二～七、各套路 |
| `./code/type-gym/run.cjs` | 类型判题器（默认查 solutions，加 `--exercises` 查 exercises） | 一、热身 |

运行方式（在 `code` 目录）：

- `npm run gym`：检查答案版，应当 0 错误
- `npm run gym:todo`：检查未解版，应当出现 61 处类型错误（50 道题，部分有多条断言）
- `npm run check`：顺带验证同目录的 `type-lab` 示例

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[TypeScript 类型系统](./TypeScript%20类型系统.md)（类型即集合、收窄、泛型、推断）
- 下一篇：[TypeScript 工程实践](./TypeScript%20工程实践.md)（配置、声明文件、构建集成、JS 迁移）
