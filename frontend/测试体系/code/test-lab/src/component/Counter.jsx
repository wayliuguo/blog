import { useState } from 'react'

// 被测组件：最小计数器。故意不用 data-testid，逼着测试按"用户能看见的东西"去查
export function Counter({ initial = 0, onChange }) {
    const [count, setCount] = useState(initial)

    function increment() {
        const next = count + 1
        setCount(next)
        onChange?.(next)
    }

    return (
        <div>
            <p>
                当前计数：<span>{count}</span>
            </p>
            <button onClick={increment}>+1</button>
        </div>
    )
}
