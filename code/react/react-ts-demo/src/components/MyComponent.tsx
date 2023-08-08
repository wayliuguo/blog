import React from 'react'
import WithWindowSize from './WithWindowSize'

interface propsTypes {
    size: string
}

class MyComponent extends React.Component<propsTypes> {
    render() {
        const { size } = this.props
        return <div>{size}</div>
    }
}

export default WithWindowSize(MyComponent)
