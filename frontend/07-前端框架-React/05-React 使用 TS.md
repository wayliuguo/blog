# React 使用 TypeScript

> 级别：中级

按本书四层推进：

- **入门使用**：函数/类组件的类型定义、`FC` 泛型、Props 用 `type` 还是 `interface`；
- **进阶**：事件对象 / ref / DOM 标签的内置泛型类型、泛型组件；
- **实战**：用 TS 为 React 组件、hooks 的入参与返回值做完整类型约束；
- **最小实现掌握原理**：到 `code/frontend/07-react` 运行 `mini-runtime.html` 手写渲染器，用 TypeScript 的接口为它标注 `type / props / children`，体会"类型即文档"。（TS 基础语法本身见 `05-TypeScript` 章节。）

React 与 TypeScript 结合使用，可以帮助我们在写组件时获得完整的类型提示与编译期检查。本文围绕写 React 组件时的 TS 实践展开，涵盖函数组件 / 类组件的类型定义、Props 与接口、事件与 ref 的类型、泛型组件、hooks 泛型以及 TSX 的注意事项。

## 组件声明的整体认识

- React 早期以 **类组件** 为主，如今已全面转向 **函数组件**（Functional Component，简称 FC）。
- 无论哪种写法，核心都是：**输入 props，返回一段 JSX**。
- JSX 中，组件标签的首字母必须**大写**，以和原生 HTML 标签区分。

> 提示：组件之间传递数据不仅仅只有 props，后续还会介绍 Context 等其他形式。函数本身也可以作为属性来传递。

## 函数组件的类型定义

函数组件本质是一个接收 props 的函数。TypeScript 中有两种常见写法：直接给函数参数标注类型，或使用 `FC` 泛型。

### 方式一：直接标注 props 类型

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

```tsx
function FunctionTs<P>(props: P) {
    return <div>hello world</div>
}

export default FunctionTs
```

调用时传入泛型：

```tsx
type IProps = {
    name: string
}

<FunctionTs<IProps> name='well' />
```

> 注意：在 `.tsx` 文件中，使用 `const FunctionTs = <P extends any>(props: P) => {...}` 的箭头函数泛型写法可能因 JSX 解析歧义而报错（`<P>` 会被误认为 JSX 标签），因此更推荐使用 `function` 声明的写法。

## 类组件的类型定义

类的定义形式：

```
React.Component<P, S = {}>
React.PureComponent<P, S = {}>
```

其中 `P` 为 props 类型，`S` 为 state 类型。

### 基础写法

```tsx
interface IProps {
    name: string
}
interface IState {
    count: number
}

class ClassTs extends React.PureComponent<IProps, IState> {
    state = {
        count: 0
    }
    render() {
        return <div>{this.props.name}</div>
    }
}
```

使用：

```tsx
<ClassTs name='well' />
```

### 类组件泛型

可以在组件上定义泛型，将其 props 类型指定为传入的泛型，并在调用时传入：

```tsx
interface IState {
    count: number
}

class ClassTs<P> extends React.PureComponent<P, IState> {
    internalProps: P
    constructor(props: P) {
        super(props)
        this.internalProps = props
    }
    state = {
        count: 0
    }
    render() {
        return <div>{this.state.count}</div>
    }
}
```

调用时传入泛型：

```tsx
type IProps = {
    name: string
}

<ClassTs<IProps> name='well' />
```

## Props 与接口：type 还是 interface

`type` 和 `interface` 都能实现类型定义的功能，对于定义一个组件的 props 而言，用哪一个都可以，两者差异不强制区分。随着深入使用，挑选一种自己习惯的方式保持一致即可。

## 事件与 ref 的类型

### 常见事件对象类型

React 为不同事件提供了对应的类型，它们都是泛型，泛型中接收的 Element 元素类型就是我们绑定该事件的**标签元素类型**：

- 剪切板事件对象：`ClipboardEvent<T = Element>`
- 复合事件对象：`CompositionEvent<T = Element>`
- 拖拽事件对象：`DragEvent<T = Element>`
- 焦点事件对象：`FocusEvent<T = Element>`
- 表单事件对象：`FormEvent<T = Element>`
- Change 事件对象：`ChangeEvent<T = Element>`
- 键盘事件对象：`KeyboardEvent<T = Element>`
- 鼠标事件对象：`MouseEvent<T = Element, E = NativeMouseEvent>`
- 触摸事件对象：`TouchEvent<T = Element>`
- 指针事件对象：`PointerEvent<T = Element>`
- 界面事件对象：`UIEvent<T = Element>`
- 滚轮事件对象：`WheelEvent<T = Element>`
- 动画事件对象：`AnimationEvent<T = Element>`
- 过渡事件对象：`TransitionEvent<T = Element>`

示例：

```tsx
const handleEvent = (e: React.DragEvent<HTMLDivElement>) => {
    console.log(e.target)
}
```

这里 `HTMLDivElement` 就是事件绑定的那个 `div` 元素。

### 事件处理函数类型

```ts
type EventHandler<E extends SyntheticEvent<any>> = { bivarianceHack(event: E): void }['bivarianceHack']
type ReactEventHandler<T = Element> = EventHandler<SyntheticEvent<T>>

// 剪切板事件处理函数
type ClipboardEventHandler<T = Element> = EventHandler<ClipboardEvent<T>>
// 复合事件处理函数
type CompositionEventHandler<T = Element> = EventHandler<CompositionEvent<T>>
// 拖拽事件处理函数
type DragEventHandler<T = Element> = EventHandler<DragEvent<T>>
// 焦点事件处理函数
type FocusEventHandler<T = Element> = EventHandler<FocusEvent<T>>
// 表单事件处理函数
type FormEventHandler<T = Element> = EventHandler<FormEvent<T>>
// Change 事件处理函数
type ChangeEventHandler<T = Element> = EventHandler<ChangeEvent<T>>
// 键盘事件处理函数
type KeyboardEventHandler<T = Element> = EventHandler<KeyboardEvent<T>>
// 鼠标事件处理函数
type MouseEventHandler<T = Element> = EventHandler<MouseEvent<T>>
// 触摸事件处理函数
type TouchEventHandler<T = Element> = EventHandler<TouchEvent<T>>
// 指针事件处理函数
type PointerEventHandler<T = Element> = EventHandler<PointerEvent<T>>
// 界面事件处理函数
type UIEventHandler<T = Element> = EventHandler<UIEvent<T>>
// 滚轮事件处理函数
type WheelEventHandler<T = Element> = EventHandler<WheelEvent<T>>
// 动画事件处理函数
type AnimationEventHandler<T = Element> = EventHandler<AnimationEvent<T>>
// 过渡事件处理函数
type TransitionEventHandler<T = Element> = EventHandler<TransitionEvent<T>>
```

使用示例：

```tsx
const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    console.log(e.currentTarget)
}
```

### ref 的类型

ref 对象的类型同样与目标标签元素类型一致，例如：

```tsx
const inputRef = useRef<HTMLInputElement>(null)

<input ref={inputRef} />
// 使用时需要判空
inputRef.current?.focus()
```

## HTML 标签类型与属性类型

### 常见标签元素类型

书写事件的泛型参数时，需要知道对应的标签元素类型，常见的有：

- `a`: `HTMLAnchorElement`
- `body`: `HTMLBodyElement`
- `br`: `HTMLBRElement`
- `button`: `HTMLButtonElement`
- `div`: `HTMLDivElement`
- `h1` / `h2` / `h3`: `HTMLHeadingElement`
- `html`: `HTMLHtmlElement`
- `img`: `HTMLImageElement`
- `input`: `HTMLInputElement`
- `ul`: `HTMLUListElement`
- `li`: `HTMLLIElement`
- `link`: `HTMLLinkElement`
- `p`: `HTMLParagraphElement`
- `span`: `HTMLSpanElement`
- `style`: `HTMLStyleElement`
- `table`: `HTMLTableElement`
- `tbody`: `HTMLTableSectionElement`
- `video`: `HTMLVideoElement`
- `audio`: `HTMLAudioElement`
- `meta`: `HTMLMetaElement`
- `form`: `HTMLFormElement`

### 常见标签属性类型

如果自定义的组件希望透传或继承原生标签的属性，可以使用这些类型：

- HTML 属性类型：`HTMLAttributes<T>`
- 按钮属性类型：`ButtonHTMLAttributes<T>`
- 表单属性类型：`FormHTMLAttributes<T>`
- 图片属性类型：`ImgHTMLAttributes<T>`
- 输入框属性类型：`InputHTMLAttributes<T>`
- 链接属性类型：`LinkHTMLAttributes<T>`
- meta 属性类型：`MetaHTMLAttributes<T>`
- 选择框属性类型：`SelectHTMLAttributes<T>`
- 表格属性类型：`TableHTMLAttributes<T>`
- 输入区属性类型：`TextareaHTMLAttributes<T>`
- 视频属性类型：`VideoHTMLAttributes<T>`
- SVG 属性类型：`SVGAttributes<T>`
- WebView 属性类型：`WebViewHTMLAttributes<T>`

## hooks 的泛型

常见的原生 hooks 也都支持泛型，用以声明状态 / ref / 上下文等的类型：

```tsx
const [count, setCount] = useState<number>(0)          // 简单数值
const userRef = useRef<HTMLInputElement>(null)          // ref 指向 DOM 元素
const ctx = useContext<MyCtxType>(MyContext)            // 上下文类型
const store = useReducer<MyReducer, MyState>(reducer, initState) // reducer 泛型
```

通过这些泛型，可以让状态相关的逻辑在类型层面得到保障。

## hooks 封装时的类型处理

开发自定义 hooks 时，往往需要同时导出 TS 类型，便于调用方约束入参与返回值。例如一个常见的习惯是：自定义 hooks 以 `use` 开头，其参数与返回值分别定义 `inProps` / `outProps` 等类型，从而把逻辑与类型解耦，方便复用与测试。

## TSX 注意事项

- `.tsx` 是支持 JSX 语法的 TypeScript 文件，TS 与 JSX 同时生效。
- 泛型 `<>` 与 JSX 标签存在解析歧义，因此在 `.tsx` 中定义泛型函数组件时，更推荐使用 `function` 声明，而不是箭头函数。
- 事件对象、ref、DOM 元素的类型要在泛型中明确传入标签元素类型，以获得更精准的类型提示。
- Props 的定义使用 `type` 或 `interface` 均可，选择一种保持一致即可。

## 小结

- 函数组件用 `FC<IProps>` 包裹，类组件通过 `Component<P, S>` / `PureComponent<P, S>` 传入泛型。
- 事件对象、事件处理函数、DOM 标签类型在 React 中都有对应的内置泛型类型。
- 泛型组件可以把 props 类型下沉到调用方决定，让组件更通用。
- 自定义 hooks 记得同时导出类型，保证状态逻辑可被类型约束。

## 最小实现：给手写渲染器业务标注类型

到 `code/frontend/07-react` 运行 `mini-runtime.html`，它底层就是一个 `(type, props, children)` 结构。可以用 TS 接口清楚地描述它：

```ts
interface VNode {
  type: string
  props: Record&lt;string, any&gt;
  children: (VNode | string)[]
}
function createElement(type: string, props: object, ...children: (VNode | string)[]): VNode
```

你就能看到"types 只是给普通 JS 数据加上的形状说明"——这正是 TS 的意义。原理一句话：类型注解帮助你写组件时不传错形状，编译期就拦住很多错误。

## 面试衔接

本节对应 `90-附录-面试体系` 的「TypeScript」板块（也结合「React」板块）：函数组件与类组件类型定义、事件/ref 泛型、泛型组件、`type` vs `interface`。做真题自测后，进入下一节 `06-React 使用 CSS`。