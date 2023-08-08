import React from 'react'
import { FC } from 'react'

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

    return (
        <div key={id} className="list-item">
            <strong>{title}</strong>
            &nbsp;
            {/* 条件判断 */}
            {isPublished ? (
                <span style={{ color: 'green' }}>已发布</span>
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
