import { FC } from 'react'
import QuestionCard from '../../components/QuestionCard'
import { useTitle } from 'ahooks'
import { Empty, Spin, Typography } from 'antd'
import ListSearch from '../../components/ListSearch'
import styles from '../../style/common.module.scss'
import useLoadQuestionListData from '../../hooks/useLoadQuestionListData'

const { Title } = Typography

const Star: FC = () => {
    useTitle('问卷网-星标问卷')

    const { data = {}, loading } = useLoadQuestionListData({ isStar: true })
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
                {!loading && list.length === 0 && <Empty description="暂无数据" />}
                {list.length > 0 &&
                    list.map((q: any) => {
                        const { _id } = q
                        return <QuestionCard key={_id} {...q} />
                    })}
            </div>
            <div className={styles.footer}>分页</div>
        </>
    )
}

export default Star
