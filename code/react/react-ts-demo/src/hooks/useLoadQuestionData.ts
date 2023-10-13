// import { useEffect, useState } from 'react'
import { getQuestionService } from '../services/question'
import { useParams } from 'react-router-dom'
import { useRequest } from 'ahooks'

/* const useLoadQuestionData = () => {
    const { id = '' } = useParams()
    const [loading, setLoading] = useState(false)
    const [data, setQuestionData] = useState({})

    useEffect(() => {
        async function fn() {
            const result = await getQuestionService(id)
            setQuestionData(data)
            setLoading(false)
        }
        fn()
    }, [])
    return {
        loading,
        data
    }
} */

const useLoadQuestionData = () => {
    const { id = '' } = useParams()
    const load = async () => {
        const data = await getQuestionService(id)
        return data
    }
    const { loading, data, error } = useRequest(load)
    return { loading, data, error }
}

export default useLoadQuestionData
