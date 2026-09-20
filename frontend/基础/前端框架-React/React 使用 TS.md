# React 使用 TypeScript

React 与 TypeScript 结合使用，可以帮助我们在写组件时获得完整的类型提示与编译期检查。本文围绕写 React 组件时的 TS 实践展开，涵盖函数组件的类型定义、Props 与接口、事件与 ref 的类型、泛型组件、hooks 泛型以及 TSX 的注意事项。

## 组件声明的整体认识

- 组件以 **函数组件**（Functional Component，简称 FC）为基准写法：**输入 props，返回一段 JSX**。
- JSX 中，组件标签的首字母必须**大写**，以和原生 HTML 标签区分。

> 提示：组件之间传递数据不仅仅只有 props，后续还会介绍 Context 等其他形式。函数本身也可以作为属性来传递。

## 函数组件的类型定义

函数组件本质是一个接收 props 的函数。TypeScript 中有两种常见写法：直接给函数参数标注类型，或使用 `FC` 泛型。

### 方式一：直接标注 props 类型

> 示意片段（无配套脚本）

```tsx
interface IProps {
    name: string
}

const FunctionTs = (props: IProps) => {
    const { name } = props
    return <div>{name}</div>
}
```

### 方式二：使用 FC 泛型

> 示意片段（无配套脚本）

```tsx
import { FC } from 'react'

interface IProps {
    name: string
}

const FunctionTs: FC<IProps> = (props) => {
    const { name } = props
    return <div>{name}</div>
}
```

`FC<IProps>` 会自动为函数组件补全 `props`、`children` 等类型，使用体验更好，目前也是社区的主流写法。

## 函数组件的泛型

当 props 的类型需要由**调用方**传入时，可以在组件上定义泛型：

> 示意片段（无配套脚本）

```tsx
function FunctionTs<P>(props: P) {
    return <div>hello world</div>
}

export default FunctionTs
```

调用时传入泛型：

> 示意片段（无配套脚本）

```tsx
type IProps = {
    name: string
}

<FunctionTs<IProps> name='well' />
```

> 注意：在 `.tsx` 文件中，使用 `const FunctionTs = <P extends any>(props: P) => {...}` 的箭头函数泛型写法可能因 JSX 解析歧义而报错（`<P>` 会被误认为 JSX 标签），因此更推荐使用 `function` 声明的写法。

## Props 用 type 还是 interface

两者都能描述 props，真正的差异在**扩展方式**：

- `interface` 支持声明合并与 `extends`，适合要被外部扩展的类型（如组件库对外暴露的 props）。
- `type` 支持联合、交叉、条件类型等类型编程，适合由多个类型组合出来的 props。

业务组件用哪个都能跑通，关键是团队内定一条规则并保持一致。常用约定：描述对象结构用 `interface`，做组合与工具类型用 `type`。

## 事件与 ref 的类型

### 事件对象的类型

React 的事件类型都是泛型，泛型参数填**绑定该事件的标签元素类型**。命名有规律可循（`Change` / `Mouse` / `Keyboard` / `Form` / `Drag` ... + `Event` 或 `EventHandler`），常用这几个：

| 场景 | 事件对象类型 | 处理函数类型 |
| --- | --- | --- |
| 输入框 change | `ChangeEvent<T>` | `ChangeEventHandler<T>` |
| 鼠标点击/移入 | `MouseEvent<T>` | `MouseEventHandler<T>` |
| 键盘按键 | `KeyboardEvent<T>` | `KeyboardEventHandler<T>` |
| 表单提交 | `FormEvent<T>` | `FormEventHandler<T>` |
| 拖拽 | `DragEvent<T>` | `DragEventHandler<T>` |
| 触摸 | `TouchEvent<T>` | `TouchEventHandler<T>` |

示例：

> 摘自 `./code/site/react-types.ts`（运行：`npx tsc --noEmit react-types.ts`）

```tsx
type ChangeEvent<T> = { target: T }
type ChangeEventHandler<T> = (event: ChangeEvent<T>) => void

const handleInput: ChangeEventHandler<HTMLInputElement> = event => {
    const value: string = event.target.value // target 已被限定为 HTMLInputElement，能直接取 .value
    console.log(value)
}
```

这里 `HTMLInputElement` 就是事件绑定的那个 `input` 元素。把 `T` 换成 `HTMLSelectElement`，`event.target` 就变成下拉框类型，取不到的属性会在编译期报错：

> 摘自 `./code/site/react-types.ts`（运行：`npx tsc --noEmit react-types.ts`）

```tsx
// const bad: ChangeEventHandler<HTMLInputElement> = (event) => event.target.selectedIndex
// 编译错误：HTMLInputElement 上没有 selectedIndex（那是 HTMLSelectElement 的属性）
```

### ref 的类型

ref 的类型同样填目标标签元素类型。注意 `current` 可能是 `null`，取用前必须判空：

> 摘自 `./code/site/react-types.ts`（运行：`npx tsc --noEmit react-types.ts`）

```tsx
interface RefObject<T> {
    current: T | null
}
function useRef<T>(initial: T | null): RefObject<T> {
    return { current: initial }
}

const inputRef = useRef<HTMLInputElement>(null) // 泛型 T = HTMLInputElement（lib.dom 标准类型）
if (inputRef.current) {
    inputRef.current.focus() // 必须先判空：current 的类型是 HTMLInputElement | null
}
```

## HTML 标签类型与属性类型

标签元素类型的命名有统一规律：`HTML` + 标签名 + `Element`。常用的几个：

| 标签 | 类型 |
| --- | --- |
| `a` | `HTMLAnchorElement` |
| `button` | `HTMLButtonElement` |
| `div` | `HTMLDivElement` |
| `form` | `HTMLFormElement` |
| `img` | `HTMLImageElement` |
| `input` | `HTMLInputElement` |
| `select` | `HTMLSelectElement` |
| `textarea` | `HTMLTextAreaElement` |

自定义组件要透传原生标签属性时，用对应的属性类型，命名规律相同（`HTML` + 标签名 + `Attributes`）：`HTMLAttributes<T>`（通用）、`ButtonHTMLAttributes<T>`、`InputHTMLAttributes<T>`、`SelectHTMLAttributes<T>`、`TextareaHTMLAttributes<T>`、`SVGAttributes<T>`。

典型写法是把原生属性和自定义 props 交叉起来，让组件既能用自己的 props，又能接收原生属性：

> 示意片段（无配套脚本）

```tsx
type NativeButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>
type MyButtonProps = NativeButtonProps & { variant?: 'primary' | 'ghost' }
```

> 提示：这些类型不必死记，把鼠标悬停在 JSX 属性上，编辑器会直接显示推断出的类型。

## hooks 的泛型

常见的原生 hooks 也都支持泛型，用以声明状态 / ref / 上下文等的类型：

> 示意片段（无配套脚本）

```tsx
const [count, setCount] = useState<number>(0)          // 简单数值
const userRef = useRef<HTMLInputElement>(null)          // ref 指向 DOM 元素
const ctx = useContext<MyCtxType>(MyContext)            // 上下文类型
const store = useReducer<MyReducer, MyState>(reducer, initState) // reducer 泛型
```

通过这些泛型，可以让状态相关的逻辑在类型层面得到保障。

## hooks 封装时的类型处理

自定义 hook 要**同时导出类型**：入参与返回值各定义一个类型，随 hook 一起导出，调用方才能拿到完整约束。

> 摘自 `./code/site/react-types.ts`（运行：`npx tsc --noEmit react-types.ts`）

```tsx
interface UseToggleProps {
    initial?: boolean
}
interface UseToggleResult {
    value: boolean
    toggle: () => void
}

function useToggle(props: UseToggleProps = {}): UseToggleResult {
    const [value, setValue] = useState<boolean>(props.initial ?? false)
    const toggle = (): void => setValue(prev => !prev)
    return { value, toggle }
}

const { value, toggle } = useToggle({ initial: true })
// toggle('yes') // 编译错误：toggle 不接受参数
```

`UseToggleResult` 是这次封装真正的产出：调用方解构出来的 `value` 与 `toggle` 都有确定类型，写错会在编译期报错，而不是等运行时才发现。

## TSX 注意事项

- `.tsx` 是支持 JSX 语法的 TypeScript 文件，TS 与 JSX 同时生效。
- 泛型 `<>` 与 JSX 标签存在解析歧义，因此在 `.tsx` 中定义泛型函数组件时，更推荐使用 `function` 声明，而不是箭头函数。
- 事件对象、ref、DOM 元素的类型要在泛型中明确传入标签元素类型，以获得更精准的类型提示。
- Props 的定义使用 `type` 或 `interface` 均可，选择一种保持一致即可。

## 配套代码

本篇的可运行示例在仓库 `frontend/基础/前端框架-React/code/site/`。

| 文件 | 演示什么 | 对应小节 |
| --- | --- | --- |
| `./code/site/react-types.ts` | 函数组件 props 类型（interface + FC）、泛型组件、hooks 泛型（useState/useRef）、事件对象类型、自定义 hook 的入参与返回值类型 | 函数组件的类型定义 · 函数组件的泛型 · hooks 的泛型 · 事件与 ref 的类型 · hooks 封装时的类型处理 |

启动方式：HTML demo 在 `code` 目录执行 `node server.js`（即 `npm start`）打开 `http://localhost:5180/`；`react-types.ts` 用 `npx tsc --noEmit react-types.ts` 检查类型。

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[React 状态管理](./React%20状态管理.md)
- 下一篇：[React 使用 CSS](./React%20使用%20CSS.md)
