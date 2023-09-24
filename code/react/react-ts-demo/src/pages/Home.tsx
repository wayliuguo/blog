import { FC } from 'react'
import { useNavigate, Link } from 'react-router-dom'

const Home: FC = () => {
    const nav = useNavigate()
    const clickHandler = () => {
        // nav('/login?b=20')
        nav({
            pathname: '/login',
            search: 'b=21'
        })
    }
    return (
        <div>
            <p>Home</p>
            <div>
                <button onClick={clickHandler}>登录</button>
                <Link to="/register">注册</Link>
            </div>
        </div>
    )
}

export default Home
