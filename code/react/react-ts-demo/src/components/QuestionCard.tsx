import { FC } from 'react'
import styles from '../style/QuestionCard.module.scss'
import classNames from 'classnames'

type PropsType = {
    id: string
    title: string
    isPublished: boolean
    deleteQuestion: (id: string) => void
    publishQuestion: (id: string) => void
}

const QuestionCard: FC<PropsType> = props => {
    const { id, title, isPublished, deleteQuestion, publishQuestion } = props

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
        <div key={id} className={itemClassName}>
            <strong>{title}</strong>
            &nbsp;
            {/* 条件判断 */}
            {isPublished ? (
                <span className={styles['published-span']}>已发布</span>
            ) : (
                <button
                    onClick={() => {
                        publish(id)
                    }}>
                    发布问卷
                </button>
            )}
            &nbsp;
            <button
                onClick={() => {
                    edit(id)
                }}>
                编辑问卷
            </button>
            <button
                onClick={() => {
                    del(id)
                }}>
                删除问卷
            </button>
        </div>
    )
}

export default QuestionCard
