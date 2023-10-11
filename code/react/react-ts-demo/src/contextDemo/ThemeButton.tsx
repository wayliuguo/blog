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
