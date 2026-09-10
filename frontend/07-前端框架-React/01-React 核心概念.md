# React 核心概念

React 是一个用于构建用户界面（UI）的 JavaScript 库，其核心思想是"一切皆组件"，通过 JSX 语法以声明式的方式描述界面，将 UI 拆分为可复用的组件进行开发与维护。本文覆盖 JSX 语法与规则、JSX 与 Vue 模板的对比、组件与 Props、开发工具，以及开发 List 页的实战要点，帮助初学者快速建立 React 的前端知识框架。

> 级别：初级

按本书四层推进：

- **入门使用**：JSX 语法与规则、组件与 Props、开发工具（React Developer Tools）；
- **进阶**：JSX 与 Vue 模板的写法对比，理解"两代框架设计理念"的差异；
- **实战**：开发 List 页——综合运用判断、循环（key）、属性、事件；
- **最小实现掌握原理**：到 `code/frontend/07-react` 运行 `mini-runtime.html`，用手写 createElement + render 看清"虚拟 DOM + 声明式更新"是怎么一回事。

## 开发依赖

在 React 项目中，通常会用到以下几个核心依赖：

- **react**：包含 React 所必需的核心代码，负责定义组件、管理状态与生命周期等。
- **react-dom**：React 在不同平台上渲染所需的代码
  - Web 端：将 JSX 最终渲染成真实 DOM，显示在浏览器中。
  - Native 端：将 JSX 渲染成原生控件（React Native）。
- **babel**：将 JSX 转换成 React 代码的工具。默认情况下其实不需要 babel，前提是我们自己使用 `React.createElement` 编写源代码。

## JSX 语法与规则

JSX 是 JavaScript 的语法扩展，可以在 JS 中编写"类似 HTML 的模板"。它已经成为 ES 语法的标准趋势，也可用于其他框架（如 Vue3）。JSX 主要涉及标签、属性、事件、表达式、判断、循环等内容。

### 根元素与标签

- 一段 JSX **只能有一个根节点**，所以很多时候会在外层包裹一个 `div`，或者使用 `Fragment`（即 `<></>`）文档片段。
- 为了方便阅读，通常会在 JSX 外层包裹一个小括号。
- 标签必须闭合。`<input>`、`<br>` 这样写在 JSX 中会报错（在 HTML 中不会报错），必须写为 `<input/>`、`<br/>`。
- 标签首字母的规则：
  - 若以小写字母开头，则将该标签视为 HTML 原生元素；若 HTML 中没有该同名元素，则报错。
  - 若以大写字母开头，React 就去渲染对应的组件；若组件未定义，则报错。例如 `<input/>` 和 `<Input/>` 含义完全不同。
- 可以像 HTML 一样进行标签嵌套。

### 嵌入变量与表达式

在 JSX 中，使用 `{xxx}` 格式嵌入一个 JS 变量或表达式，可用于普通文本内容、属性值、判断和循环，也可用于注释。

嵌入变量时，不同数据类型有不同的渲染表现：

- **直接显示**：`number`、`string`、`array`。
- **内容为空**：`null`、`undefined`、`boolean` 渲染为空。如果需要显示，可以转成字符串，转换方式有 `toString()`、字符串拼接、`String(变量)` 等。
- **对象类型不能作为子元素**。

```jsx
const name = 'well'
const age = 18
const names = ['a', 'b', 'c']
const test1 = undefined
const test2 = null
const test3 = true

// number、string、array 可以渲染
<h2>{name}</h2>
<h2>{age}</h2>
<h2>{names}</h2>

// undefined、null、boolean 渲染为空
<h2>{test1}</h2>
<h2>{test2}</h2>
<h2>{test3}</h2>

// 嵌入表达式
<h2>{`姓名：${name}，年龄${age}`}</h2>
```

### 判断

JS 中一般使用 `if...else` 做判断，但它不能直接用于 JSX 的 `{xxx}` 中。因此可以使用其他方式：

- 逻辑运算符 `&&`
- 三元表达式 `a ? b : c`
- 用函数封装

```jsx
const flag = true
return (
  <div>
    {flag && <p>hello</p>}
    {flag ? <p>你好</p> : <p>再见</p>}
  </div>
)
```

或者用函数封装：

```jsx
function Hello() {
  if (flag) return <p>你好</p>
  else return <p>再见</p>
}

return <Hello></Hello>
```

### 循环

使用 `map` 做循环，并给每一项添加唯一的 `key`。

```jsx
const list = [
  { username: 'zhangsan', name: '张三' },
  { username: 'lisi', name: '李四' },
  { username: 'shuangyue', name: '双越' }
]

const ul = (
  <ul>
    {list.map((user) => (
      <li key={user.username}>{user.name}</li>
    ))}
  </ul>
)
```

JSX 循环必须要有 `key`，它帮助 React 识别哪些元素发生了改变（如被添加或删除）：

- 同级 `key` 必须唯一。
- `key` 是不可改变的——尽量不使用 `index`，要用业务 ID（也不要用随机数）。
- `key` 用于优化 VDOM diff 算法。

### 绑定属性

与 HTML 属性基本一致，但部分与 JS 关键字冲突的属性需要改写：

- 定义类名需要用 `className`（对应 HTML 的 `class`）。
- `for` 要改为 `htmlFor`。
- 内联样式 `style` 要写成 JS 对象（不能是字符串），key 采用**驼峰写法**，写法为 `style=&#123;&#123;key: val}}`——外面第一个大括号是表达式，里面是对象。

```jsx
const linkStyle = {
  color: 'red',
  fontSize: '32px'
}

<a
  className="App-link"
  href="https://reactjs.org"
  target="_blank"
  rel="noopener noreferrer"
  style={linkStyle}
>
  Learn React
</a>
```

### 绑定事件

事件通过 `onXxx` 的形式指定（注意大小写），例如 `onClick`、`onBlur`：

- React 使用自定义的（合成）事件，而不是原生 DOM 事件。
- React 中的事件通过事件委托方式处理（委托给组件最外层元素）。
- 绑定事件函数中，this 指向组件对象的三种方案：显式 `bind`、箭头函数定义、传入箭头函数执行。
- 事件处理函数必须传引用，而不是调用：`onClick={handleClick}`，而不是 `onClick={handleClick()}`。

```jsx
// 方案一：显式绑定
<button onClick={this.btnClick.bind(this)}>绑定事件</button>

// 方案一变体：在构造函数中重新赋值
constructor(props) {
  this.btnClick = this.btnClick.bind(this)
}

// 方案二：使用箭头函数定义函数
btnClickArrow = () => {}

// 方案三：传入一个箭头函数，在其中执行需要执行的函数
<button onClick={() => this.btnClick()}>箭头函数执行绑定事件</button>
```

通过 `event` 可以拿到发生事件的 DOM 元素对象，例如 `event.target`：

```jsx
class Demo extends React.Component {
  showData = (event) => {
    alert(event.target.value)
  }
  // ...
  <input onBlur={this.showData} type="text" />
}
```

Class 组件示例：

```jsx
class Weather extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      name: 'well',
      age: 18,
      names: ['a', 'b', 'c'],
      style: { color: 'red', fontSize: '18px' }
    }
    // this.btnClick = this.btnClick.bind(this)
  }
  btnClick() {
    let { age } = this.state
    this.setState({ age: ++age })
  }
  btnClickArrow = () => {
    let { age } = this.state
    this.setState({ age: ++age })
  }
  render() {
    const { name, age, names, style } = this.state
    return (
      <div>
        <h2 className="box">绑定class</h2>
        <h2 style={style}>绑定style</h2>
        <h2 style={dfs}>绑定style（展开，dfs 为 const dfs = Object.assign({}, style)）</h2>
        <button onClick={this.btnClick.bind(this)}>显示绑定事件</button>
        <button onClick={this.btnClickArrow}>箭头函数绑定事件</button>
        <button onClick={() => this.btnClick()}>箭头函数执行绑定事件</button>
      </div>
    )
  }
}
ReactDOM.render(<Weather />, document.querySelector('#test'))
```

### 显示 HTML 代码

JSX 默认会防止 XSS 注入攻击。如果确需显示一段 HTML 代码，可以使用：

```jsx
const disHtml = { __html: 'xxx' }
dangerouslySetInnerHTML={disHtml}
```

## JSX 与 Vue 模板对比

JSX 与 Vue 模板是两种不同的模板写法，它们的重大区别如下：

- **判断**：Vue 模板用 `v-if` 指令。
- **循环**：Vue 模板用 `v-for` 指令。
- **表达式写法**：Vue 模板中没有 `{xxx}` 写法，全都是 `"xxx"`。

补充：Vue3 也能很友好地支持 JSX——从最开始抨击 JSX 到最后接纳。

通过对比可以看出 React 和 Vue 最初设计理念的区别：

- **React**：JS 能实现的都交给 JS，不重复定义——要求使用者 JS 熟练。
- **Vue**：自定义了很多指令和写法，初学者更好理解、好记忆、好推广——但这些写法需要记忆、查文档，相对麻烦。

## 组件与 Props

### React 一切皆组件

React 应用由众多组件构成。组件是一块拥有自身逻辑与外观的 UI，它可以小到是一个按钮，也可以大到是整个页面。组件可以嵌套。

- React 通过组件来构建 UI。
- 组件拆分有利于代码组织和维护，尤其对于大型软件。
- JSX 中，组件标签首字母要大写。

代码演示：从项目的 `index.tsx` 开始，到 `<App>` 全都是组件。

### 组件就是一个函数

- React 早期是 Class 组件。
- 现在已被函数组件（FC, Function Component）全面取代。
- 函数组件输入 props，返回一段 JSX。

函数组件的编写要点：

- 用 TS 定义 props 类型。
- 可使用 TS 泛型。

```tsx
// 函数组件：输入 props，返回 JSX
type PersonProps = {
  name: string
  age: number
}

function Person(props: PersonProps) {
  return <div>{props.name} - {props.age}</div>
}
```

进阶问题：类型定义用 `type` 还是 `interface`？两者都可以实现类型定义的功能，用哪个都可以。

补充说明：

- 组件之间的数据传递不仅仅只有 props，课程后面还会继续讲解其他形式。
- 函数（回调）也可以当做属性来传递。

### props 单向数据流与默认值

- **props 单向数据流**：父组件通过 props 向子组件传数据，子组件只能读取、不能直接修改 props，数据流向是单向的。
- **默认 props（defaultProps）**：为 props 指定默认值，当父组件不传该属性时使用默认值。
- **props 类型约束（prop-types）**：React 早期用 `prop-types` 校验 props，现在更推荐用 TypeScript。

函数式组件中使用 props 并设置默认值：

```tsx
function Person(props) {
  return <div>{props.name} - {props.sex} - {props.age}</div>
}

Person.propTypes = {
  name: PropTypes.string.isRequired
}
Person.defaultProps = {
  sex: '女',
  age: 18
}
```

Class 组件中定义 props 类型与默认值：

```jsx
class Person extends React.Component {
  // 简写：静态属性
  static propTypes = {
    name: PropTypes.string.isRequired
  }
  static defaultProps = {
    sex: '女',
    age: 18
  }
  // ...
}
```

### prop-types 常用规则

常见类型：`PropTypes.number`、`PropTypes.string`、`PropTypes.bool`、`PropTypes.symbol`、`PropTypes.bigint`、`PropTypes.array`、`PropTypes.object`、`PropTypes.func`、`PropTypes.node`、`PropTypes.element`、`PropTypes.elementType`。

- **必填**：添加 `isRequired`，如 `PropTypes.number.isRequired`。
- **特定值**：只能是 `option1` 或 `option2`：

  ```js
  PropTypes.oneOf(['option1', 'option2'])
  ```

- **特定类型组合**：只能是某几个类型之一：

  ```js
  PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  ```

- **特定数组/对象结构**：

  ```js
  PropTypes.arrayOf(PropTypes.number)
  PropTypes.objectOf(PropTypes.number)
  PropTypes.shape({ name: PropTypes.string })
  ```

- **自定义校验规则**：

  ```js
  function (props, propName, componentName) {
    if (props[propName] !== 'customValue') {
      return new Error(`Invalid value for prop ${propName} in component ${componentName}`)
    }
  }
  ```

## 开发者工具

React 官方提供 Chrome 插件 **React Developer Tools**，用于调试 React 应用。

- 下载安装：Chrome 网上应用店搜索并安装 `react-developer-tools` 插件，安装地址为 `https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi`。
- 使用：用 Chrome 浏览器访问页面，可看到控制台出现 `Components` tab，其中包含：
  - 组件层级列表。
  - 各个组件的 props。
  - 可点击箭头选中页面中的组件。

## 【实战】开发 List 页

利用学到的 JSX 知识，开发一个 List 页：

- 使用判断（`&&`、三元表达式或函数封装）。
- 使用循环（`map`），并给列表项加上唯一 `key`（数据先不使用 state）。
- 使用属性（`className`、`style`）、事件（`onXxx`）、基础 CSS 样式。
- 先不使用组件。

```tsx
const list = [
  { id: 1, username: 'zhangsan', name: '张三' },
  { id: 2, username: 'lisi', name: '李四' },
  { id: 3, username: 'shuangyue', name: '双越' }
]

function ListPage() {
  return (
    <ul>
      {list.map((user) => (
        <li key={user.id} onClick={() => console.log(user.name)}>
          {user.name}
        </li>
      ))}
    </ul>
  )
}
```

## 创建项目（create-react-app）

通常使用脚手架来创建 React 项目：

```bash
npm i create-react-app -g
npx create-react-app react-ts-demo --template typescript

npm create vite@latest react-demo-vite --template react-ts
```

## 最小实现：看看"虚拟 DOM + 声明式更新"

到 `code/frontend/07-react` 运行 `mini-runtime.html`：用原生 JS 手写一个 <code>createElement</code> 把界面描述成普通对象，再通过 <code>render</code> 一次性渲染成真实 DOM；点按钮更新 count 后再次 <code>render</code>，界面自动变化——这正是 JSX 经过 Babel 编译后 + React 声明式更新的原始骨架。原理一句话：JSX 的 <code>&lt;h2&gt;...&lt;/h2&gt;</code> 编译后只是一个普通 JS 对象（虚拟 DOM），React 负责把它渲染到页面并在状态变化时重新渲染。

## 面试衔接

本节对应 `90-附录-面试体系` 的「React 基础」板块：JSX 规则与编译、组件与 Props 单向数据流、虚拟 DOM 是什么。做真题自测后，进入下一节 `02-React Hooks`。