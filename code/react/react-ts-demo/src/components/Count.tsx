import React, { useState } from 'react'
import { FC } from 'react'

const Count: FC = () => {
    const [count, setCount] = useState<number>(0)

    const addCount = () => {
        setCount(count + 1)
    }
    return (
        <>
            <div>
                <button onClick={addCount}>add {count}</button>
            </div>
        </>
    )
}

export default Count
