import { FC } from 'react'
import QuestionCard from './components/QuestionCard'

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
                    return <QuestionCard key={id} id={id} title={title} isPublished={isPublished} />
                })}
            </div>
        </div>
    )
}

export default List
