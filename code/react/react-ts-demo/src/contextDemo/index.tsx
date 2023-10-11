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
