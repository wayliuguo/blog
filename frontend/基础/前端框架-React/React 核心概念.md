# React 核心概念

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

> 示意片段（无配套脚本）

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

> 示意片段（无配套脚本）

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

> 示意片段（无配套脚本）

```jsx
function Hello() {
  if (flag) return <p>你好</p>
  else return <p>再见</p>
}

return <Hello></Hello>
```

### 循环

使用 `map` 做循环，并给每一项添加唯一的 `key`。

> 示意片段（无配套脚本）

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
- 内联样式 `style` 要写成 JS 对象（不能是字符串），key 采用**驼峰写法**，写法为 <code v-pre>style={{key: val}}</code>——外面第一个大括号是表达式，里面是对象。

> 示意片段（无配套脚本）

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
- 事件处理函数必须**传引用**而不是调用：`onClick={handleClick}`，不是 `onClick={handleClick()}`。
- 需要传参时包一层箭头函数：`onClick={() => handleClick(id)}`。代价是每次渲染都生成新函数，子组件用 `memo` 优化时要配合 `useCallback`。

> 示意片段（无配套脚本）

```jsx
function Toolbar() {
  const handleClick = () => console.log('clicked')
  const handleBlur = (event) => alert(event.target.value)

  return (
    <>
      <button onClick={handleClick}>绑定事件</button>
      <button onClick={() => handleClick(1)}>传参</button>
      <input onBlur={handleBlur} type="text" />
    </>
  )
}
```

通过 `event` 可以拿到发生事件的 DOM 元素对象，例如 `event.target`。需要阻止默认行为用 `event.preventDefault()`，阻止冒泡用 `event.stopPropagation()`。

### 显示 HTML 代码

JSX 默认会防止 XSS 注入攻击。如果确需显示一段 HTML 代码，可以使用：

> 示意片段（无配套脚本）

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

组件就是一个函数：**输入 props，返回一段 JSX**。

编写要点：用 TS 定义 props 类型，props 类型需要由调用方决定时用泛型。

> 示意片段（无配套脚本）

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

类型定义用 `type` 还是 `interface`：描述对象结构用 `interface`（支持声明合并与 `extends`），需要做联合、交叉、条件等类型编程时用 `type`。

补充说明：

- 组件之间的数据传递不仅仅只有 props，还有 Context、状态管理等方式。
- 函数（回调）也可以当做属性来传递。

### props 单向数据流与默认值

- **props 单向数据流**：父组件通过 props 向子组件传数据，子组件只能读取、不能直接修改 props。子组件要"改"数据，必须由父组件把修改函数一起传下来。
- **默认值**：用 ES6 默认参数，写在解构里。
- **类型约束**：用 TypeScript。`prop-types` 已不再维护，React 19 移除了对函数组件 `propTypes` / `defaultProps` 的支持，新项目不要再用。

> 示意片段（无配套脚本）

```tsx
type PersonProps = {
  name: string
  sex?: string
  age?: number
}

// 默认参数直接写在解构里，代替 defaultProps
function Person({ name, sex = '女', age = 18 }: PersonProps) {
  return <div>{name} - {sex} - {age}</div>
}
```

子组件需要修改数据时，把处理函数一并传下去，子组件只负责调用：

> 示意片段（无配套脚本）

```tsx
function Counter({ count, onAdd }: { count: number; onAdd: () => void }) {
  return <button onClick={onAdd}>{count}</button>
}
```

> 补充：`prop-types` 曾用于运行时校验（`PropTypes.string.isRequired`、`PropTypes.oneOf([...])` 等）。它的职责已被 TypeScript 的编译期检查取代——类型错误在编译期就暴露，不必等到运行时。

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

> 示意片段（无配套脚本）

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

## 创建项目

用脚手架创建 React 项目，现在以 **Vite** 为主：

> 示意片段（无配套脚本）

```bash
npm create vite@latest react-demo -- --template react-ts
```

> 补充：`create-react-app`（CRA）已停止维护，官方不再推荐用于新项目。它基于 webpack、启动慢且配置封闭，新项目直接用 Vite；需要 SSR / 路由约定等能力时考虑 Next.js。老项目迁移时主要工作是替换启动脚本、`index.html` 入口与环境变量前缀（`REACT_APP_` → `VITE_`）。

## 配套代码

本篇的可运行示例在仓库 `frontend/基础/前端框架-React/code/site/`。

| 文件 | 演示什么 | 对应小节 |
| --- | --- | --- |
| `./code/site/mini-runtime.html` | 手写极简渲染器 createElement + render + onUpdate，演示虚拟 DOM 与声明式更新 | JSX 语法与规则 · 组件与 Props |

启动方式：在 `code` 目录执行 `node server.js`（即 `npm start`），打开 `http://localhost:5180/`。

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[前端安全](../网络与浏览器/前端安全.md)
- 下一篇：[React Hooks](./React%20Hooks.md)
