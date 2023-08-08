import React from 'react'
import { FC } from 'react'

type PropsType = {
    id: string
    title: string
    isPublished: boolean
}

const QuestionCard: FC<PropsType> = props => {
    const { id, title, isPublished } = props

    const edit = (id: string) => {
        console.log('edit', id)
    }
    return (
        <div key={id} className="list-item">
            <strong>{title}</strong>
            &nbsp;
            {/* 条件判断 */}
            {isPublished ? <span style={{ color: 'green' }}>已发布</span> : <span>未发布</span>}
            &nbsp;
            <button
                onClick={() => {
                    edit(id)
                }}>
                编辑问卷
            </button>
        </div>
    )
}

export default QuestionCard
