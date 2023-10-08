import { FC, useEffect, useMemo, useRef, useState } from 'react'
import QuestionCard from '../../components/QuestionCard'
import { useDebounceFn, useRequest, useTitle } from 'ahooks'
import { Empty, Spin, Typography } from 'antd'
import ListSearch from '../../components/ListSearch'
import styles from '../../style/common.module.scss'
import { useSearchParams } from 'react-router-dom'
import { getQuestionListService } from '../../services/question'
import { LIST_PAGE_SIZE, LIST_SEARCH_PARAM_KEY } from '../../constant'

const { Title } = Typography

const List: FC = () => {
    useTitle('问卷网-我的问卷')

    const [list, setList] = useState([])
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    // 标记是否已经记载（由于防抖有延迟时间）
    const [started, setStarted] = useState(false)
    // 是否未加载完毕
    const haveMoreData = total > list.length

    // 获取 keyword，如果变化需要重新加载数据
    const [searchParams] = useSearchParams()
    const keyword = searchParams.get(LIST_SEARCH_PARAM_KEY) || ''

    // 如果改变keyword，则需要重置分页信息
    useEffect(() => {
        setStarted(false)
        setPage(1)
        setList([])
        setTotal(0)
    }, [keyword])

    // 加载数据
    const { run: load, loading } = useRequest(
        async () => {
            const data = await getQuestionListService({
                page,
                pageSize: LIST_PAGE_SIZE,
                keyword
            })
            return data
        },
        {
            manual: true,
            onSuccess(result) {
                const { list: l = [], total = 0 } = result
                setList(list.concat(l))
                setTotal(total)
                setPage(page + 1)
            }
        }
    )

    // 触发加载
    const containerRef = useRef<HTMLDivElement>(null)
    const { run: tryLoadMore } = useDebounceFn(
        () => {
            const elem = containerRef.current
            if (elem == null) return
            const domRect = elem.getBoundingClientRect()
            if (domRect == null) return
            const { bottom } = domRect
            if (bottom <= document.body.clientHeight) {
                load()
                setStarted(true)
            }
        },
        { wait: 1000 }
    )

    // 当页面加载，或者url参数keyword变化时触发加载(加载第一页)
    useEffect(() => {
        tryLoadMore()
    }, [searchParams, tryLoadMore])

    // 当页面滚动时尝试触发加载
    useEffect(() => {
        if (haveMoreData) {
            window.addEventListener('scroll', tryLoadMore)
        }
        return () => {
            window.addEventListener('scroll', tryLoadMore)
        }
    }, [searchParams, haveMoreData, tryLoadMore])

    // 此函数可以使用 useMemo 缓存
    const loadMoreContentElem = useMemo(() => {
        // 未开始和loading 则显示loading图标
        if (!started || loading) return <Spin />
        if (total === 0) return <Empty description="暂无数据" />
        if (!haveMoreData) return <span>没有更多了</span>
        return <span>开始加载下一页</span>
    }, [started, loading, total, haveMoreData])

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
                {list.length > 0 &&
                    list.map((q: any) => {
                        const { _id } = q
                        return <QuestionCard key={_id} {...q} />
                    })}
            </div>
            <div className={styles.footer}>
                <div ref={containerRef}>{loadMoreContentElem}</div>
            </div>
        </>
    )
}

export default List
