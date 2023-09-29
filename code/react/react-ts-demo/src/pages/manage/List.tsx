import { FC, useState } from 'react'
import QuestionCard from '../../components/QuestionCard'
import { useSearchParams } from 'react-router-dom'
import { useTitle } from 'ahooks'
import { Typography } from 'antd'
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

const List: FC = () => {
    useTitle('问卷网-我的问卷')

    const [searchParams] = useSearchParams()
    console.log('keyword', searchParams.get('keyword'))
    const [questionList, setQuestionList] = useState<questionListProps>([
        {
            _id: 'q1',
            title: '问卷1',
            isPublished: true,
            isStar: false,
            answerCount: 2,
            createAt: '1月10日'
        },
        {
            _id: 'q2',
            title: '问卷2',
            isPublished: false,
            isStar: false,
            answerCount: 3,
            createAt: '2月10日'
        },
        {
            _id: 'q3',
            title: '问卷3',
            isPublished: true,
            isStar: false,
            answerCount: 5,
            createAt: '3月10日'
        },
        {
            _id: 'q4',
            title: '问卷4',
            isPublished: true,
            isStar: true,
            answerCount: 6,
            createAt: '4月10日'
        }
    ])

    const add = () => {
        setQuestionList([
            ...questionList,
            {
                _id: 'q5',
                title: '问卷5',
                isPublished: true,
                isStar: false,
                answerCount: 0,
                createAt: Date.now()
            }
        ])
    }

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
            <div className={styles.footer}>loadMore... 上滑加载更多</div>
        </>
    )
}

export default List
