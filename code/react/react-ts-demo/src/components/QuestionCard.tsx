import { FC, useState } from 'react'
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
import { duplicateQuestionService, updateQuestionService } from '../services/question'
import { useRequest } from 'ahooks'

type PropsType = {
    _id: string
    title: string
    isPublished: boolean
    isStar: boolean
    answerCount: number | string
    createAt: number | string
}

const { confirm } = Modal

const QuestionCard: FC<PropsType> = props => {
    const nav = useNavigate()

    const { _id, title, isStar, createAt, isPublished, answerCount } = props

    // 修改标星
    const [isStarState, setIsStarState] = useState(isStar)
    const { loading: changeStarLoading, run: changeStar } = useRequest(
        async () => {
            await updateQuestionService(_id, { isStar: !isStarState })
        },
        {
            manual: true,
            onSuccess() {
                setIsStarState(!isStarState)
                message.success('已更新！')
            }
        }
    )

    // 复制
    const { loading: duplicateLoading, run: duplicate } = useRequest(
        async () => {
            const data = await duplicateQuestionService(_id)
            return data
        },
        {
            manual: true,
            onSuccess(result) {
                message.success('复制成功')
                nav(`/question/edit/${result.id}`)
            }
        }
    )

    // 删除
    const [isDeletedState, setIsDeletedState] = useState(false)
    const { loading: deleteLoading, run: deleteQuestion } = useRequest(
        async () => await updateQuestionService(_id, { isDeleted: true }),
        {
            manual: true,
            onSuccess() {
                message.success('删除成功！')
                setIsDeletedState(true)
            }
        }
    )
    const del = (id: string) => {
        confirm({
            title: '确认删除该问卷？',
            icon: <ExceptionOutlined />,
            onOk: deleteQuestion
        })
    }

    // 如果已经删除的问卷，则不再渲染卡片
    if (isDeletedState) return null

    return (
        <div className={styles.container}>
            <div className={styles.title}>
                <div className={styles.left}>
                    <Link to={isPublished ? `/question/stat/${_id}` : `/question/edit/${_id}`}>
                        <Space>
                            {isStarState && <StarOutlined style={{ color: 'red' }} />}
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
                        <Button
                            onClick={changeStar}
                            disabled={changeStarLoading}
                            type="text"
                            icon={<StarOutlined />}
                            size="small">
                            {isStarState ? '取消标星' : '标星'}
                        </Button>
                        <Popconfirm title="确认复制该问卷？" okText="确定" cancelText="取消" onConfirm={duplicate}>
                            <Button disabled={duplicateLoading} type="text" icon={<CopyOutlined />} size="small">
                                复制
                            </Button>
                        </Popconfirm>
                        <Button
                            type="text"
                            icon={<DeleteOutlined />}
                            size="small"
                            disabled={deleteLoading}
                            onClick={() => del(_id)}>
                            删除
                        </Button>
                    </Space>
                </div>
            </div>
        </div>
    )
}

export default QuestionCard
