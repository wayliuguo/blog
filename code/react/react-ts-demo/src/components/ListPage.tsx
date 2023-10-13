import { Pagination } from 'antd'
import { FC, useEffect, useState } from 'react'
import { LIST_PAGE_PARAM_KEY, LIST_PAGE_SIZE, LIST_PAGE_SIZE_PARAM_KEY } from '../constant'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

type PropsType = {
    total: number
}

const ListPage: FC<PropsType> = (props: PropsType) => {
    const { total } = props

    const [current, setCurrent] = useState<number>(1)
    const [pageSize, setPageSize] = useState<number>(LIST_PAGE_SIZE)

    // 从url参数中找到page 的 pageSize, 并且同步到 Pagenation 组件中
    const [searchParams] = useSearchParams()
    useEffect(() => {
        const page = parseInt(searchParams.get(LIST_PAGE_PARAM_KEY) || '') || 1
        setCurrent(page)
        const pageSize = parseInt(searchParams.get(LIST_PAGE_SIZE_PARAM_KEY) || '') || LIST_PAGE_SIZE
        setPageSize(pageSize)
    }, [searchParams])

    // 当 page pageSize 改变时，跳转页面（改变url参数）
    const nav = useNavigate()
    const { pathname } = useLocation()
    const handlePageChange = (page: number, pageSize: number) => {
        // 设置 searchParams
        searchParams.set(LIST_PAGE_PARAM_KEY, page.toString())
        searchParams.set(LIST_PAGE_SIZE_PARAM_KEY, pageSize.toString())
        // 跳转页面，改变url参数
        nav({
            pathname,
            search: searchParams.toString()
        })
    }

    return <Pagination current={current} pageSize={pageSize} total={total} onChange={handlePageChange} />
}

export default ListPage
