import { ChangeEvent, FC, useEffect, useState } from 'react'
import { Input } from 'antd/es'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { LIST_SEARCH_PARAM_KEY } from '../constant'

const { Search } = Input
const ListSearch: FC = () => {
    const nav = useNavigate()
    const { pathname } = useLocation()

    const [value, setValue] = useState('')
    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        setValue(event.target.value)
    }
    const handleSearch = (value: string) => {
        nav({
            pathname,
            search: `${LIST_SEARCH_PARAM_KEY}=${value}`
        })
    }

    // 获取url参数并设置到input value中
    const [searchParams] = useSearchParams()
    useEffect(() => {
        const curVal = searchParams.get(LIST_SEARCH_PARAM_KEY) || ''
        setValue(curVal)
    }, [searchParams])

    return (
        <Search
            size="large"
            placeholder="输入关键字"
            allowClear
            value={value}
            onChange={handleChange}
            onSearch={handleSearch}
            style={{ width: '260px' }}
        />
    )
}

export default ListSearch
