## React Hooks 是什么？
- 一套能够使函数组件更加强大、更加灵活的“钩子”
- 把某个目标结果钩到可能会变化的数据源或者事件源上，那么当被钩到的数据或事件发生变化时，产生这个目标结果的代码就会重新执行，产生更新后的结果
- 使用规范
  - 安装插件 eslint-plugin-react-hooks
  ```
  npm install eslint-plugin-react-hooks --save-dev
  ```
  - 配置hooks规则
  ```
  "rules": {
    "react-hooks/rules-of-hooks": "error", // 检查 hooks 规则
    "react-hooks/exhaustive-deps": "warn"
  }
  ```
- 特点
  - 简化逻辑复用
  - 关注分离

下面是一个例子用于说明简化逻辑复用：
我们有多个组件，当用户调整浏览器窗口的大小，需要重新调整页面布局，根据size渲染不同组件。
如果用类组件实现，需要定义一个高阶组件，负责监听窗口的变化，并将变化后的值作为props传给下一个组件

## Class 组件逻辑复用

**WithWindowSize.tsx**
入参是一个组件`Component`，其成一个组件获取`size`的变化，`render`时传递给`Component`实现传递
```
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

**MyComponent.tsx**
调用`WithWindowSize`组件产生一个新组件，自带`size`属性
```
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

## hooks 逻辑复用
```
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

## useState 维护状态
```
const [state, setState] = useState(0)
```
- 参数：初始化值，可以是任意类型，默认undefined
- 返回值：数组，包含两个元素（通常通过数组解构赋值来获取）
- 特点
  - 两种更新方式，推荐使用函数形式
  ```
  setCount(count + 1)
  setCount(count => count+1)
  ```
  - 异步更新，日志打印不是最新的state值（页面上的值才是最新的）
  ```
  setCount(count => count + 1)
  // 日志打印不是最新的值,页面如果是1，日志则为0
  console.log(count)
  ```
  - useState 使用更新函数会触发页面重新渲染，如果值不用于页面渲染，不要使用 useState， 使用 useRef
  - 简单数据不使用函数形式可能会被合并
  - 不可变数据（重要），其更新机制是对`state`只进行浅对比，只要**引用地址**没有变就不会重新渲染
  ```
  const [userInfo, setUserInfo] = useState({ name: 'well', age: 18 })
  const changeAge = () => {
    setUserInfo({
        ...userInfo,
        age: ++userInfo.age
    })
  }
  ```
  - 可以使用immer解决不可变数据需要改变引用地址
  ```
  npm i immer

  let age = userInfo.age
  setUserInfo(
      produce(draft => {
          draft.age = age + 1
      })
  )
  ```

## useEffect：执行副作用
- 函数式组件通过`useState`具备操控`state`的能力，修改`state`需要在适当的场景
- 目前`useEffect`相当于`componentDidMount、componentDidUpdate、componentWillUnmount`三个周期综合，即其回调函数会在组件**挂载、更新、卸载**时执行
- React18开始，useEffect 在开发环境下会执行两次，用于模拟组件创建、销毁再创建的完整流程，及早暴露问题
- 使用形式
  ```
    useEffect(callBack, [])
  ```
  - callBack: 回调函数
  - []: 依赖数组，只有渲染时数组中值发生了变化才会执行回调函数
  - 销毁会执行返回的方法，一边用于清理操作，防止内存泄漏
- 使用示例-有依赖项
  - 初次渲染执行一次
  - 依赖项更新执行一次
  - 销毁只执行return回去的函数
```
useEffect(() => {
    console.log('count值发生了变化')
    return () => {
        console.log('销毁')
    }
}, [count])
```
- 使用示例-没有依赖项
  - 每次render之后都会执行一次
```
useEffect(() => {
    console.log('count值发生了变化')
    return () => {
        console.log('销毁')
    }
})
```
- 使用示例-依赖项为空
  - 首次执行时触发

```
useEffect(() => {
    console.log('count值发生了变化')
    return () => {
        console.log('销毁')
    }
}, [])
```

## useRef: 共享数据
- 在函数组件中，需要用`useRef`提供一个组件多次渲染之间共享数据的功能
- 其返回一个可变的ref对象，其`.current`属性被初始化为传入的参数
- 其值的更改不会触发组件的重新渲染，这是区别于`useState`的地方
- 使用形式
  - 绑定 DOM
  - 保存数据
- 绑定 DOM
```
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
- 保存数据(页面没有更新，ref值变化了)
```
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

## useMemo: 缓存结果
- 函数组件，每次更新都会重新执行函数
- `useMemo` 可以缓存数据，不用每次执行函数都重新生成
- 可用于计算量较大的场景，缓存提高性能
- 使用示例
  - 只有依赖项的值变更了才会重新执行
```
useMemo(callBack, [])
```
```
const [num1, setNum1] = useState(10)
const [num2, setNum2] = useState(20)
const sum = useMemo(() => {
    console.log('useMemo的依赖项变更了')
    return num1 + num2
}, [num1, num2])
```

## useCallback: 缓存回调函数
- 当依赖的值变化后，才会生成新的函数
```
const set = new Set()
...
const callback = useCallback(() => {
    console.log(count)
}, [count])
set.add(callback)
...
div>Set.size{set.size}</div>
```

## 自定义 hook —— useTitle

```
import { useEffect } from 'react'

const useTitle = (title: string) => {
    useEffect(() => {
        document.title = title
    }, [])
}

export default useTitle
```

## 自定义 hook —— useMouse
```
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

        // 组件销毁时，解绑DOM事件（否则可能出现内存泄漏问题）
        return () => {
            window.removeEventListener('mousemove', mouseMoveHandler)
        }
    }, [])

    return { x, y }
}

export default useMouse
```

## 自定义hook —— useGetInfo
- 传入了依赖的值，当依赖的值变更后再次请求数据
```
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

...

const { loading, info } = useGetInfo(count)
<p>{loading ? '加载中...' : info}</p>
```

## 三条使用规则
- 必须使用 useXxx 格式命名
- 只能在两个地方调用 Hook（组件内，其他 Hook 内）
- 必须保证每次的调用顺序一致（不能放在 if for 内部）

## 闭包陷阱
- 在点击一下`alertFn`到`alert`触发过程中多次点击`add`，由于`闭包陷阱`会导致`alert`显示的是旧值
- 可以使用`useRef`解决，原因是`useState`是值类型，`useRef`是引用类型
```
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
- 使用 useRef 解决闭包陷阱
```
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