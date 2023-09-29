import { FC } from 'react'
import { Button, Space, Divider, Tag, Popconfirm, Modal, message } from 'antd'
import {
    EditOutlined,
    LineChartOutlined,
    StarOutlined,
    CopyOutlined,
    DeleteOutlined,
    ExceptionOutlined
} from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import styles from '../style/QuestionCard.module.scss'

type PropsType = {
    _id: string
    title: string
    isPublished: boolean
    isStar: boolean
    answerCount: number | string
    createAt: number | string
    deleteQuestion: (id: string) => void
    publishQuestion: (id: string) => void
}

const { confirm } = Modal

const QuestionCard: FC<PropsType> = props => {
    const nav = useNavigate()

    const { _id, title, isStar, createAt, isPublished, answerCount, deleteQuestion, publishQuestion } = props

    const duplicate = () => {
        message.info('执行复制')
    }

    const edit = (id: string) => {
        console.log('edit', id)
    }

    const del = (id: string) => {
        confirm({
            title: '确认删除该问卷？',
            icon: <ExceptionOutlined />,
            onOk: () => {
                deleteQuestion(id)
            }
        })
    }

    const publish = (id: string) => {
        publishQuestion(id)
    }

    return (
        <div className={styles.container}>
            <div className={styles.title}>
                <div className={styles.left}>
                    <Link to={isPublished ? `/question/stat/${_id}` : `/question/edit/${_id}`}>
                        <Space>
                            {isStar && <StarOutlined style={{ color: 'red' }} />}
                            {title}
                        </Space>
                    </Link>
                </div>
                <div className={styles.right}>
                    <Space>
                        {isPublished ? <Tag color="processing">已发布</Tag> : <Tag>未发布</Tag>}
                        <span>答卷：{answerCount}</span>
                        <span>{createAt}</span>
                    </Space>
                </div>
            </div>
            <Divider style={{ margin: '12px' }} />
            <div className={styles['button-container']}>
                <div className={styles.left}>
                    <Space>
                        <Button
                            icon={<EditOutlined />}
                            type="text"
                            size="small"
                            onClick={() => nav(`/question/edit/${_id}`)}>
                            编辑问卷
                        </Button>
                        <Button
                            icon={<LineChartOutlined />}
                            type="text"
                            size="small"
                            onClick={() => nav(`/question/stat/${_id}`)}
                            disabled={!isPublished}>
                            数据统计
                        </Button>
                    </Space>
                </div>
                <div className={styles.right}>
                    <Space>
                        <Button type="text" icon={<StarOutlined />} size="small">
                            {isStar ? '取消标星' : '标星'}
                        </Button>
                        <Popconfirm title="确认复制该问卷？" okText="确定" cancelText="取消" onConfirm={duplicate}>
                            <Button type="text" icon={<CopyOutlined />} size="small">
                                复制
                            </Button>
                        </Popconfirm>
                        <Button type="text" icon={<DeleteOutlined />} size="small" onClick={() => del(_id)}>
                            删除
                        </Button>
                    </Space>
                </div>
            </div>
        </div>
    )
}

export default QuestionCard
