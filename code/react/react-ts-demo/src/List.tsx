import { FC, useState } from 'react'
import QuestionCard from './components/QuestionCard'

const List: FC = () => {
    const [questionList, setQuestionList] = useState([
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
    ])

    const add = () => {
        setQuestionList([
            ...questionList,
            {
                id: 'q5',
                title: '问卷5',
                isPublished: true
            }
        ])
    }

    const deleteQuestion = (id: string) => {
        setQuestionList(questionList.filter(item => item.id !== id))
    }

    const publishQuestion = (id: string) => {
        setQuestionList(
            questionList.map(item => {
                if (item.id === id) {
                    item.isPublished = true
                }
                return item
            })
        )
    }

    return (
        <div>
            <h1>问卷页列表</h1>
            <div>
                {questionList.map(question => {
                    const { id, title, isPublished } = question
                    return (
                        <QuestionCard
                            key={id}
                            id={id}
                            title={title}
                            isPublished={isPublished}
                            deleteQuestion={deleteQuestion}
                            publishQuestion={publishQuestion}
                        />
                    )
                })}
            </div>
            <div>
                <button onClick={add}>新增问卷</button>
            </div>
        </div>
    )
}

export default List
