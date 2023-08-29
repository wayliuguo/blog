import { FC, useEffect, useRef, useState } from 'react'

const ClosureTrap: FC = () => {
    const [count, setCount] = useState(0)

    // 添加 useRef 依赖 count
    const countRef = useRef(0)
    useEffect(() => {
        countRef.current = count
    }, [count])

    const add = () => {
        setCount(count + 1)
    }
    const alertFn = () => {
        setTimeout(() => {
            // alert(count)
            alert(countRef.current)
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
