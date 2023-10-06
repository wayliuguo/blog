import { FC } from 'react'
import QuestionCard from '../../components/QuestionCard'
import { useTitle } from 'ahooks'
import { Spin, Typography } from 'antd'
import ListSearch from '../../components/ListSearch'
import styles from '../../style/common.module.scss'
import useLoadQuestionListData from '../../hooks/useLoadQuestionListData'

const { Title } = Typography

const List: FC = () => {
    useTitle('问卷网-我的问卷')

    const { data = {}, loading } = useLoadQuestionListData()
    const { list = [] } = data

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
