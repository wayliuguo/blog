## Context
- 可跨层级传递，而不像 props 层层传递
- 类似于 Vue 的 provide/inject
- 例如：切换主题，切换语言

### createContext 与注入

```
// contextDemo/index.tsx
import { FC, createContext, useState } from 'react'
import Toolbar from './Toolbar'

const themes = {
    light: {
        fore: '#000',
        background: '#eee'
    },
    dark: {
        fore: '#fff',
        background: '#222'
    }
}

// 通过 createContext 来创建 context
export const ThemeContext = createContext(themes.light)

const ContextDemo: FC = () => {
    const [theme, setTheme] = useState(themes.light)
    const toDark = () => {
        setTheme(themes.dark)
    }
    return (
        // 在组件上方使用 Context.Provider 指定context 的值
        <ThemeContext.Provider value={theme}>
            <div>
                <div>
                    <span>Context Demo</span>
                    <button onClick={toDark}>dark</button>
                </div>
            </div>
            <Toolbar />
        </ThemeContext.Provider>
    )
}

export default ContextDemo

```

- 通过 createContext 来创建 context
- 在组件上方使用 Context.Provider 指定context 的值
- 提供了一个`toDark`方法用于改变注入的context的值
- 在`Context.Provider`包裹下调用Toolbar 组件

### 跨层级

```
// contextDemo/Toolbar.tsx
import { FC } from 'react'
import ThemeButton from './ThemeButton'

const Toolbar: FC = () => {
    return (
        <>
            <button>Toolbar</button>
            <div>
                <ThemeButton />
            </div>
        </>
    )
}

export default Toolbar
```

### useContext 获取值

```
// contextDemo/ThemeButton.tsx

import { FC, useContext } from 'react'
import { ThemeContext } from './index'

const ThemeButton: FC = () => {
    // 通过 useContext 获取 context 提供的值
    const theme = useContext(ThemeContext)
    // 根据 theme 设置 button 样式
    
    const style = {
        color: theme.fore,
        background: theme.background
    }
    return (
        <>
            <button style={style}>theme button</button>
        </>
    )
}

export default ThemeButton
```

- 通过 useContext 获取提供的 context 的值

