import { FC } from 'react'
import styles from '../style/QuestionCard.module.scss'
import classNames from 'classnames'

type PropsType = {
    _id: string
    title: string
    isPublished: boolean
    isStart: boolean
    answerCount: number | string
    createAt: number | string
    deleteQuestion: (id: string) => void
    publishQuestion: (id: string) => void
}

const QuestionCard: FC<PropsType> = props => {
    const { _id, title, createAt, isPublished, answerCount, deleteQuestion, publishQuestion } = props

    const edit = (id: string) => {
        console.log('edit', id)
    }

    const del = (id: string) => {
        deleteQuestion(id)
    }

    const publish = (id: string) => {
        publishQuestion(id)
    }

    const listItemClass = styles['list-item']
    const publishedClass = styles['published']
    const itemClassName = classNames({
        [listItemClass]: true,
        [publishedClass]: isPublished
    })

    return (
        <div className={styles.container}>
            <div className={styles.title}>
                <div className={styles.left}>
                    <a href="#">{title}</a>
                </div>
                <div className={styles.right}>
                    {isPublished ? <span style={{ color: 'green' }}>已发布</span> : <span>未发布</span>}
                    <span>答卷：{answerCount}</span>
                    &nbsp;
                    <span>{createAt}</span>
                </div>
            </div>
            <div className={styles['button-container']}>
                <div className={styles.left}>
                    <button>编辑问卷</button>
                    <button>数据统计</button>
                </div>
                <div className={styles.right}>
                    <button>标星</button>
                    <button>复制</button>
                    <button>删除</button>
                </div>
            </div>
        </div>
    )
}

export default QuestionCard
