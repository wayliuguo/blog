import React, { useState } from 'react'
import { FC } from 'react'
import { produce } from 'immer'

const Count: FC = () => {
    interface UserInfo {
        name: string
        age: number
    }

    const [count, setCount] = useState<number>(0)
    const [userInfo, setUserInfo] = useState<UserInfo>({ name: 'well', age: 18 })

    const addCount = () => {
        // 非函数更新形式会被合并
        // setCount(count + 1)
        // setCount(count + 1)
        // setCount(count + 1)
        setCount(count => count + 1)
        setCount(count => count + 1)
        // 日志打印不是最新的值
        console.log(count)
    }

    const changeAge = () => {
        /* setUserInfo({
            ...userInfo,
            age: ++userInfo.age
        }) */
        let age = userInfo.age
        setUserInfo(
            produce(draft => {
                draft.age = age + 1
            })
        )
    }
    return (
        <>
            <div>
                <button onClick={addCount}>add {count}</button>
                <div>{JSON.stringify(userInfo)}</div>
                <button onClick={changeAge}>change age</button>
            </div>
        </>
    )
}

export default Count
