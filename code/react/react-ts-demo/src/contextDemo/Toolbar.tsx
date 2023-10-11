import { FC } from 'react'
import ThemeButton from './ThemeButton'

const Toolbar: FC = () => {
    return (
        <>
            <button>Toolbar</button>
            <div>
                <ThemeButton />
            </div>
        </>
    )
}

export default Toolbar
