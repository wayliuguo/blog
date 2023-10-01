import { FC, useEffect, useState } from 'react'
import QuestionCard from '../../components/QuestionCard'
import { useSearchParams } from 'react-router-dom'
import { useRequest, useTitle } from 'ahooks'
import { Spin, Typography } from 'antd'
import ListSearch from '../../components/ListSearch'
import styles from '../../style/common.module.scss'
import { getQuestionListService } from '../../services/question'

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

    /* const [list, setList] = useState([])
    const [total, setTotal] = useState(0)
    useEffect(() => {
        const load = async () => {
            const data = await getQuestionListService()
            const { list = [], total = 0 } = data
            setList(list)
            setTotal(total)
        }
        load()
    }) */
    const { data = {}, loading } = useRequest(getQuestionListService)
    const { list = [], total = 0 } = data

    return (
        <>
            <div className={styles.header}>
                <div className={styles.left}>
                    <Title level={3}>我的问卷</Title>
                </div>
                <div className={styles.right}>
                    <ListSearch />
                </div>
            </div>
            <div className={styles.content}>
                {loading && (
                    <div style={{ textAlign: 'center' }}>
                        <Spin />
                    </div>
                )}
                {!loading &&
                    list.length > 0 &&
                    list.map((q: any) => {
                        const { _id } = q
                        return <QuestionCard key={_id} {...q} />
                    })}
            </div>
            <div className={styles.footer}>loadMore... 上滑加载更多</div>
        </>
    )
}

export default List
