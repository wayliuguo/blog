import { FC, useState } from 'react'
import QuestionCard from '../../components/QuestionCard'
import { useTitle } from 'ahooks'
import { Empty, Typography } from 'antd'
import styles from '../../style/common.module.scss'

const { Title } = Typography

type questionProps = {
    _id: string
    title: string
    isPublished: boolean
    isStar: boolean
    answerCount: number
    createAt: string | number
}
type questionListProps = questionProps[]

const Star: FC = () => {
    useTitle('问卷网-星标问卷')

    const [questionList, setQuestionList] = useState<questionListProps>([
        {
            _id: 'q1',
            title: '问卷1',
            isPublished: true,
            isStar: true,
            answerCount: 2,
            createAt: '1月10日'
        },
        {
            _id: 'q2',
            title: '问卷2',
            isPublished: false,
            isStar: true,
            answerCount: 3,
            createAt: '2月10日'
        }
    ])
    const deleteQuestion = (_id: string) => {
        setQuestionList(questionList.filter(item => item._id !== _id))
    }

    const publishQuestion = (_id: string) => {
        setQuestionList(
            questionList.map(item => {
                if (item._id === _id) {
                    item.isPublished = true
                }
                return item
            })
        )
    }
    return (
        <>
            <div className={styles.header}>
                <div className={styles.left}>
                    <Title level={3}>我的问卷</Title>
                </div>
                <div className={styles.right}>（搜索）</div>
            </div>
            <div className={styles.content}>
                {questionList.length === 0 && <Empty description="暂无数据" />}
                {questionList.length > 0 &&
                    questionList.map(q => {
                        const { _id } = q
                        return (
                            <QuestionCard
                                key={_id}
                                {...q}
                                deleteQuestion={deleteQuestion}
                                publishQuestion={publishQuestion}
                            />
                        )
                    })}
            </div>
            <div className={styles.footer}>分页</div>
        </>
    )
}

export default Star
