import { useEffect, useState } from 'react'

const getSize = () => {
    return window.innerWidth > 1000 ? 'large' : 'small'
}

const useWindowSize = () => {
    const [size, setSize] = useState(getSize())
    useEffect(() => {
        const handler = () => {
            setSize(getSize())
        }
        window.addEventListener('resize', handler)
        return () => {
            window.removeEventListener('resize', handler)
        }
    }, [])
    return size
}

const Demo = () => {
    const size = useWindowSize()
    return <div>{size}</div>
}

export default Demo
