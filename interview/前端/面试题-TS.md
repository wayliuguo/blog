# 面试题 · TS

## 一、基础与类型系统

### 1. TypeScript 和 JavaScript 的区别？项目里为什么要引入 TS？

**结论：TS = JS + 静态类型系统，编译后做「类型擦除」还原为 JS——类型只存在于编译期，运行时没有任何校验。价值不在「多一种语言」，而在重构安全网、接口契约和 IDE 体验。**

- 核心区别
  - 静态类型：编译期发现类型错误（JS 错误推迟到运行时）
  - 类型擦除：TS 编译器只删类型标注、不改运行时逻辑——产物就是等价 JS
  - 运行时零校验：`user.name` 编译期保证是 string，但接口实际返回什么 TS 管不着
- 引入 TS 的实际价值（面试按这三条说）
  - **重构安全网**：改一个字段类型，所有受影响的调用点编译期标红，不用人肉全局搜索
  - **类型即文档/契约**：函数签名就是最准的文档（永远不过期）；前后端、模块间的接口约定显式化
  - **IDE 体验**：补全、跳转、重构全靠类型信息，大型项目开发效率的真正来源
- 追问：TS 项目的编译流程是什么？
  - 报错检查与产物生成是两条线：tsc 做类型检查，esbuild/swc/Babel 只做类型擦除（快但不查错）——工程上「esbuild 打包 + tsc --noEmit 检查」双轨制
- 追问：TS 能保证运行时类型安全吗？
  - 不能。运行时数据（接口响应、localStorage、postMessage）类型未知，需要 zod/io-ts 这类运行时校验库补边界（详见类型治理题）

### 2. type 与 interface 的区别？怎么选？

**结论：都能描述对象结构；interface 可声明合并、可 extends/implements，type 能表达联合/交叉/元组/原始类型等一切类型。**

| 能力 | interface | type |
| --- | --- | --- |
| 对象/函数结构 | ✅ | ✅ |
| 声明合并（同名自动合并） | ✅ | ❌（重复声明报错） |
| extends / implements | ✅ | type 之间用交叉 `&` 组合 |
| 联合、元组、映射、条件类型 | ❌ | ✅ |
| 为原始类型起别名 | ❌ | ✅ |

- 选择策略
  - 公共 API、组件 Props、期望被扩展（声明合并）→ interface
  - 联合/交叉/工具类型组合 → type
  - 团队统一其一即可，别混着来
- 可选 / 只读：`age?: number`（可选）、`readonly id: string`（只读，初始化后不可再赋值）
- 追问：声明合并有什么实际用途？
  - 给第三方库「补类型」（window 上挂自定义属性、扩展模块成员）
- 追问：交叉类型和 interface extends 的区别？
  - `&` 遇到同名属性类型冲突时变 never，extends 则直接报错——冲突更早暴露
- 追问：索引签名是什么？`[key: string]: any` 的坑？
  - 动态键的对象（如字典）需要索引签名；`any` 值的坑是**它让所有具名属性的类型检查失效**（any 可赋给任何类型，具名属性约束全被架空）——值类型尽量写具体（`Record<string, string>`），具名属性与索引签名类型要兼容

### 3. any、unknown、never、void 的区别？

**结论：any 是放弃检查（双向畅通），unknown 是安全版 any（用前必须收窄），never 是空类型（谁都不能赋给它），void 是「无返回值」。**

| 类型 | 可赋给别的类型 | 能接收任何值 | 典型用途 |
| --- | --- | --- | --- |
| `any` | ✅ | ✅ | 逃生舱，等于关掉 TS |
| `unknown` | ❌（必须先收窄） | ✅ | 接收不可信外部输入（JSON.parse、catch 的 err） |
| `never` | ✅（bottom type） | ❌ | 不可达代码、空联合、穷举检查 |
| `void` | ❌（严格模式下只能赋 null/undefined） | ❌ | 函数无返回值 |

- any 的弊端与纪律
  - any 的值可以随意调用属性、参与运算，错误被推迟到运行时；any 会**传染**（any 参与的表达式结果都是 any）
  - 什么时候才适合：快速原型/遗留 JS 渐进迁移的临时标注；生产代码一律 lint 禁 any（`@typescript-eslint/no-explicit-any`），兜底一律 unknown
- unknown 的收窄方式：`typeof`/`instanceof`/`in` 判断、自定义守卫、`as` 断言——不收窄不能参与任何运算
- never vs void：void 是「有调用、无返回」（`undefined` 的子集语义）；never 是「根本不会正常返回」（抛错、死循环、空联合）
- never 的高频应用：**穷举检查**

  ```ts
  type Shape = 'circle' | 'square'
  function area(s: Shape) {
    switch (s) {
      case 'circle': return 1
      case 'square': return 2
      default:
        const _exhaustive: never = s  // 漏 case 时这里编译报错
        return _exhaustive
    }
  }
  ```

- 追问：`type A = any & string` 结果是什么？
  - `any`——any 与任何类型交叉都是 any（any 是类型系统的「黑洞」），这也是 any 危险性的类型论根源

### 4. 类型注解与类型推断分别是什么？字面量类型有什么用？

**结论：能推断就不写注解；字面量类型把「值域」钉死到具体值，是联合类型和判别联合的基石；变量声明会放宽（widening），`as const` 可锁死字面量。**

- 类型推断的常见时机
  - 声明并初始化（`let n = 1` → number）、函数返回值、上下文推断（回调参数按目标签名推）、默认参数
  - 函数参数推不出来（必须注解），返回值多数能推
- 字面量类型
  - `type Dir = 'up' | 'down'`——值域从「任意 string」收窄到两个具体值，拼错编译期报错
  - 数字/布尔字面量同理（`type One = 1`）
- widening（字面量放宽）
  - `let s = 'hello'` 推断为 `string` 而非 `'hello'`（let 会放宽）；`const s = 'hello'` 才是字面量类型
- `as const`：整体锁死为最窄字面量 + readonly——「常量对象 + 联合类型」同源写法的核心

  ```ts
  const Status = { Active: 'active', Done: 'done' } as const
  type Status = (typeof Status)[keyof typeof Status]  // 'active' | 'done'
  ```

- 追问：`as const` 和 `readonly` 的区别？
  - as const 作用于值（深层 readonly + 字面量收窄）；readonly 是类型层面的属性修饰符（浅）

### 5. 枚举（enum）的坑？还该用吗？

**结论：数字枚举有反向映射和隐式自增的坑；现代实践更推荐 const 对象 + `as const` + 字面量联合。**

- 数字枚举的坑
  - 反向映射：`enum F { A }` 会生成对象 `{0: 'A', A: 0}`，双倍体积
  - 隐式自增：只给第一个赋值，后面依次 +1，中间插入一项全体错位
  - 计算成员必须跟在常量成员之后，否则报错
- `const enum`：编译期内联替换、无运行时对象——但 `isolatedModules`/Babel 环境受限（会降级或报错）
- 推荐替代

  ```ts
  const Status = { Active: 'active', Done: 'done' } as const
  type Status = (typeof Status)[keyof typeof Status]  // 'active' | 'done'
  ```

  - 好处：运行时真值可调试、类型与值同源、不生成多余对象
- 追问：字符串枚举什么时候还值得用？
  - 需要稳定序列化值且和后端约定的场景（状态码集合），不想引入 as const 样板时

### 6. 联合类型与交叉类型的行为差异？

**结论：联合是「或」——只能访问公共成员；交叉是「与」——成员全部叠加，冲突变 never（所以交叉不是「并集」，是「同时满足」）。**

- 联合 `A | B`
  - 只能访问 A、B 的公共成员；配合收窄分别处理
- 交叉 `A & B`
  - 属性取「同时满足」，同名函数属性构成重载；同名标量类型冲突 → `never`
- 高频应用
  - 联合：状态机、API 响应（配判别联合）
  - 交叉：mixin 组合、给类型追加字段（branding 也靠它）
- 追问：`string & number` 是什么？
  - never；这正是交叉类型可用于「排除」的原理（Exclude 等工具类型底层）

## 二、泛型与类型体操

### 7. 泛型解决什么问题？泛型约束怎么用？

**结论：泛型做「类型参数化」——一份逻辑保住具体类型；约束用 extends 限定能力，keyof/索引访问做安全取值。**

- 没有泛型的两难
  - 用 any 丢类型；不用泛型就要为每个类型写一份重复代码
- 泛型函数 + 约束 + 索引访问（必会模板）

  ```ts
  function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key]
  }
  getProperty(user, 'name')  // string
  getProperty(user, 'age')   // 编译报错：不在 keyof T 内
  ```

- 泛型默认值
  - `interface Res<T = unknown, E = Error>`（使用时不带参也合法）
- 追问：泛型什么时候推断、什么时候显式传？
  - 能推断就不写；联合/复杂返回值推断不出时显式标注
- 关联积木
  - `keyof T` 取键联合、`T[K]` 索引访问、`typeof` 从值取类型——工具类型全靠这三件
  - 追问：类型层面的 `typeof` 与 JS 的 `typeof` 区分？——类型位置 `typeof obj` 是「从值取类型」（编译期）；值位置 `typeof x === 'string'` 是运行时判断（顺便收窄）
  - 追问：`keyof any` 是什么？——`string | number | symbol`，所有合法键类型的联合（Record/Omit 约束用它）

### 8. 条件类型与 infer 怎么用？分发特性什么时候触发？

**结论：条件类型是「类型层三元」，infer 在 extends 分支里声明待推断的占位；裸类型参数参与条件才分发，包一层元组就不分发。**

- 条件类型

  ```ts
  type IsString<T> = T extends string ? 'yes' : 'no'
  ```

- 分发律（高频陷阱）
  - **裸类型参数**参与条件会按联合分发，`never` 分发得 `never`

  ```ts
  type ToArr<T> = T extends any ? T[] : never
  type R = ToArr<string | number>  // string[] | number[]（不是 (string|number)[]）
  // 阻止分发：[T] extends [any] ? T[] : never
  ```

  - 触发/不触发一句话：`T extends ...` 里 T 是裸的 → 分发；`[T]`、非联合入参、T 已实例化为具体联合之外的场景 → 不分发
- infer 典型模板

  ```ts
  type Unwrap<T> = T extends Promise<infer U> ? U : T
  type First<T extends any[]> = T extends [infer F, ...infer Rest] ? F : never
  type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never
  ```

- 追问：infer 可以出现在哪里？
  - extends 右侧的任意位置——数组元素、函数参数、返回值、模板字面量片段

### 9. 映射类型的原理？模板字面量类型是什么？

**结论：`[K in keyof T]` 遍历键生成新对象类型，配合 `+/-` 修饰符增删 readonly/?——内置工具类型全靠它；`as` 重映射 + 模板字面量类型可做「键名变换」。**

- 基本形态

  ```ts
  type MyPartial<T>  = { [K in keyof T]?: T[K] }          // 加 ?
  type MyMutable<T>  = { -readonly [K in keyof T]: T[K] } // 去 readonly
  ```

- 键重映射（4.1+）：`as` 子句改键名/过滤键

  ```ts
  type Getters<T> = { [K in keyof T as `get${Capitalize<K>}`]: () => T[K] }
  ```

  - `as never` 可过滤掉不需要的键（Omit 的另一种实现思路）
- 模板字面量类型
  - 类型层拼字符串：`` `api/${string}` `` 约束路由串；配合 `Uppercase/Lowercase/Capitalize` 内置类型做键名派生
- 追问：联合类型在映射类型中的表现？
  - `in` 遍历联合逐键生成——`{ [K in 'a' | 'b']: boolean }` 得 `{ a: boolean; b: boolean }`
- 追问：映射类型与条件类型怎么配合？
  - 映射管「键的变换」，条件管「值的变换」，工具类型常两者嵌套

### 10. 手写常见内置工具类型

**结论：全部是「映射类型 + keyof + 索引访问 + 条件类型」的组合，面试要能默写。**

```ts
type MyPartial<T>  = { [K in keyof T]?: T[K] }
type MyRequired<T> = { [K in keyof T]-?: T[K] }
type MyReadonly<T> = { readonly [K in keyof T]: T[K] }
type MyPick<T, K extends keyof T>  = { [P in K]: T[P] }
type MyRecord<K extends keyof any, V> = { [P in K]: V }
type MyExclude<T, U> = T extends U ? never : T          // 依赖分发
type MyOmit<T, K extends keyof any> = MyPick<T, MyExclude<keyof T, K>>
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never
type MyParameters<T> = T extends (...args: infer P) => any ? P : never
// 进阶两道（递归 + 模板字面量）
type MyFlatten<T extends any[]> = T extends [infer F, ...infer R]
  ? [...(F extends any[] ? MyFlatten<F> : [F]), ...MyFlatten<R>]
  : []
type MyCapitalize<S extends string> = S extends `${infer F}${infer R}`
  ? `${Uppercase<F>}${R}` : S
```

- 逐个考点
  - `Pick`：`in K` 直接遍历传入的键联合，不用 keyof T
  - `Omit` = Pick + Exclude（Exclude 靠分发把命中的键变 never 剔除）
  - `Record<K, V>`：`K extends keyof any`（= string | number | symbol）约束键合法
  - `ReturnType`：infer 只能写在 extends 右侧的返回位置
  - `Flatten`：递归展开 + infer 拆头尾；`Capitalize`：模板字面量 infer 拆首字符
- 追问：`Exclude` 和 `Omit` 的区别？
  - Exclude 作用于**联合类型**（从联合中剔除成员）；Omit 作用于**对象类型**（从键中剔除属性）——一个是「值域」操作，一个是「键域」操作
- 追问：`Extract` 和 `Pick` 的区别？
  - 同理：Extract 从联合中**筛选**能赋给 U 的成员（`Extract<'a'|'b'|'c', 'a'|'b'>` → `'a'|'b'`）；Pick 从对象中**挑选**键生成子集
- 追问：`Omit` 为什么不用 `keyof T` 做约束？
  - 官方为兼容索引签名类型放宽到 `keyof any`——宽松是有意为之

## 三、类型系统进阶

### 11. 类型收窄（类型保护）有哪些方式？断言有什么风险？

**结论：TS 依据控制流自动收窄；自定义收窄用 `is` 谓词，联合收窄用判别联合；`as` 断言是「我说是就是」，运行时不验证。**

- 内置收窄
  - `typeof x === 'string'`（注意 typeof null 的坑，先排除 null）
  - `instanceof`（类/原型链）
  - `in`（检查属性存在）
  - 真值收窄（`if (x)` 排除 null/undefined）
- 自定义类型守卫：`x is T` 谓词

  ```ts
  function isFish(pet: Fish | Bird): pet is Fish {
    return 'swim' in pet
  }
  ```

  - 追问 `is` 与返回 boolean 的区别？
    - boolean 拿不到收窄信息，is 才能让分支内类型正确
- **判别联合（Discriminated Union）**
  - 联合各成员带同一字面量字段，switch 该字段自动收窄——建模 API 响应的标准姿势

  ```ts
  type Res = { ok: true; data: User[] } | { ok: false; error: string }
  ```

- 追问：`as` 断言与类型守卫的区别？断言的风险？
  - as 是「我说是就是」（运行时不验证），守卫是运行时真实判断——断言错了错误照样到运行时
  - 越界断言要 `as unknown as T` 双跳，出现即坏味道
  - `as` 与 `<>` 写法等价，但 `<>` 在 tsx 里与 JSX 标签冲突，**统一用 as**

### 12. 什么是结构类型系统（鸭子类型）？空对象类型 `{}` 有什么陷阱？

**结论：类型兼容看「形状」不看「名字」——只要成员满足，就算没声明关系也兼容；`{}` 不是空对象，是「任何非 null/undefined 的值」。**

- 示例
  - 两个独立声明的接口，成员相同则可互相赋值
- 与名义类型系统（Java/C#）的区别
  - TS 只认结构，class 之间同样按结构比较
- `{}` / `Object` / `object` 三兄弟辨析
  - `{}` 接受一切非空值（`1`、`'x'`、`[]` 都行）——几乎等于 unknown，当「空对象」用是经典误用
  - `object` 只接受非原始类型；要「无属性对象」得用 `Record<string, never>`
- 高频追问：两个结构相同但语义不同的类型怎么防误用？
  - **品牌（branding）**：给类型加一个不存在的假字段

  ```ts
  type UserId = string & { readonly __brand: 'UserId' }
  ```

- 追问：多余属性检查的规则？
  - 只发生在对象字面量直接赋值时；变量中转可绕过——这是设计而非 bug

### 13. 递归类型怎么写？可变元组类型是什么？

**结论：类型可以引用自身定义嵌套结构（树/JSON/DeepPartial）；可变元组（4.0+）用 `...infer Rest` / 展开运算符在类型层操作元组头尾。**

- 递归树结构

  ```ts
  interface TreeNode {
    id: string
    children?: TreeNode[]   // 类型引用自身 = 递归类型
  }
  ```

- 递归工具类型（高级高频）：DeepPartial

  ```ts
  type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
  }
  // 用途：局部更新深嵌套对象（setState/patch 配置项）
  ```

  - 递归必须有终止条件（非 object 分支返回原始类型），否则无限递归
- 可变元组类型

  ```ts
  type Tail<T extends any[]> = T extends [any, ...infer Rest] ? Rest : []
  type Concat<A extends any[], B extends any[]> = [...A, ...B]  // 长度信息保留
  // 柯里化类型：Curried<F> 依赖可变元组拆参
  ```

  - 价值：让「元组长度/位置」参与类型运算，是高级体操（Curry 类型、Arguments 类工具）的底座

## 四、工程实践

### 14. tsconfig 里哪些配置最关键？strict 包含什么？

**结论：strict 一揽子开启 + paths/esModuleInterop/skipLibCheck 是项目标配；讲清每个严格项拦什么错误是加分点。**

- 必会核心项

| 配置 | 作用 |
| --- | --- |
| `strict` | 开启下述全部严格检查 |
| `noImplicitAny` | 隐式 any 报错（推断不出即报） |
| `strictNullChecks` | null/undefined 不再可赋给任意类型——最大价值项 |
| `strictFunctionTypes` | 函数参数逆变检查 |
| `noUncheckedIndexedAccess` | 索引访问自动带 undefined（防越界，很多团队开） |
| `esModuleInterop` | CJS/ESM 互操作（默认导入行为修正） |
| `skipLibCheck` | 跳过 node_modules 类型检查，提速编译 |
| `paths` / `baseUrl` | 路径别名（build 后运行时解析要靠打包器配套） |
| `isolatedModules` | 强制单文件可独立转译（配合 esbuild/swc/Babel） |

- strict 全家桶补充
  - `strictBindCallApply`、`strictPropertyInitialization`（类属性必须初始化）、`noImplicitThis`、`useUnknownInCatchVariables`
- 高频追问：TS 是在运行时做类型校验吗？
  - 不是。类型检查只在编译期；运行时只有 JS（类型已擦除）——「编译期保证 + 运行时裸奔」是 TS 的本质
- 高频追问：为什么 esbuild 转译 TS 不做类型检查？
  - esbuild/swc/Babel 只做「类型擦除」，类型错误要靠 `tsc --noEmit` 单独跑
  - CI 双轨制：打包用 esbuild（快），类型检查用 tsc（全）

### 15. 声明文件（.d.ts）怎么写？什么时候需要？

**结论：三种来源——库自带 types、@types 包、自己补 declare；给无类型 JS 库/全局对象扩展补声明是高级岗实操题。**

- 类型声明查找顺序
  - package.json 的 `types`/`typings` 字段 → 包内 `index.d.ts` → `@types/xxx`
- 自己写声明的常用语法

  ```ts
  // global.d.ts：扩展全局对象
  declare global {
    interface Window { __APP_CONFIG__: Record<string, string> }
  }
  // 给无类型 CJS 库补最小声明
  declare module 'legacy-lib' {
    export function init(options?: Record<string, unknown>): void
  }
  ```

- `declare` 家族
  - `declare const/let`（全局变量）、`declare function`（外部注入的全局函数，如埋点 SDK）、`declare module`（无类型库）、`declare namespace`（老 UMD 库）
- 第三方库类型缺失的处理路径（面试说全）
  - 先找 `@types/xxx` → 没有就自己 `declare module` 最小声明 → 大型库可维护独立类型包
- 追问：`export as namespace` 是什么？
  - UMD 全局挂载名，让无模块环境也能用该库的类型
- 追问：三斜线指令 `/// <reference types="..." />` 还需要吗？
  - 模块化项目基本不需要（靠 import + tsconfig）；多入口声明文件内部才用

### 16. 模块与命名空间的区别？type-only 导入是什么？

**结论：命名空间是 TS 遗留的组织手段（模块化项目不用）；type-only 导入保证导入在编译后整体擦除。**

- 命名空间
  - 编译为 IIFE 闭包对象，适合全局脚本时代
  - ESM 项目里用它 = 坏味道（遗留代码除外）；`module` 关键字是它的旧别名
  - `export =` 是 TS 对 CJS 的兼容导出（与 `export default` 语义不同，需 `esModuleInterop` 配合才能默认导入）——现在新代码不用
- `import type` / `export type`（必会）
  - 显式标记「只导入类型」，编译后语句消失
  - 价值：避免循环引用被拉进运行时、配合 `isolatedModules` 消除重导出歧义
- 追问：`verbatimModuleSyntax`（5.x）做什么？
  - 强制 import 写法原样保留（type 导入必须显式写 type），让「类型擦除」规则更可预测

### 17. Vue3 + TS 项目里，类型约束怎么落地？有哪些坑？

**结论：defineProps/defineEmits 用「类型字面量参数」让类型直达模板与运行时警告；泛型组件把类型从调用方传进实现；坑集中在「类型层与运行时层对不上」。**

- defineProps 两种写法

  ```ts
  // ① 类型声明（推荐）：纯类型，编译期生成运行时 props 声明
  const props = defineProps<{ id: string; list?: User[] }>()

  // ② 运行时声明 + withDefaults 给默认值
  const props = withDefaults(defineProps<{ size?: 'sm' | 'lg' }>(), { size: 'sm' })
  ```

- defineEmits：类型声明天然支持校验

  ```ts
  const emit = defineEmits<{ change: [id: string]; submit: [data: Form] }>()
  ```

- 泛型组件（5.3+ script generics）

  ```vue
  <script setup lang="ts" generic="T">
  defineProps<{ items: T[]; selected?: T }>()
  ```

  - 调用处 `items: User[]` 时 `selected` 自动推为 `User`——列表选择类组件的标配
- 常见的坑
  - 类型声明写法**不支持运行时默认值**——要默认值就得 withDefaults 或解构默认值（3.5+ 响应式 Props 解构）
  - `defineProps` 是宏不是函数：类型必须**字面量内联**，不能 import 一个外部类型直接塞进去（3.3 起支持导入的受限类型，复杂继承场景仍易踩）
  - 模板里的 `{{ x }}` 不做完整类型检查——要严格需开 `vue-tsc` 并在全量 CI 里跑，别只靠 IDE

### 18. 大型项目类型臃肿、体操过度怎么治理？运行时安全怎么补？

**结论：类型治理的核心是「类型为可读性服务」——能用推断不手写、能简单不嵌套；运行时安全靠边界校验（zod/io-ts），不在全链路堆类型。**

- 类型臃肿的常见来源与治理
  - 全局到处手写巨型 interface → **单一来源**：API 类型从后端/OpenAPI 自动生成，不手抄
  - 复制粘贴变体类型 → 组合：`Pick/Omit/交叉` 从基础类型派生，不重写
  - 深层嵌套体操（五层条件类型）→ 拆成有名字的中间类型，**每个中间结果可单独 hover 验证**
- 避免体操过度的判断标准
  - 体操的收益 = 「错误被编译期拦下」的数量；一段类型如果只服务一次性的花哨转换、报错信息没人看得懂，就退回手写或运行时校验
  - 类型代码同样要 code review：**可读性优先于完备性**
- 运行时类型安全的边界补齐

  ```ts
  import { z } from 'zod'
  const UserSchema = z.object({ id: z.string(), age: z.number() })
  type User = z.infer<typeof UserSchema>   // 类型与校验规则单一来源
  const user = UserSchema.parse(await res.json())  // 运行时真正校验
  ```

  - 落点：只在外部数据入口（接口响应、postMessage、localStorage 读取）校验，内部流转靠 TS 静态保证——**边界校验 + 内部静态**是最省成本的组合
- 追问：类型复用困难怎么办？
  - 抽「领域基础类型」层（ID 品牌类型、实体基础字段），业务类型全部从它派生；工具类型收敛到团队公共包，禁止各处重复造
