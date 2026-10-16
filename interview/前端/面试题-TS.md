# 面试题 · TS

## 一、基础

### 1. type 与 interface 的区别？怎么选？

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
- 追问：声明合并有什么实际用途？
  - 给第三方库「补类型」（window 上挂自定义属性、扩展模块成员）
- 追问：交叉类型和 interface extends 的区别？
  - `&` 遇到同名属性类型冲突时变 never，extends 则直接报错——冲突更早暴露

### 2. any、unknown、never 三者的区别？

**结论：any 是放弃检查（双向畅通），unknown 是安全版 any（用前必须收窄），never 是空类型（谁都不能赋给它）。**

| 类型 | 可赋给别的类型 | 能接收任何值 | 典型用途 |
| --- | --- | --- | --- |
| `any` | ✅ | ✅ | 逃生舱，等于关掉 TS |
| `unknown` | ❌（必须先收窄） | ✅ | 接收不可信外部输入（JSON.parse、catch 的 err） |
| `never` | ✅（bottom type） | ❌ | 不可达代码、空联合、穷举检查 |

- 为什么 unknown 比 any 安全？
  - any 的值可以随意调用属性、参与运算，错误被推迟到运行时
  - unknown 强制先收窄（typeof/instanceof/断言）才能用，错误在编译期拦下
  - 实践：lint 禁 any（`@typescript-eslint/no-explicit-any`），兜底一律 unknown
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

  - 新增联合成员时，所有漏掉的 switch 编译期报错——这是 never 不可赋值特性的反向利用

### 3. 枚举（enum）的坑？还该用吗？

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

### 4. TS 的 class 相比 ES6 class 增强了什么？

**结论：访问修饰符、readonly、抽象类、参数属性、重载签名——全是 ES6 没有的工程能力。**

- 访问修饰符
  - `public`（默认）/ `private`（仅本类）/ `protected`（本类+子类）
  - `#field` 原生私有字段是运行时强私有；TS `private` 只是编译期检查（转译后仍可访问）
- `readonly`：属性只能在声明或构造函数中赋值
- `abstract` 抽象类
  - 不能实例化，强制子类实现抽象成员——「模板方法」模式的工具
- 参数属性：构造函数参数前加修饰符，自动声明+赋值成员

  ```ts
  class Service {
    constructor(private http: Http, readonly name: string) {}
  }
  ```

- `implements`：类必须满足接口结构（只查不合并）
- 追问：private 字段在运行时怎么真正私有？
  - 用 `#field`，或 WeakMap 存内部状态

## 二、类型系统

### 5. 类型收窄（类型保护）有哪些方式？

**结论：TS 依据控制流自动收窄；自定义收窄用 `is` 谓词，联合收窄用判别联合。**

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

- 追问：`as` 断言与类型守卫的区别？
  - as 是「我说是就是」（运行时不验证），守卫是运行时真实判断
  - 越界断言要 `as unknown as T` 双跳，出现即坏味道

### 6. 什么是结构类型系统（鸭子类型）？

**结论：类型兼容看「形状」不看「名字」——只要成员满足，就算没声明关系也兼容。**

- 示例
  - 两个独立声明的接口，成员相同则可互相赋值
- 与名义类型系统（Java/C#）的区别
  - TS 只认结构，class 之间同样按结构比较
- 高频追问：两个结构相同但语义不同的类型怎么防误用？
  - **品牌（branding）**：给类型加一个不存在的假字段

  ```ts
  type UserId = string & { readonly __brand: 'UserId' }
  ```

- 追问：多余属性检查的规则？
  - 只发生在对象字面量直接赋值时；变量中转可绕过——这是设计而非 bug

### 7. 联合类型与交叉类型的行为差异？

**结论：联合是「或」——只能访问公共成员；交叉是「与」——成员全部叠加，冲突变 never。**

- 联合 `A | B`
  - 只能访问 A、B 的公共成员；配合收窄分别处理
- 交叉 `A & B`
  - 属性取「同时满足」，同名函数属性构成重载；同名标量类型冲突 → `never`
- 高频应用
  - 联合：状态机、API 响应（配判别联合）
  - 交叉：mixin 组合、给类型追加字段
- 追问：`string & number` 是什么？
  - never；这正是交叉类型可用于「排除」的原理（工具类型底层）

## 三、泛型与类型体操

### 8. 泛型解决什么问题？泛型约束怎么用？

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

### 9. 条件类型与 infer 怎么用？

**结论：条件类型是「类型层三元」，infer 在 extends 分支里声明待推断的占位；二者配合实现解构式的类型提取。**

- 条件类型

  ```ts
  type IsString<T> = T extends string ? 'yes' : 'no'
  ```

- 分发律（高频陷阱）
  - 裸类型参数参与条件会按联合分发，`never` 分发得 `never`

  ```ts
  type ToArr<T> = T extends any ? T[] : never
  type R = ToArr<string | number>  // string[] | number[]（不是 (string|number)[]）
  // 阻止分发：[T] extends [any] ? T[] : never
  ```

- infer 典型模板

  ```ts
  type Unwrap<T> = T extends Promise<infer U> ? U : T
  type First<T extends any[]> = T extends [infer F, ...infer Rest] ? F : never
  type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never
  ```

- 追问：infer 可以出现在哪里？
  - extends 右侧的任意位置——数组元素、函数参数、返回值、模板字面量片段

### 10. 映射类型的原理？

**结论：`[K in keyof T]` 遍历键生成新对象类型，配合 `+/-` 修饰符增删 readonly/?——内置工具类型全靠它。**

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
- 追问：映射类型与条件类型怎么配合？
  - 映射管「键的变换」，条件管「值的变换」，工具类型常两者嵌套

### 11. 手写常见内置工具类型

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
```

- 逐个考点
  - `Pick`：`in K` 直接遍历传入的键联合，不用 keyof T
  - `Omit` = Pick + Exclude（Exclude 靠分发把命中的键变 never 剔除）
  - `Record<K, V>`：`K extends keyof any`（= string | number | symbol）约束键合法
  - `ReturnType`：infer 只能写在 extends 右侧的返回位置
- 追问：`Omit` 为什么不用 `keyof T` 做约束？
  - 官方为兼容索引签名类型放宽到 `keyof any`——宽松是有意为之

## 四、工程实践

### 12. tsconfig 里哪些配置最关键？strict 包含什么？

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
- 高频追问：为什么 esbuild 转译 TS 不做类型检查？
  - esbuild/swc/Babel 只做「类型擦除」，类型错误要靠 `tsc --noEmit` 单独跑
  - CI 双轨制：打包用 esbuild（快），类型检查用 tsc（全）

### 13. 声明文件（.d.ts）怎么写？什么时候需要？

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
  - `declare const/let`（全局变量）、`declare function`、`declare module`、`declare namespace`（老 UMD 库）
- 追问：`export as namespace` 是什么？
  - UMD 全局挂载名，让无模块环境也能用该库的类型
- 追问：三斜线指令 `/// <reference types="..." />` 还需要吗？
  - 模块化项目基本不需要（靠 import + tsconfig）；多入口声明文件内部才用

### 14. 模块与命名空间的区别？type-only 导入是什么？

**结论：命名空间是 TS 遗留的组织手段（模块化项目不用）；type-only 导入保证导入在编译后整体擦除。**

- 命名空间
  - 编译为 IIFE 闭包对象，适合全局脚本时代
  - ESM 项目里用它 = 坏味道（遗留代码除外）；`module` 关键字是它的旧别名
- `import type` / `export type`（必会）
  - 显式标记「只导入类型」，编译后语句消失
  - 价值：避免循环引用被拉进运行时、配合 `isolatedModules` 消除重导出歧义
- 追问：`verbatimModuleSyntax`（5.x）做什么？
  - 强制 import 写法原样保留（type 导入必须显式写 type），让「类型擦除」规则更可预测
