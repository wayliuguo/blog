import { useEffect } from 'react'

const useTitle = (title: string) => {
    useEffect(() => {
        document.title = title
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
}

export default useTitle
