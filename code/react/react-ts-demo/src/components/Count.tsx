import React, { useEffect, useRef, useState } from 'react'
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

    useEffect(() => {
        console.log('count值发生了变化')
        return () => {
            console.log('销毁')
        }
    }, [])

    // useRef 绑定DOM
    const inputRef = useRef<HTMLInputElement>(null)
    const selectInput = () => {
        const inputElem = inputRef.current
        if (inputElem) inputElem.select()
    }

    // useRef 保存数据
    const nameRef = useRef('well')
    const changeName = () => {
        nameRef.current = 'wayliuguo'
        console.log(nameRef.current)
    }

    return (
        <>
            <div>
                <button onClick={addCount}>add {count}</button>
                <div>{JSON.stringify(userInfo)}</div>
                <button onClick={changeAge}>change age</button>
                <hr />
                <div>
                    <input type="text" ref={inputRef} defaultValue="hello world" />
                    <button onClick={selectInput}>选中input</button>
                </div>
                <hr />
                <div>
                    <p>name:{nameRef.current}</p>
                    <button onClick={changeName}>change name</button>
                </div>
            </div>
        </>
    )
}

export default Count
