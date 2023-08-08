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
