import { FC, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button, Checkbox, Form, Input, Space, Typography } from 'antd'
import { UserAddOutlined } from '@ant-design/icons'
import styles from '../style/Login.module.scss'
import { REGISTER_PATHNAME } from '../router'

const { Title } = Typography

const Login: FC = () => {
    // Form 提供的hooks，与定义处进行关联
    const [form] = Form.useForm()

    useEffect(() => {
        const { username, password } = getUserInfoFromStorage()
        form.setFieldsValue({
            username,
            password
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const USERNAME_KEY = 'USERNAME'
    const PASSWORD_KEY = 'PASSWORD'
    const rememberUser = (username: string, password: string) => {
        localStorage.setItem(USERNAME_KEY, username)
        localStorage.setItem(PASSWORD_KEY, password)
    }
    const deleteUserFromStorage = () => {
        localStorage.removeItem(USERNAME_KEY)
        localStorage.removeItem(PASSWORD_KEY)
    }
    const getUserInfoFromStorage = () => {
        return {
            username: localStorage.getItem(USERNAME_KEY),
            password: localStorage.getItem(PASSWORD_KEY)
        }
    }

    const onFinish = (values: any) => {
        const { username, password, remember } = values || {}
        if (remember) {
            rememberUser(username, password)
        } else {
            deleteUserFromStorage()
        }
    }

    return (
        <div className={styles.container}>
            <div>
                <Space>
                    <Title level={2}>
                        <UserAddOutlined />
                    </Title>
                    <Title level={2}>用户登录</Title>
                </Space>
            </div>
            <div>
                <Form
                    initialValues={{ remember: true }}
                    labelCol={{ span: 6 }}
                    wrapperCol={{ span: 16 }}
                    onFinish={onFinish}
                    form={form}>
                    <Form.Item
                        label="用户名"
                        name="username"
                        rules={[
                            {
                                required: true,
                                message: '请输入用户名'
                            },
                            {
                                type: 'string',
                                min: 5,
                                max: 20,
                                message: '用户名长度在5-20之间'
                            },
                            {
                                pattern: /^\w+$/,
                                message: '只能是字母数字下划线'
                            }
                        ]}>
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label="密码"
                        name="password"
                        rules={[
                            {
                                required: true,
                                message: '请输入密码'
                            }
                        ]}>
                        <Input.Password />
                    </Form.Item>
                    <Form.Item name="remember" valuePropName="checked" wrapperCol={{ offset: 6, span: 16 }}>
                        <Checkbox>记住我</Checkbox>
                    </Form.Item>
                    <Form.Item wrapperCol={{ offset: 6, span: 16 }}>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                登录
                            </Button>
                            <Link to={REGISTER_PATHNAME}>注册新用户</Link>
                        </Space>
                    </Form.Item>
                </Form>
            </div>
        </div>
    )
}

export default Login
