import { FC } from 'react'
import styled, { css } from 'styled-components'

// 定义 Button 组件
type ButtonPropsTypes = {
    primary?: boolean
}
const Button = styled.button<ButtonPropsTypes>`
    background: transparent;
    border-radius: 3px;
    border: 2px solid palevioletred;
    color: palevioletred;
    margin: 0 1em;
    padding: 0.25em 1em;

    ${props =>
        props.primary &&
        css`
            background: palevioletred;
            color: white;
        `}
`
const Container = styled.div`
    text-align: center;
`

const StyledComponentsDemo: FC = () => {
    return (
        <div>
            <p>styled-components demo</p>
            <Container>
                <Button>按钮</Button>
                <Button primary>按钮</Button>
            </Container>
        </div>
    )
}

export default StyledComponentsDemo
