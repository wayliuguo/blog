# React Hooks

React Hooks 是一套让函数组件更强大、更灵活的“钩子”，它能把某个目标结果钩到可能会变化的数据源或事件源上，当被钩到的数据或事件发生变化时，产生目标结果的代码就会重新执行，从而得到更新后的结果。

> 级别：初级→中级

按本书四层推进：

- **入门使用**：`useState`（维护状态、不可变数据）、`useEffect`（副作用）、`useRef`、`useMemo`、`useCallback`；
- **进阶**：自定义 Hook 抽离逻辑、第三方 Hooks 库（ahooks、react-use）、Hooks 三条规则与闭包陷阱；
- **实战**：用自定义 Hook 封装"窗口尺寸 / 标题 / 异步信息"等可复用逻辑；
- **最小实现掌握原理**：到 `code/frontend/07-react` 运行 `hooks-demo.html`，用普通数组手写极简 useState / useEffect，看清"按调用顺序存取状态"的本因。

## Hooks 是什么与特点

Hooks 的出现解决了函数组件原本无法管理内部状态、无法执行副作用的问题，它的核心特点有两个：

- **简化逻辑复用**：把公共逻辑抽离成自定义 Hook，一套代码可在多个组件间复用，不必再像 Class 组件那样借助高阶组件等模式。
- **关注分离**：按功能而不是生命周期来组织代码，逻辑更内聚、更易维护。

使用 Hook 时需要配置 ESLint 来约束规范，安装插件 `eslint-plugin-react-hooks`：

```bash
npm install eslint-plugin-react-hooks --save-dev
```

配置规则：

```json
{
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

## 逻辑复用：Class 高阶组件 vs Hooks 自定义

设想这样一个场景：多个组件都需要监听浏览器窗口 resize，再根据宽度变化调整布局。用两种方式对比实现。

### Class 高阶组件（HOC）

定义一个高阶组件，负责监听窗口变化，并把 `size` 作为 props 传给被包裹的组件。

```tsx
// WithWindowSize.tsx
import React from 'react'

interface stateType {
    size: string
}
const WithWindowSize = (Component: any) => {
    class WrappedComponent extends React.PureComponent<any, stateType> {
        constructor(props: any) {
            super(props)
            this.state = {
                size: this.getSize()
            }
        }
        componentDidMount(): void {
            // 监听浏览器窗口大小
            window.addEventListener('resize', this.handleResize)
        }
        componentWillUnmount(): void {
            // 移除监听
            window.removeEventListener('resize', this.handleResize)
        }
        getSize() {
            return window.innerWidth > 1000 ? 'large' : 'small'
        }
        handleResize = () => {
            this.setState({
                size: this.getSize()
            })
        }
        render() {
            return <Component size={this.state.size}></Component>
        }
    }
    return WrappedComponent
}

export default WithWindowSize
```

```tsx
// MyComponent.tsx
import React from 'react'
import WithWindowSize from './WithWindowSize'

interface propsTypes {
    size: string
}

class MyComponent extends React.Component<propsTypes> {
    render() {
        const { size } = this.props
        return <div>{size}</div>
    }
}

export default WithWindowSize(MyComponent)
```

### Hooks 自定义 Hook

用 `useState` + `useEffect` 封装成一个自定义 Hook，直接在函数组件里调用，代码更简洁直观。

```tsx
import { useEffect, useState } from 'react'

const getSize = () => {
    return window.innerWidth > 1000 ? 'large' : 'small'
}

const useWindowSize = () => {
    const [size, setSize] = useState(getSize())
    useEffect(() => {
        const handler = () => {
            setSize(getSize())
        }
        window.addEventListener('resize', handler)
        return () => {
            window.removeEventListener('resize', handler)
        }
    }, [])
    return size
}

const Demo = () => {
    const size = useWindowSize()
    return <div>{size}</div>
}

export default Demo
```

对比可见：HOC 存在“组件嵌套地狱”、props 透传、命名冲突等问题，而自定义 Hook 直接回到组件内部使用，复用逻辑的同时保持了组件树结构的扁平。

## useState：维护状态

`state` 可以理解为"组件的记忆"（component's memory）：`props` 是父组件传过来的信息，而 `state` 是组件自己内部、不对外暴露的状态。每次 `state` 变化，都会触发组件更新、重新渲染页面。

```tsx
const [state, setState] = useState(0)
```

- **参数**：初始化值，可以是任意类型，默认 `undefined`。
- **返回值**：一个数组，包含两个元素，通常通过数组解构赋值来获取（当前值 + 更新函数）。

### 两种更新方式与异步更新

更新 `state` 有两种方式，推荐使用函数式形式：

```tsx
setCount(count + 1)          // 直接传入新值
setCount(count => count + 1) // 传入函数，接收旧值返回新值
```

`setState` 是**异步**更新，日志里打印的不一定是页面上的最新值：

```tsx
setCount(count => count + 1)
console.log(count) // 页面是 1，这里的日志可能仍是 0
```

传入函数的形式支持同步更新，且对多次连续更新更可靠，简单数据直接传值时更新还**可能被合并**。

> 补充：如果 update 的结果不用于页面渲染，就**不要**用 useState，改用 useRef，避免无谓的重新渲染。

### 不可变数据（核心）

`state` 可以是任意 JS 类型，而不只是值类型。**不可直接修改 state，而要 setState 一个"新"的值**。其更新机制是对 `state` 做**浅对比**：只要**引用地址没有变**，就不会触发重新渲染。函数组件中，每个更新函数从新执行后 `state` 是"被重置"而不是"被修改"，可以理解为只读。

修改对象类型的 state 必须用扩展运算符创建新对象（改变引用地址）而非直接改属性：

```tsx
const [userInfo, setUserInfo] = useState({ name: 'well', age: 18 })
const changeAge = () => {
  setUserInfo({
      ...userInfo,
      age: ++userInfo.age
  })
}
```

### 使用 immer 简化不可变数据

由于每次都要手动创建新引用，容易出错且繁琐。`immer` 可以通过 `produce` 代理 draft，直接以"可变"的写法生成不可变的新数据：

```bash
npm i immer
```

```tsx
let age = userInfo.age
setUserInfo(
    produce(draft => {
        draft.age = age + 1
    })
)
```

## useEffect：执行副作用

函数组件的本质是"执行函数，返回 JSX"。但在初次渲染后需要做某些事、某个 state 变化后需要做某些事（如 ajax 加载数据、操作 DOM、绑定事件）时，仅有"执行函数返回 JSX"就不够了，这时就需要 `useEffect` 来处理这些"渲染之外"的副作用。

```tsx
useEffect(callBack, [])
```

- `callBack`：回调函数。
- `[]`：依赖数组，只有数组中值发生变化时才会重新执行回调。
- 组件销毁时会执行回调中 `return` 返回的方法，常用于清理操作、防止内存泄漏。

目前 `useEffect` 相当于 `componentDidMount`、`componentDidUpdate`、`componentWillUnmount` 三个生命周期的综合：其回调会在组件**挂载、更新、卸载**时执行。

> 注意：从 React 18 开始，`useEffect` 在**开发环境下**会执行两次（销毁一次），用于模拟组件创建、销毁再创建的完整流程，及早暴露问题（如弹窗重复、bindEvent 重复）。生产环境下不会执行两次。

### 依赖项为空数组：仅挂载时执行一次

初次渲染执行一次，销毁时执行 return 的清理函数：

```tsx
useEffect(() => {
    console.log('count值发生了变化')
    return () => {
        console.log('销毁')
    }
}, [])
```

### 有依赖项：挂载 + 依赖更新时执行

初次渲染执行一次，依赖项 `count` 更新时再执行一次，销毁只执行 return 的函数：

```tsx
useEffect(() => {
    console.log('count值发生了变化')
    return () => {
        console.log('销毁')
    }
}, [count])
```

### 没有依赖项：每次渲染后都执行

`useEffect` 不传第二个参数（或传 `undefined`），每次 render 之后都会执行一次：

```tsx
useEffect(() => {
    console.log('count值发生了变化')
    return () => {
        console.log('销毁')
    }
})
```

### 组件销毁时清理

有创建就有销毁。**如果有定时任务或 DOM 事件，组件销毁时一定要解绑**，例如在上面的监听 window resize、mousemove 示例中，都要在 return 的清理函数里 `removeEventListener`。

## useRef：绑定 DOM 与共享数据

在函数组件中，`useRef` 用于提供一个组件多次渲染之间**共享数据**的能力。

- 返回一个可变的 ref 对象，其 `.current` 属性被初始化为传入的参数。
- **其值的更改不会触发组件重新渲染**，这正是区别于 `useState` 的地方。

### 绑定 DOM

```tsx
const inputRef = useRef<HTMLInputElement>(null)
const selectInput = () => {
    const inputElem = inputRef.current
    if (inputElem) inputElem.select()
}

<div>
    <input type="text" ref={inputRef} defaultValue="hello world" />
    <button onClick={selectInput}>选中input</button>
</div>
```

### 保存数据（页面不更新）

ref 值变化不会触发 rerender，因此只适合保存不需要驱动 UI 的共享数据：

```tsx
const nameRef = useRef('well')
const changeName = () => {
    nameRef.current = 'wayliuguo'
    console.log(nameRef.current)
}
<div>
    <p>name:{nameRef.current}</p>
    <button onClick={changeName}>change name</button>
</div>
```

## useMemo：缓存结果

函数组件每次更新都会重新执行函数（默认每个 state 变化都会重新执行）。`useMemo` 可以缓存某个数据，不用每次都重新生成，适合计算量较大的场景，用于性能优化：

```tsx
useMemo(callBack, [])
```

只有依赖项的值变更时才会重新执行：

```tsx
const [num1, setNum1] = useState(10)
const [num2, setNum2] = useState(20)
const sum = useMemo(() => {
    console.log('useMemo的依赖项变更了')
    return num1 + num2
}, [num1, num2])
```

> 注意官方文档的这句话："你可以把 useMemo 作为性能优化的手段，但不要把它当成语义上的保证。" useMemo 的执行控制权在 React，不一定保证每个都会缓存，一切都是为了全局性能最佳。

## useCallback：缓存回调函数

`useCallback` 是 `useMemo` 的语法糖，用于缓存函数——只有当依赖的值变化后才会生成新的函数，避免子组件因父组件每次渲染传入新的函数引用而无效重渲染：

```tsx
const set = new Set()
const callback = useCallback(() => {
    console.log(count)
}, [count])
set.add(callback)
```

`set.size` 只有在 `count` 变化时才会增加，说明函数引用被稳定缓存。

## 自定义 Hook：抽离复用逻辑

自定义 Hook 可以抽离公共逻辑，复用到多个组件中——**这是 Hooks 设计的初衷**。开发时通常遵循"三步走"：先在组件内直接写，再抽成函数，最后抽到独立文件（`src/hooks/useXxx.ts`）复用。

### useTitle：修改网页标题

```tsx
import { useEffect } from 'react'

const useTitle = (title: string) => {
    useEffect(() => {
        document.title = title
    }, [])
}

export default useTitle
```

### useMouse：获取鼠标位置

```tsx
import { useEffect, useState } from 'react'

const useMouse = () => {
    const [x, setX] = useState<number>(0)
    const [y, setY] = useState<number>(0)

    const mouseMoveHandler = (event: MouseEvent) => {
        setX(event.clientX)
        setY(event.clientY)
    }

    useEffect(() => {
        // 监听鼠标事件
        window.addEventListener('mousemove', mouseMoveHandler)

        // 组件销毁时，解绑 DOM 事件（否则可能出现内存泄漏问题）
        return () => {
            window.removeEventListener('mousemove', mouseMoveHandler)
        }
    }, [])

    return { x, y }
}

export default useMouse
```

这个 Hook 有返回值（`{ x, y }`），可以直接在 App 中使用。

### useGetInfo：异步获取信息

传入依赖值，当依赖的值变更后再次请求数据：

```tsx
import { useEffect, useState } from 'react'

const getInfo = (): Promise<string> => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(Date.now().toString())
        }, 1500)
    })
}

const useGetInfo = (count: number) => {
    const [loading, setLoading] = useState(true)
    const [info, setInfo] = useState('')

    useEffect(() => {
        getInfo().then(info => {
            setLoading(false)
            setInfo(info)
        })
    }, [count])

    return { loading, info }
}

export default useGetInfo
```

组件中使用：

```tsx
const { loading, info } = useGetInfo(count)
<p>{loading ? '加载中...' : info}</p>
```

## 第三方 Hooks

自定义 Hook 发展到一定程度，可以抽离为单独的模块发布到 npm，供所有开发者使用。例如前面实现的 `useTitle`、`useMouse`，在成熟的 Hooks 库里早已有现成的实现。

### ahooks

国内流行的第三方 Hooks 库：https://ahooks.js.org/zh-CN/

- 功能全面
- 使用简单
- 文档 demo 清晰易懂

例如：https://ahooks.js.org/zh-CN/hooks/use-title 和 https://ahooks.js.org/zh-CN/hooks/use-mouse

### react-use

国外比较流行的 Hooks 库（英文文档）：https://github.com/streamich/react-use

功能也很全面，先做了解即可。

## 使用 Hooks 的三条规则

- **命名规则**：Hook 必须使用 `useXxx` 格式命名（这种命名也很易读，简单粗暴）。
- **调用位置**：Hook 只能在两个地方调用——**组件内部**和**其他 Hook 内部**。组件外部或一个普通函数中，不能调用 Hook。
- **顺序一致**：hook 在每次渲染时都必须按照**相同的顺序**被调用。
  - Hook 必须是组件"第一层代码"。
  - Hook 不能放在 `if` 等条件语句中（前面有 `return` 也算是条件）。
  - Hook 不能放在 `for` 等循环语句中。

## 闭包陷阱与 useRef 解法

当**异步函数**中获取 state 时，可能拿到的不是最新的 state 值，这就叫"闭包陷阱"。下面的例子中，点击 `alertFn` 到定时器触发 `alert` 的这段时间里多次点击 `add`，因为闭包捕获了旧的 `count`，`alert` 显示的仍是旧值：

```tsx
import { FC, useState } from 'react'

const ClosureTrap: FC = () => {
    const [count, setCount] = useState(0)

    const add = () => {
        setCount(count + 1)
    }
    const alertFn = () => {
        setTimeout(() => {
            alert(count)
        }, 3000)
    }
    return (
        <>
            <p>闭包陷阱</p>
            <div>
                <p>{count}</p>
                <button onClick={add}> add</button>
                <button onClick={alertFn}> alertFn</button>
            </div>
        </>
    )
}

export default ClosureTrap
```

**解法**：使用 `useRef`，因为 `useState` 是**值类型**（每次渲染快照独立），而 `useRef` 是**引用类型**（跨渲染共享同一对象）。用一个 ref 同步最新的 count：

```tsx
// 添加 useRef 依赖 count
const countRef = useRef(0)
useEffect(() => {
    countRef.current = count
}, [count])

const alertFn = () => {
    setTimeout(() => {
        alert(countRef.current)
    }, 3000)
}
```

> 注意：**ref 变化不会触发 rerender**，所以需要结合 state 一起使用——用 `useState` 保存驱动 UI 的值，用 `useRef` 保存给异步闭包读取的最新值。

## 小结

- Hooks 让函数组件具备管理状态（`useState`）、执行副作用（`useEffect`）的能力，核心是**不可变数据**。
- 用 `useRef` 绑定 DOM 或保存不触发渲染的共享数据，也是解决闭包陷阱的常用手段。
- 用 `useMemo` / `useCallback` 缓存数据与函数以优化性能（但别依赖其语义保证）。
- 自定义 Hook 是对公共逻辑的复用，也是向第三方 Hooks 库（ahooks、react-use）演进的基础。
- 使用 Hooks 必须遵循命名、调用位置、调用顺序三条规则。

## 最小实现：为什么 Hooks 必须"按顺序调用"

到 `code/frontend/07-react` 运行 `hooks-demo.html`：用普通数组在 `useState` / `useEffect` 中按下标存取状态，每次渲染都从第一个 hook 重新数起——只要顺序一乱，取到的就会是"另一个 hook 的值"。你会直观看到"必须放在顶层、不能放 if/循环里"这句话到底在说什么。原理一句话：hooks 状态是存在链表/数组里、靠调用顺序来定位的，所以顺序必须稳定。

## 面试衔接

本节对应 `90-附录-面试体系` 的「React Hooks」板块：useEffect 依赖数组、useState 不可变更新、闭包陷阱与 useRef 解法、Hooks 三条规则、useMemo vs useCallback。做真题自测后，进入下一节 `03-React 路由`。