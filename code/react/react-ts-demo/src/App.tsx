import React, { useState } from 'react'
// import logo from './logo.svg'
import './App.css'
import List from './List'
import Count from './components/Count'
import ClosureTrap from './components/ClosureTrap'

function App() {
    const [showCountState, setCountState] = useState(true)
    const destoryCount = () => {
        setCountState(false)
    }
    return (
        <>
            <List />
            <hr />
            {showCountState && <Count />}
            <hr />
            <button onClick={destoryCount}>销毁count组件</button>
            <hr/>
            <ClosureTrap/>
        </>
    )
}

export default App
