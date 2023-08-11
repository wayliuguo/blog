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
