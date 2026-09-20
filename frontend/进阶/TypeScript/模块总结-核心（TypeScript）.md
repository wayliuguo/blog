# 模块总结-核心（TypeScript）

> 精简核心版：按篇分组、抽出高频/重要的知识点——成员丰富的主题展开明细，要点型知识点列清单、点到为止。选点按「面试命中度 / 日常复用度」等维度（见[文档组织规范](../../../文档组织规范.md)）。详细知识树见[《模块总结 · TypeScript》](./总结.md)。

## 知识主线（一句话）

本模块的主轴是**类型系统**：从类型本身的心智模型与基础类型（01），到它如何在真实工程里配置、声明与落地（02），再到把最难的类型推导技巧落成能判题的最小实现（03 类型体操），最后回到"类型只在编译期存在"这一事实上拆开运行时这侧的边界（04）——四篇从"如何描述数据"一路推到"类型被擦除之后谁来守边界"。

## 高频核心点

### 01 TypeScript 类型系统

**心智模型与基础类型**

- 类型即集合：`|` 并集、`&` 交集、`never` 空集、`unknown` 全集；可赋值性=子集包含于超集
- 结构类型：只看成员形状；对象字面量直接赋值触发额外属性检查
- 类型只在编译期存在：类型注解与 interface 编译后擦除，`enum` 留运行时对象
- `any` 与 `unknown`：any 关闭检查并会传染；unknown 用前必须收窄，外部数据一律落 unknown
- 字面量会放宽：`let`/对象属性放宽成宽类型，`as const` 锁住字面量；`satisfies` 只校验不改变推断

**收窄 / 对象 / 泛型 / 运算**

- 判别式联合 + `assertNever`：把"漏改一个分支"变成编译错误；自定义类型谓词 `x is T` 是向编译器做出的承诺、不校验实现
- `interface` 可声明合并、`type` 能表达联合/元组/映射/条件；描述公开结构用 interface，做类型运算用 type
- 泛型优于 any：保留"入参与返回值之间的关系"；`extends` 约束是安全使用成员的依据
- `keyof` 与 `T[K]`：让派生类型跟着数据结构自动变化；映射类型 `[K in keyof T]` + `as` 重映射
- 条件类型与 `infer`：`infer` 捕获匹配位置类型；裸类型参数按联合成员逐个分发

### 02 TypeScript 工程实践

- **tsconfig 是落地之基**：`strict` 总开关 + `strictNullChecks`/`noImplicitAny`/`noUncheckedIndexedAccess`；`moduleResolution: Bundler`；`paths` 别名只影响编译期，运行时还要同步 `resolve.alias`
- **build 三件套**：`noEmit` 只做类型检查、`isolatedModules` 配合逐文件转译、`esModuleInterop` 兼容 CJS
- **自然推导 + 边界显式**：内部少写多余注解，函数参数/返回、API 请求/响应等边界必须显式声明
- **.d.ts 声明文件**：`declare` 只描述类型不产出 JS；`declare module` 为无类型库声明形状；`declare global` 扩展全局
- **断言克制、守卫优先**：`as` 是「信任声明」要谨慎；typeof/instanceof/in/谓词收窄才是安全方式；可辨识联合是复杂状态的头号方案
- **创建独立 typecheck**：把 `tsc --noEmit` 独立为脚本，保证无类型错误再产出
- **渐进式迁移**：`allowJs` 跑通 → 逐步收紧（noImplicitAny → strictNullChecks → strict）→ 纳入 CI，切忌一次性推翻重建

### 03 TypeScript 类型体操

- **类型体操 = 类型层面的计算**：条件类型分支、`infer` 提取、映射遍历、模板字面量字符串匹配、递归处理不定长结构
- 判题靠编译器：`Equal<A,B>`（函数类型双向赋值）+ `Expect<T extends true>`
- **五大套路**：提取（`ReturnType`/`Parameters` 同构）、改写键（映射 + `?`/`readonly`/`as` 重映射）、递归（元组 `[infer F, ...infer R]`）、字符串（`${infer X}` + `Uppercase`）、集合运算（裸分发实现 `Exclude`）
- **实战落点**：判别联合、属性映射（`FormErrors`）、对象覆盖（`Merge` 用映射而非交叉）
- 两条纪律：要比较相等用扁平对象别用交叉类型；递归类型别用于无限长结构

### 04 TypeScript 类型与运行时

- **擦除是选择性的**：interface/type/泛型/断言编译后整段消失；类、普通枚举、装饰器保留为真实运行时值——`instanceof` 判接口必崩
- **运行时校验是 unknown → typed 的桥**：外部数据（网络/存储/反序列化）一律 unknown，schema（zod/io-ts 等）作单一事实源，非法输入必须抛错
- **编译期与运行时的桥**：类型守卫 `a is T` 把运行时判断提升成编译期收窄；品牌类型给底层同型值贴标签防混用
- **JSON 不是类型系统**：Date/Map/Set/undefined 序列化后保不住；跨进程需自带类型信息或对称编解码
- **端到端类型安全**：前后端共享同一份契约（tRPC / OpenAPI / GraphQL codegen），字段错配前移成编译期错误
- **类型发布 = 发 .d.ts**：`tsc --emitDeclarationOnly` 生成声明，消费者 import 类型、运行时零成本

> 答题框架见面试题页；此页只做知识锚点清单。
> 参考：完整版 [总结.md](./总结.md) · 面试题 [面试题.md](./面试题.md)