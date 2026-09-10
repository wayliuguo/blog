# TypeScript 工程实践

> 级别：中级→高级

按本书四层推进：

- **入门使用**：见 `01-TypeScript 类型系统`——类型系统、接口、类、函数、泛型与推断；
- **进阶**：本页——tsconfig、.d.ts 声明、类型断言与守卫、类型体操、内置工具类型、Vite/Webpack 集成与 JS→TS 迁移；
- **实战**：本页即 TypeScript 的实战层——tsconfig 落地、类型守卫、类型体操、工具类型与 JS→TS 迁移在真实项目中怎么用；
- **最小实现掌握原理**：到 `code/frontend/05-typescript` 打开 `generic-infer.html` 与 `utility-practice.html`，可视化工具体类型（映射类型/条件类型/infer）的原理。

上一篇文章讲了 TypeScript 的类型系统。本文聚焦**工程落地**：从 tsconfig 关键配置、声明文件 .d.ts、类型断言与守卫、类型体操、内置工具类型，到 vite/webpack 集成与 JS→TS 迁移策略。目标是把 TS 从「会写类型」提升到「能在真实项目里优雅、可控地落地」。

## 一、tsconfig.json 关键配置

tsconfig.json 是 TS 项目的配置文件，决定了编译目标、严格程度、模块解析与路径映射。下面这份注释版配置几乎适用于绝大多数现代前端项目。

```json
{
  "compilerOptions": {
    /* --- 基础目标 --- */
    "target": "ES2020",              // 编译到哪个 ECMAScript 版本（语法）
    "lib": ["ES2020", "DOM", "DOM.Iterable"], // 可用类型库，含 DOM API
    "module": "ESNext",              // 模块系统（源码用 ES Module）
    "moduleResolution": "Bundler",   // 模块解析策略（Vite/打包器推荐）

    /* --- 严格模式 --- */
    "strict": true,                  // 总开关，开启全部严格检查
    "strictNullChecks": true,        // 严格区分 null/undefined（常被分开控制）
    "noImplicitAny": true,           // 禁止隐式 any
    "noUncheckedIndexedAccess": true // 数组/索引访问返回值可能是 undefined

    /* --- 模块与路径 --- */
    "baseUrl": ".",                  // 解析相对路径的基础目录
    "paths": {
      "@/*": ["src/*"]               // 路径别名：@/x 映射到 src/x
    },

    /* --- 输出与产物体 --- */
    "moduleResolution": "Bundler",
    "noEmit": true,                  // 只做类型检查，不输出 JS（交给 vite/esbuild 处理）
    "isolatedModules": true,         // 配合打包器逐文件转译，注意不要依赖全局类型合并

    /* --- 使用建议 --- */
    "esModuleInterop": true,         // 让 import 遵守 ESM 语义，兼容 CJS 依赖
    "resolveJsonModule": true,       // 允许直接 import json 文件
    "forceConsistentCasingInFileNames": true // 避免大小写不一致的导入
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.d.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### 需要重点理解的几个配置

| 配置 | 作用 | 不开启的后果 |
| --- | --- | --- |
| `strictNullChecks` | 区分 `string` 与 `string \| null`，从根本上消灭一部分空指针 | 大量 `undefined`/`null` 错乱 |
| `noImplicitAny` | 参数/变量类型推导不出时直接报错 | 类型系统形同虚设，任一层渗透 `any` |
| `noUncheckedIndexedAccess` | 数组 / `obj[key]` 访问会标记可能为 `undefined` | 越界 / key 缺失导致运行时崩溃 |
| `paths` | 路径别名，配合 Vite 的 resolve.alias 使用 | 需要写相对路径 `../../..`，维护困难 |

> 关键点：`paths` 只影响**编译期类型解析**，要让**运行时**也生效，还需要在 Vite（`resolve.alias`）、Webpack（`resolve.alias`）或 Node（`tsconfig-paths`）中同步配置同一份映射。

## 二、如何把 TS 落地到一个真实项目

落地 TS 不是「全量重写」，而是分层推进：

1. **先选编译/运行方案**：Vite 项目开箱即用 TS（用 esbuild 转译 + tsc 做类型检查）；Webpack 用 `ts-loader` 或 `babel-loader`。
2. **拿到自然的类型推导**：让 TS 自己推断，尽量不写多余注解。
3. **为边界写显式类型**：函数参数、返回类型、API 请求/响应、跨模块数据结构，必须显式声明。
4. **让类型驱动开发**：定义好领域模型（interface/type），编译器帮你兜底所有引用处。

```ts
// 反例：一切全靠推导，边界含糊
function fetchUser(id) {
  return api.get("/user/" + id); // 返回 any，全链路失去类型保护
}

// 正例：边界显式声明，链路上类型安全
interface User {
  id: number;
  name: string;
  email?: string;
}
async function fetchUser(id: number): Promise<User> {
  const resp = await api.get<User>(`/user/${id}`); // 泛型约束响应类型
  return resp.data;
}
```

### 用好 api 封装层

真实项目中，普遍做法是封一层 `request`，用泛型把响应类型带进来：

```ts
// request.ts
export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

// 使用处
const users = await request<User[]>("/users");
users.forEach((u) => u.name.toUpperCase()); // TS 100% 可靠
```

## 三、声明文件 .d.ts

`.d.ts` 是**只含类型、不含实现**的声明文件（Declaration File），作用是把「没有类型信息」的 JS/全局变量/第三方库的运行时形状告诉 TS。

### 全局声明（`declare` 关键字）

把一些挂在 window/全局上的东西声明出来，让所有文件都能认识。

```ts
// global.d.ts
export {}; // 让文件成为模块，再用 declare global

declare global {
  interface Window {
    __APP_VERSION__: string;      // 挂在 window 上的全局变量
    gtag?: (event: string, params: Record<string, unknown>) => void;
  }
  // 不导出的全局命名空间或变量直接在顶层 declare 即可
}
```

```ts
// 全局变量（非模块文件可直接 declare 顶层）
declare const API_BASE: string;
```

### 模块声明

当引入一个没有自带类型说明的 npm 包，或要扩展第三方库时：

```ts
// 声明某个无类型的模块（告诉 TS「这个模块存在，值是 any」）
declare module "some-untyped-lib" {
  export function run(opts: { verbose?: boolean }): void;
  export const version: string;
}
```

```ts
// 给已有第三方库补上缺失的模块（模块增强）
declare module "my-ui" {
  export interface ButtonProps {
    type?: "primary" | "default" | "danger";
    disabled?: boolean;
  }
  const Button: React.FC<ButtonProps>;
  export default Button;
}
```

### 针对具体包写 .d.ts 的简写

快速为无类型包兜底（但不推荐，会丢失类型安全）：

```ts
// shims.d.ts
declare module "*.less";       // 样式文件导入
declare module "*.json";
declare module "my-untyped-pkg";
```

> 优先写精确声明；简写即 `declare module "xxx"` 空模块是兜底，能用正式类型不要在项目里堆 `any` 化声明。

### declare 的三种形态小结

| 形态 | 位置 | 含义 |
| --- | --- | --- |
| `declare const/let/var` | 顶层 | 声明全局变量 |
| `declare function` / `declare class` | 顶层 | 声明全局函数/类 |
| `declare module "..."` | 顶层 | 声明一个模块的类型 |
| `declare global {}` | 模块内 | 向全局命名空间补充声明 |

> 关键点：`declare` 只描述**类型/形状**，生成编译结果时不会有任何 JavaScript 输出。

## 四、类型断言与类型守卫实践

### 类型断言（Type Assertion）

当你比 TS 更清楚某值的真实类型时使用。它是一种「信任声明」，要谨慎用，不要用它掩盖类型漏洞。

```ts
// as 断言
const input = document.getElementById("box") as HTMLInputElement;
input.value = "hi";

// 双重断言（很少用，可能掩盖真实类型）
const n = (value as unknown) as number;

// 使用 `as const` 制造字面量类型
const config = { url: "/api", retry: 2 } as const;
// config.url 固定为 "/api"（字面量类型）
```

### 类型守卫（Type Guard）

在运行时通过条件判断，把类型收窄（narrowing），是最安全、最推荐的手段。

```ts
// typeof 守卫
function print(v: string | number) {
  if (typeof v === "string") console.log(v.toUpperCase());
  else console.log(v.toFixed(2));
}

// instanceof 守卫
class Dog { bark() {} }
class Cat { meow() {} }
function speak(a: Dog | Cat) {
  if (a instanceof Dog) a.bark();
  else a.meow();
}

// in 守卫（对象属性）
function describe(x: { name: string } | { title: string }) {
  if ("name" in x) console.log(`named ${x.name}`);
  else console.log(`titled ${x.title}`);
}
```

### 自定义类型守卫（`x is T`）

当 typeof/instanceof 表达不了复杂的收窄逻辑时，写一个**返回类型谓词**的函数：

```ts
interface Person { speak(): void }
interface Robot { charge(): void }
function isPerson(x: Person | Robot): x is Person {
  return "speak" in x;
}
// 使用后，TS 会把参数窄化为 Person
```

### Discriminated Union（可辨识联合）—— 类型守卫的进阶形态

```ts
type ApiResult =
  | { status: "ok"; data: User }
  | { status: "error"; message: string };

function handle(res: ApiResult) {
  if (res.status === "ok") {
    res.data.id;      // 这里 TS 自动收窄到 { status: "ok"; data: User }
  } else {
    res.message;      // 自动收窄到 error 分支
  }
}
```

> 可辨识联合（用 `status` 等字段区分各分支）是处理复杂状态的**头号推荐**方案，效率与类型安全兼得。

## 五、类型体操技巧

类型体操 = 利用 TS 的类型系统做条件、映射、递归推导。重在掌握范式，不需要背题。

### 三大基础模式

```ts
// 1. 条件类型（三元 + infer 提取）
type ElementType<T> = T extends (infer U)[] ? U : never;
type A = ElementType<string[]>;      // string

// 2. 映射类型（遍历键）
type Getters<T> = {
  [K in keyof T as `get${Capitalize<`${string & K}`>}`]: () => T[K];
};

// 3. keyof + 索引访问
type UserPropName = keyof { id: number; name: string }; // "id" | "name"
```

### 常用工具笔记

```ts
// 提取 Promise 的返回值
type AsyncValue = Awaited<ReturnType<typeof fetchSomething>>;

// 依赖其他类型的键做精确配型（模板字面量联合）
type EventName<Prefix extends string> = `${Prefix}${"click" | "hover" | "keydown"}`;
// "onclick" | "onhover" | "onkeydown"
```

### 递归模板（Tail / Head）

```ts
// 把元组对齐解构，实现对首尾的类型操作
type Last<T extends unknown[]> = T extends [...infer _Rest, infer L] ? L : never;
type L1 = Last<[1, 2, 3]>; // 3
```

> 类型体操的核心是「结合条件 + infer + 映射 + 递归」。平时遇到笨拙的类型，优先想「如何用泛型抽象」，这才是它真正提升代码质量的地方。

## 六、内置工具类型（Utility Types）实战

TS 内置一批常用的工具类型，工程中高频实用：

```ts
// typeof 拿一个值的类型
const userCache = { id: 1, name: "Tom" };
type User = typeof userCache; // { id: number; name: string }

// keyof 拿对象键名
type UserKeys = keyof User; // "id" | "name"

// Partial：全部可选
type PartialUser = Partial<User>;           // { id?; name? }

// Required：全部必填
type RequiredUser = Required<Partial<User>>;

// Pick：挑选若干个键
type UserId = Pick<User, "id">;             // { id: number }

// Omit：剔除若干个键
type SafeUser = Omit<User, "id">;           // { name: string }

// Record：快速建一个「键->值」结构
type ErrorMap = Record<string, string>;

// Readonly：只读
type FrozenUser = Readonly<User>;
```

```ts
// 进阶组合：从 Promise 中提取类型 + 条件分发
type ApiItem = Awaited<ReturnType<typeof getList>> extends Array<infer Item>
  ? Item
  : never;

// 保留完整键却使某些键必填
type WithRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
```

### 应对第三方泛型的常见工具

```ts
type Unboxed<T> = T extends Promise<infer U> ? U : T;          // 拆 Promise
type NonNullable2<T> = T extends null | undefined ? never : T; // 去空
```

| 工具 | 用途 |
| --- | --- |
| `Partial<T>` / `Required<T>` | 全部可选 / 全部必填 |
| `Pick<T,K>` / `Omit<T,K>` | 选键 / 删键 |
| `Record<K,V>` | 对象映射 |
| `ReturnType<F>` | 函数返回类型 |
| `Awaited<T>` / `Promise<T>` | Promise 拆包 / 包 |
| `Readonly<T>` | 只读 |
| `NonNullable<T>` | 去 null/undefined |

## 七、vite / webpack 集成 TS

### Vite（强烈推荐的现代方案）

Vite 用 esbuild 做**快速转译**（不检查类型），类型检查由 `tsc` 单独负责。

```bash
# 创建带 TS 的 Vite 项目
pnpm create vite my-app --template react-ts
# 或
pnpm create vite my-app --template vue-ts
```

在 `package.json` 中把类型检查独立为脚本：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "typecheck": "tsc --noEmit"
  }
}
```

> 关键点：`build` 前先跑 `tsc --noEmit` 做类型检查（保证无类型错误再产出），再用 Vite 真正打包。Vite 默认不跑类型检查，只做转译。

#### Vite + TS 与别名

```ts
// vite.config.ts
import { defineConfig } from "vite";
import path from "node:path";
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),  // 需与 tsconfig paths 一致
    },
  },
});
```

### Webpack（兼容型方案）

Webpack 处理 TS 常用 `ts-loader`（真正把 TS 编译成 JS，同时带类型检查）：

```js
// webpack.config.js
module.exports = {
  entry: "./src/index.ts",
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",          // 或 babel-loader + @babel/preset-typescript（更快但无类型检查）
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
};
```

> 对比：若要「显示类型报错」用 `ts-loader`（会更慢）；若要「构建更快」用 `babel-loader` + 单独 `tsc` 检查。选型思路与 Vite 的「转译 + 单独类型检查」一致。

## 八、JS 迁移到 TS 策略

把现有 JS 项目平滑迁移到 TS，是真实工程里最常见的需求。推荐「渐进式、不一次性推翻」的策略。

### 迁移路线图 Quick Start

```bash
# 1. 先装依赖
pnpm add -D typescript tsconfig-paths

# 2. 生成 tsconfig.json（可先生成严格度较低的）
npx tsc --init
```

### 分阶段迁移

1. **准备阶段**
   - 创建 `tsconfig.json`，把 `allowJs: true`、`checkJs: false`。
   - 把 `.js` 文件改后缀为 `.ts`（或新增 `.ts` 文件，保留 `.js`）。
2. **低风险落地（起步）**
   - `strict`、`noImplicitAny` 先不全部开，先让项目能跑起来。
   - 逐步给**新增代码**写类型。
3. **边界收紧（渐入）**
   - 函数加上参数/返回类型。
   - 对无类型依赖补 `.d.ts`。
   - 逐步打开 `noImplicitAny` → `strictNullChecks` → `strict`。
4. **彻底收口**
   - 用 `any` 较为克制的策略（尽量 `unknown`）。
   - 把 `tsc --noEmit` 纳入 CI。

### 一个常见落地案例

```ts
// 迁移前（JS）
export function createStore(reducer, initialState) {
  // ...
}

// 迁移后（TS，显式声明签名），原有调用点全部由编译器校验
export function createStore<S, A>(
  reducer: (state: S, action: A) => S,
  initialState: S
): { getState: () => S; dispatch: (action: A) => void } {
  // ...
}
```

### 迁移中常用技巧

- 用 `// @ts-nocheck` 给暂时不迁移的文件跳过检查。
- 用 `// @ts-ignore` / `// @ts-expect-error` 在个别行忽略（`expect-error` 更严谨，用错时会报错提示）。
- 依赖没有类型时优先 `npm i -D @types/xxx`，没有类型包的再写 `.d.ts`。
- 用 `unknown` 而不是 `any` 表达「暂不确定」，再用守卫逐步收窄。

## 小结

- `tsconfig.json` 是落地之基：`strict`、`strictNullChecks`、`target/module`、`paths` 都要仔细配；`paths` 需与构建工具 alias 同步。
- 落地 TS 用「分层渐进」：让类型自然推导 + 边界显式声明 + 类型驱动开发。
- `.d.ts` 用 `declare` 描述全局 / 模块形状；`declare global` 用于模块内补充全局。
- 类型断言（`as`）是信任声明，要克制；类型守卫（typeof/instanceof/in/自定义谓词）才是安全的收窄方式。
- 类型体操用「infer + 条件 + 映射 + 递归」范式；用内置工具类型（Partial、Pick、Record、Awaited、ReturnType 等）高效表达领域类型。
- Vite 用 esbuild 转译 + `tsc --noEmit` 检查；Webpack 用 ts-loader/babel 方案。
- JS→TS 迁移要「渐进式」：先 allowJs 跑通 → 逐步收紧严格度 → 排查 any → 纳入 CI，切忌一次性推翻重建。

## 最小实现：用 Demo 验证原理

到 `code/frontend/05-typescript` 启动后打开 `utility-practice.html` 与 `generic-infer.html`：手写 `Partial`/`Exclude`、用 `infer` 提取函数返回类型，正是本文第二、五、六节讲的映射类型、条件类型、内置工具类型在"值层"的可视化。原理一句话：`Partial` 用映射类型把每个键变可选、`Exclude` 用条件分发剔除成员，它们都是**编译期类型运算**，运行时仍是普通 JS，不产生任何额外开销。

## 面试衔接

本节对应 `90-附录-面试体系` 的「TypeScript 进阶」阶段（第七阶段 84-86）：tsconfig 严格度、封装 `request<T>` 统一处理类型、`.d.ts` 与 `declare`、类型守卫/可辨识联合、类型体操范式、内置工具类型、Vite/Webpack 集成与 JS→TS 迁移。做真题自测后，「TypeScript」一章即告完结，进入下一章 `06-工程化与构建`。