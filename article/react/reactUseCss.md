## 普通方式使用
- 引入
```
import '../style/QuestionCard.css'
```
- 动态样式处理
```
const QuestionCard: FC<PropsType> = props => {
    const { isPublished } = props

    let itemClassName = 'list-item'
    if (isPublished) itemClassName += ' published'

    return <div className={itemClassName}>...</div>
}
```
- 使用[classnames](https://www.npmjs.com/package/classnames)处理
```
npm i classnames
```
```
const itemClassName = classNames('list-item', { published: isPublished })
```

## css module
- 每个css文件都当作单独的模块，命名：xxx.module.css
- Create-React-App 已经支持CSS Module
- 其原理是会自动为 className 增加后缀名，不让他们重复
```
import styles from '../style/QuestionCard.module.css'

<div className={styles['list-item']}></div>
```
- 结合 modules
  - 原理就是对象合并的时候使用中括号取属性的值作为对象的key
  ```
  const name = 'a'
  const obj = {
    [name]: 1
  } // {a: 1}
  ```
```
const listItemClass = styles['list-item']
const publishedClass = styles['published']
const itemClassName = classNames({
    [listItemClass]: true,
    [publishedClass]: isPublished
})

<div className={itemClassName}>...</div>
```

## CSS-in-JS
- 一种解决方案，有好几个工具

- 在js中写css，带来极大的灵活性

- 和内联 style 完全不一样，不会有内联style的问题

- 工具

  - [styled-components](https://styled-components.com/docs/basics#getting-started)

  ```
  // 安装
  npm install styled-components
  ```
  
  ```
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
  
  ```
  
  