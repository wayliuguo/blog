## 组件声明

## 类组件声明
- 定义形式
  ```
  React.Component<P, S={}>
  React.PureComponent<P, S={}>
  ```
- 例子
  ```
  // 类型定义
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

  ...
  <ClassTs name='well' />
  ```
## 类组件泛型
- 在组件上定义泛型，指定其props的类型为传入泛型
- 调用时传入泛型
```
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

...

type IProps = {
    name: string
}
<ClassTs<IProps> name='well' />
```

## 函数组件
```
interface IProps {
    name: string
}
const FunctionTs = (props: IProps) => {
    const { name} = props
    return <div>{name}</div>
}
```
```
import { FC } from "react"

interface IProps {
    name: string
}
const FunctionTs: FC<IProps> = (props) => {
    const { name} = props
    return <div>{name}</div>
}
```

## 函数组件泛型
```
// const FunctionTs = <P extends any>(props: P) => {
//     return <div>hello world</div>
// }
function FunctionTs<P>(props: P) {
    return <div>hello world</div>
}
export default FunctionTs

...

type IProps = {
    name: string
}
<FunctionTs<IProps> name='well' />
```

## 事件处理
## Event 事件处理
- 剪切板事件对象：ClipboardEvent`<T = Element>`
- 拖拽事件对象：DragEvent`<T = Element>`
- 焦点事件对象：FocusEvent`<T = Element>`
- 表单事件对象：FormEvent`<T = Element>`
- Change事件对象：ChangeEvent`<T = Element>`
- 键盘事件对象：KeyboardEvent`<T = Element>`
- 鼠标事件对象：MouseEvent`<T = Element>, E = NativeMouseEvent`
- 触摸事件对象：TouchEvent`<T = Element>`
- 滚轮事件对象：WheelEvent`<T = Element>`
- 动画事件对象：AnimateionEvent`<T = Element>`
- 过度事件对象：TransitionEvent`<T = Element>`
这些Event事件对象的泛型中都会接收一个Element元素的类型，这个类型就是我们绑定这个事件的**标签元素类型**。
```
const handleEvent = (e:React.DragEvent<HTMLDivElement>) => {
    console.log(e.target)
}
```
## 事件处理函数类型
```
type EventHandler<E extends SyntheticEvent<any>> - { bivarianceHack(event: E): void }["bivarianceHack"];
type ReactEventHandler<T = Element> = EventHandler<SyntheticEvent<T>>;
//剪切板事件处理函数
type clipboardEventHandler<T = Element> = EventHandler<ClipboardEvent<T>>;
//复合事件处理函数
type CompositionEventHandler<T = Element> = EventHandler<CompositionEvent<T>>;
//拖拽事件处理函数
type DragEventHandler<T = Element> = EventHandler<DragEvent<T>>;
//焦点事件处理函数
type FocusEventHandler<T = Element> = EventHandler<FocusEvent<T>>;
//表单事件处理函数
type FormEventHandler<T - Element> = EventHandler<FormEvent<T>>;
//Change事件处理函数
type ChangeEventHandler<T = Element> = EventHandler<ChangeEvent<T>>;
//键盘事件处理函数
type KeyboardEventHandler<T = Element> = EventHandler<KeyboardEvent<T>>;
//鼠标事件处理函数
type MouseEventHandler<T = Element> = EventHandler<MouseEvent<T>>;
//触屏事件处理函娄数
type TouchEventHandler<T = Element> = EventHandler<TouchEvent<T>>;
//指针事件处理函数
type PointerEventHandler<T = Element> = EventHandler<PointerEvent<T>>;
//界面事件处理函数
type UIEventHandler<T = Element> = EventHandler<UIEvent<T>>;
//滚轮事件处理函数
type wheelEventHandler<T = Element> = EventHandler<lheelEvent<T>>;
//动画事件处理函数
type AnimationEventHandler<T = Element> = EventHandler<AnimationEvent<T>>;
//过渡事件处理函数
type TransitionEventHandler<T = Element> = EventHandler<TransitionEvent<T>>;
```
```
const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    console.log(e.currentTarget)
}
```

## HTML 标签类型
## 常见标签类型
```
a: HTMLAnchorElement;
body : HTMLBodyElement;
br: HTMLBRElement;
button: HTMLButtonElement;
div : HTMLDivElement;
h1: HTMLHeadingElement;
h2: HTMLHeadingElement;
h3: HTMLHeadingElement;
html: HTMLHtmlElement;
img : HTMLImageElement;
input : HTMLInputElement;
ul: HTMLUListElement;
li: HTMLLIElement;
link: HTMLLinkElement;
p: HTMLParagraphElement;
span: HTMLSpanElement;
style: HTMLStyleElement;
table: HTMLTableElement;
tbody : HTMLTablesectionElement;
video: HTMLVideoElement;
audio: HTMLAudioElement;
meta: HTMLMetaElement;
form: HTALFormElement;
```

## 标签属性类型
```
HTML属性类型:HTMLAttributes<T>
按钮属性类型:ButtonHTMLAttributes<T>
表单属性类型: FormHTMLAttributes<T>
图片属性类型:lmgHTMLAttributes<T>
输入框属性类型: InputHTMLAttributes<T>
链接属性类型:LinkHTMLAttributes<T>
meta属性类型:MetaHTMLAttributes<T>
选择框属性类型:SelectHTMLAttributes<T>
表格属性类型:TableHTMLAttributes<T>
输入区属性类型:TextareaHTMLAttributes<T>
视频属性类型:VideoHTMLAttributes<T>
SVG星性类型: SVGAttributes<T>
WebView属性类型: WebViewHTMLAttributes<T>
```