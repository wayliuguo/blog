# React 使用 CSS

> 级别：中级

按本书四层推进：

- **入门使用**：普通 CSS（内联 style / className）、classnames 动态拼接；
- **进阶**：CSS Module 类名隔离、CSS-in-JS（styled-components / styled-jsx）、Tailwind 原子化；
- **实战**：按项目阶段选择合适的样式方案（问卷系统里普通 CSS + classnames + antd）；
- **最小实现掌握原理**：到 `code/frontend/07-react` 运行 `mini-runtime.html`，理解内联 style 在 React 里就是"传给 DOM 的一个普通 JS 对象"，`className` 就是"类名"。

React 组件化开发带来了样式的若干写法：普通 CSS（含内联 style）、CSS Module、CSS-in-JS（如 styled-components）、Tailwind 以及 classnames 动态拼接等。本文梳理这些方案的用法、优缺点与选型对比，都是在 React 里写样式的常用手段。

## 普通 CSS

### 内联 style

- 和 HTML 的 `style` 属性类似，是元素的内联样式（inline style）。
- 必须是 **JS 对象** 形式，**不能是字符串**。
- 样式属性名使用**驼峰式**（camelCase）写法，例如 `fontSize`。

```tsx
const inlineStyle = { fontSize: 16, color: 'red' }
<div style={inlineStyle}>内容</div>
```

### className

- 和 HTML 的 `class` 作用一致，用来设置样式类名。
- 因为与 JS 的 `class` 关键字重复，所以改名为 `className`。
- 当需要条件拼接多个类名时，可以使用 `classnames` 或 `clsx`。

```tsx
<div className="list-item published">内容</div>
```

> 相关库：
> - classnames: <https://www.npmjs.com/package/classnames>
> - clsx: <https://www.npmjs.com/package/clsx>

### 尽量不用内联 style

- 内联 style 代码量大、性能较差，不利于复用。
- 外链样式（用 `className`）可以复用、性能更好。
- 这一点与 React 无关，在学 HTML/CSS 时就应该知道。

## classnames 动态拼接

推荐在 React 中使用 `classnames` 来动态拼接类名，它支持对象 / 数组等多种写法，可读性好。

安装：

```bash
npm i classnames
```

对比：手动拼接字符串

```tsx
const QuestionCard: FC<PropsType> = props => {
    const { isPublished } = props

    let itemClassName = 'list-item'
    if (isPublished) itemClassName += ' published'

    return <div className={itemClassName}>...</div>
}
```

使用 `classnames` 改写：

```tsx
const QuestionCard: FC<PropsType> = props => {
    const { isPublished } = props
    const itemClassName = classNames('list-item', { published: isPublished })

    return <div className={itemClassName}>...</div>
}
```

## CSS Module

### 普通 CSS 的问题

- React 采用组件化开发，多个组件对应多个 CSS 文件。
- 多个 CSS 文件容易出现**类名重复**，导致互相覆盖、难以管理。

### CSS Module 的原理

- 把每个 CSS 文件都当作一个**独立的模块**，命名为 `xxx.module.css`。
- 每个模块里的 `className` 都会自动加上不重复的后缀名，避免彼此冲突。
- Create-React-App（CRA）原生支持 CSS Module。

```css
/* QuestionCard.module.css */
.list-item {
    padding: 12px;
}
.published {
    color: green;
}
```

```tsx
import styles from '../style/QuestionCard.module.css'

<div className={styles['list-item']}>...</div>
```

### CSS Module 结合 classnames

把动态拼接和模块化结合：先取出模块化后的类名，再用 `classnames` 组合。其原理是利用对象字面量中括号取值的特性，把变量的值作为对象的 key。

```js
const name = 'a'
const obj = {
    [name]: 1 // 结果为 { a: 1 }
}
```

示例：

```tsx
import styles from '../style/QuestionCard.module.css'
import classNames from 'classnames'

const listItemClass = styles['list-item']
const publishedClass = styles['published']
const itemClassName = classNames({
    [listItemClass]: true,
    [publishedClass]: isPublished
})

<div className={itemClassName}>...</div>
```

### 使用 Sass

- CSS 写法比较原始，一般会使用 Sass / Less 等预处理语言增强能力。
- CRA 支持 Sass Module，把后缀改为 `.module.scss` 即可直接使用。

## CSS-in-JS

### 什么是 CSS-in-JS

- 一种**解决方案**（不是某个工具的名字），在 JS（组件代码）中写 CSS。
- 不用担心 CSS class 重名的问题，动态样式更灵活。
- **注意（重要）**：CSS-in-JS 并不是内联 style，它会经过工具的编译处理，最终生成真实的 CSS class 形式。
- 相比 CSS Module，CSS-in-JS 能更灵活地支持动态样式，直接在 JS 中完成计算和样式切换。

### styled-components

[styled-components](https://styled-components.com/) 是 CSS-in-JS 的代表实现，通过带样式的标签模板字符串快速创建组件。

安装：

```bash
npm install styled-components
```

用法：

```tsx
import { FC } from 'react'
import styled, { css } from 'styled-components'

// 定义 Button 组件，t 泛型支持 props
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

### styled-jsx

[styled-jsx](https://github.com/vercel/styled-jsx#getting-started) 是另一种 CSS-in-JS 方案（Next.js 内置），用 `jsx` 标签包裹样式，默认作用域局部。

```tsx
export default function Demo() {
    return (
        <div>
            <p>styled-jsx demo</p>
            <style jsx>{`
                p {
                    color: palevioletred;
                }
            `}</style>
        </div>
    )
}
```

## Tailwind CSS

[Tailwind CSS](https://www.tailwindcss.cn/) 是一种 **Utility-first（原子化）** 的方案：把常用的 CSS 样式细分成一个个小工具类，开发者可以自由组合搭配。

特点：无需编写大量 CSS，直接用工具类堆叠样式。例如：

- 字体大小：<https://www.tailwindcss.cn/docs/font-size>
- 间距：<https://www.tailwindcss.cn/docs/padding>
- 宽度：<https://www.tailwindcss.cn/docs/width>

示例：

```tsx
<h1 className="text-3xl font-bold underline">
    Use tailwind CSS
</h1>
```

安装可参考：[Tailwind CSS 官方 Create React App 指南](https://www.tailwindcss.cn/docs/guides/create-react-app)。

## 各方案对比

| 方案 | 类名隔离 | 动态样式 | 学习成本 | 适用场景 |
| --- | --- | --- | --- | --- |
| 普通 CSS + className | 无（需自己保证不重名） | 需配合 classnames 拼接 | 低 | 小项目、全局样式 |
| CSS Module | 有（自动加后缀） | 需配合 classnames | 低 | CRA 项目、中大型项目 |
| CSS-in-JS（styled-components 等） | 有（编译为 class） | 强（直接在 JS 中计算） | 中 | 高度动态样式、组件库 |
| Tailwind | 灵活组合工具类 | 配合 classnames 等 | 中 | 追求开发效率、风格统一 |

## 小结

- 简单场景直接用 **普通 CSS + className**，条件样式交给 **classnames / clsx**。
- 需要避免类名冲突时用 **CSS Module**（`xxx.module.css`），可结合 Sass。
- 需要高度动态的样式时，用 **CSS-in-JS**（styled-components / styled-jsx）。
- 追求效率与风格统一时，可选择 **Tailwind CSS** 这类原子化方案。

## 最小实现：内联 style 就是一个普通对象

到 `code/frontend/07-react` 运行 `mini-runtime.html`，看它手写渲染器怎么做的：`Object.keys(props).forEach(k => dom[k] = props[k])`——所谓内联 style，本质就是"把这个 JS 对象交给真实 DOM 的 style 属性"。原理一句话：`style` 和 `className` 在 React 里都只是 props 对象里的普通键，最终被设置到真实 DOM 上。

## 面试衔接

本节对应 `90-附录-面试体系` 的「React 样式」板块：内联 style 与 className、CSS Module 隔离原理、CSS-in-JS vs Tailwind 选型。做真题自测后，进入下一节 `07-React 高级与原理`。