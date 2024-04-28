import React from 'react'

interface IState {
    count: number
}

class ClassTs<P> extends React.PureComponent<P, IState> {
    internalProps: P
    constructor(props: P) {
        super(props)
        this.internalProps = props
    }
    state = {
        count: 0
    }
    render() {
        return <div>{this.state.count}</div>
    }
}

export default ClassTs
