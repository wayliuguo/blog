import { FC } from 'react'

const List: FC = () => {
    const questionList = [
        {
            id: 'q1',
            title: '问卷1',
            isPublished: true
        },
        {
            id: 'q2',
            title: '问卷2',
            isPublished: false
        },
        {
            id: 'q3',
            title: '问卷3',
            isPublished: true
        },
        {
            id: 'q4',
            title: '问卷4',
            isPublished: true
        }
    ]
    const edit = (id: string) => {
        console.log('edit', id)
    }
    return (
        <div>
            <h1>问卷页列表</h1>
            <div>
                {questionList.map(question => {
                    const { id, title, isPublished } = question
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
                })}
            </div>
        </div>
    )
}

export default List
