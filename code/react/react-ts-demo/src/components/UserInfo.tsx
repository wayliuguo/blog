import { FC } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LOGIN_PATHNAME } from '../router'
import { useRequest } from 'ahooks'
import { getUserInfoService } from '../services/user'
import { UserOutlined } from '@ant-design/icons'
import { Button, message } from 'antd'
import { removeToken } from '../utils/user-token'

const UserInfo: FC = () => {
    const nav = useNavigate()

    const { data } = useRequest(getUserInfoService)
    const { username, nickname } = data || {}

    // 退出登录
    const logout = () => {
        // 移除token
        removeToken()
        message.success('退出成功！')
        // 跳转登录页
        nav(LOGIN_PATHNAME)
    }

    const UserInfo = (
        <>
            <span style={{ color: '#e8e8e8' }}>
                <UserOutlined />
                {nickname}
            </span>
            <Button onClick={logout} type="link">
                退出
            </Button>
        </>
    )

    const Login = <Link to={LOGIN_PATHNAME}>登录</Link>

    return <div>{username ? UserInfo : Login}</div>
}

export default UserInfo
