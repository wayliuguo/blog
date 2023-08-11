import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FC } from 'react'
import { produce } from 'immer'
import useTitle from '../hooks/useTitle'
import useMouse from '../hooks/useMouse'
import useGetInfo from '../hooks/useGetInfo'

const set = new Set()

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

    // useMemo
    const [num1, setNum1] = useState(10)
    const [num2, setNum2] = useState(20)
    const sum = useMemo(() => {
        console.log('useMemo的依赖项变更了')
        return num1 + num2
    }, [num1, num2])

    // useCallback
    const callback = useCallback(() => {
        console.log(count)
    }, [count])
    set.add(callback)

    // 自定义 hooks
    useTitle('react app')
    const { x, y } = useMouse()
    const { loading, info } = useGetInfo(count)

    return (
        <>
            <div>
                <h2>useState:</h2>
                <button onClick={addCount}>add {count}</button>
                <div>{JSON.stringify(userInfo)}</div>
                <button onClick={changeAge}>change age</button>
                <hr />
                <h2>useRef:</h2>
                <div>
                    <input type="text" ref={inputRef} defaultValue="hello world" />
                    <button onClick={selectInput}>选中input</button>
                </div>
                <hr />
                <div>
                    <p>name:{nameRef.current}</p>
                    <button onClick={changeName}>change name</button>
                </div>
                <hr />
                <h2>useMemo</h2>
                <div>
                    <p>{sum}</p>
                    <p>
                        {num1}
                        <button
                            onClick={() => {
                                setNum1(num1 + 1)
                            }}>
                            num1+1
                        </button>
                    </p>
                    <p>
                        {num2}
                        <button
                            onClick={() => {
                                setNum2(num2 + 1)
                            }}>
                            num2+1
                        </button>
                    </p>
                </div>
                <hr />
                <h2>useCallback</h2>
                <div>Set.size{set.size}</div>
                <hr />
                <h2>自定义hooks</h2>
                <div>
                    <p>{x}</p>
                    <p>{y}</p>
                    <p>{loading ? '加载中...' : info}</p>
                </div>
            </div>
        </>
    )
}

export default Count
