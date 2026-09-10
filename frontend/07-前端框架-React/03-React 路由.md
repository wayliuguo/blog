# React 路由

React 是单页应用（SPA），页面的切换并不依赖浏览器刷新，而是通过路由在内存中维护"当前 URL"，并把不同路径映射到不同组件。`react-router-dom` 是 React 生态中最主流的路由方案，其主要职责是：根据 URL 渲染对应组件、在组件间跳转并传递参数、支持嵌套路由与动态路由。本文覆盖路由原理、React Router 基础用法（BrowserRouter / Route / Link / Navigate）、嵌套路由、动态路由、路由守卫、懒加载与代码分割，以及路由实战要点，帮助你建立 React 路由的完整知识框架。

> 级别：初级→中级

按本书四层推进：

- **入门使用**：路由原理（hash / history）、BrowserRouter、Link、Routes/Route、Navigate；
- **进阶**：V5 与 V6 差异、useRoutes 对象路由、路由守卫、懒加载与代码分割；
- **实战**：以问卷系统为例，做从"路由规划 → Layout → 落地"的完整设计；
- **最小实现掌握原理**：到 `code/frontend/07-react` 运行 `mini-runtime.html` 与 `vdom-diff.html`，理解"切换路由本质就是状态变化后重新渲染界面"，而 diff 让这次更新尽量小。

## 路由原理

前端路由的核心是在**不刷新页面**的前提下，实现 URL 与页面内容的一一对应。它的本质是：监听 URL 变化 → 解析出路径 → 匹配到对应组件 → 渲染到页面容器中。

- **前端路由 vs 后端路由**：后端路由由服务器根据路径返回不同页面，会触发整页刷新；前端路由由 JS 拦截并响应路径变化，只替换部分内容，用户体验更流畅。
- **哈希（hash）路由**：URL 形如 `http://xxx/#/about`，改变 `#` 后面的 `hash` 不会触发浏览器向服务器发请求，因此兼容性最好（老旧浏览器也能用）。
- **History 路由**：URL 形如 `http://xxx/about`，基于 HTML5 的 `History API`（`pushState` / `replaceState` / `popstate`），URL 更美观，但刷新时需服务端配合把请求回落到入口页面，否则会 404。

React Router 正是基于这两种思路抽象出不同的 Router 组件供我们选择。

## React Router 基础

### 安装

```
npm i react-router-dom
```

### Router 的种类

Router 组件需要把 `App` 包裹起来，它决定了路由使用哪种策略：

- **BrowserRouter**：浏览器路由（History 模式），URL 最干净，生产环境需要服务端配合。
- **HashRouter**：哈希路由，通过 `#` 后的内容路由，兼容性最好，无需服务端配置。
- **MemoryRouter**：不存储于 history，路由过程保存在内存中，适用于 React Native 等非浏览器环境。
- **NativeRouter**：配合 React Native 使用，多用于移动端。
- **StaticRouter**：主要用于服务端渲染（SSR）。

以 BrowserRouter 为例，在入口处包裹根组件：

```jsx
import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom'
import App from './App';

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById('root')
);
```

### Link 与 NavLink

`Link` 相当于 `a` 标签，是声明式导航的核心组件。`NavLink` 是 `Link` 的升级版，多了一个 `active` 激活状态，可以在被选中时设置指定类名，常用于导航栏高亮当前菜单。

```jsx
import { NavLink } from 'react-router-dom'

function App() {
  return (
    <nav>
      <NavLink activeClassName="aboutActive" className="list-group-item" to="/about">About</NavLink>
      <NavLink activeClassName="homeActive" className="list-group-item" to="/home">Home</NavLink>
    </nav>
  )
}
```

### Routes 与 Route

`Routes` 是一个容器，`Route` 用它来映射"路径 → 组件"。每个 `Route` 主要接收两个 props：

- `path`：页面 URL 应导航到的路径，类似于 `NavLink` 的 `to`。
- `element`（V6；V5 为 `component`）：导航到该路径时加载的元素（组件）。

```jsx
import { NavLink, Routes, Route } from 'react-router-dom'
import About from './pages/About'
import Home from './pages/Home'

function App() {
  return (
    <>
      <nav>
        <NavLink to="/about">About</NavLink>
        <NavLink to="/home">Home</NavLink>
      </nav>
      <Routes>
        <Route path="/about" element={<About />}></Route>
        <Route path="/home" element={<Home />}></Route>
      </Routes>
    </>
  )
}
```

### 路由顺序与 Switch

在 V6 以前（V5），路由必须**按照一定顺序**定义才能准确渲染。例如下面这段代码，在 V5 中 `/product/new` 会匹配到第一个路由并渲染 `Product`，这显然不是我们期望的：

```jsx
<Switch>
    <Route path="/product/:id" component={Product} />
    <Route path="/product/new" component={NewProduct} />
</Switch>
```

在 V6 中，`<Switch>` 被替换为 `<Routes>`。`Routes` 会根据路径优先级（更具体的路径优先）来自动选择最匹配的路由，因此**定义顺序无关紧要**。同样的配置在 V6 中，`/product/new` 只会渲染 `NewProduct`：

```jsx
<Routes>
    <Route path="/product/:id" element={<Product />} />
    <Route path="/product/new" element={<NewProduct />} />
</Routes>
```

## 一般组件与路由组件

路由组件与一般组件虽然都是组件，但有两点明显区别：

1. **写法不同**：一般组件直接当作标签使用；路由组件绑在 `Route` 的 `path` 上。

```jsx
// 一般组件
<Demo />
// 路由组件
<Route path="/about" component={About} />
```

2. **接收到的 props 不同**
   - 一般组件：写组件标签时传了什么 props 就接收什么。
   - 路由组件：一定会额外接收到三个固定属性 `history`、`location`、`match`（V5 写法）。

```js
// 路由组件接收到的固定 props（V5）
history: {
  action: "PUSH",
  go: fn, goBack: fn, goForward: fn,
  length: 10,
  location: { pathname, search, hash, state, key },
  push: fn, replace: fn,
  ...
}
location: {
  hash: "", key: "...", pathname: "/about", search: "", state: undefined
}
match: {
  isExact: true, params: {}, path: "/about", url: "/about"
}
staticContext: undefined
```

需要注意的是，V6 中路由组件不再自动注入这些 props，而是改由 `useParams`、`useLocation`、`useNavigate` 等 Hook 在组件内部获取。

## 路由传参与查询参数

路由之间的参数传递有三种方式，V5 与 V6 的写法有所差异。

### V5

**1. params 传参**：把参数拼进 URL 路径中。

```jsx
<Link to={`/home/message/detail/${item.id}/${item.title}`}>{item.title}</Link>

{/* 声明接收 params 参数 */}
<Route path="/home/message/detail/:id/:title" component={Detail}></Route>
```

```js
// 路由组件中通过 props.match.params 获取
const { id, title } = this.props.match.params
```

**2. search 传参**：参数拼接在 URL 查询串中，无需在 Route 上声明接收。

```jsx
<Link to={`/home/message/detail/?id=${item.id}&title=${item.title}`}>{item.title}</Link>
<Route path="/home/message/detail" component={Detail}></Route>
```

```js
import qs from 'querystring'
const { search } = this.props.location // ?id=???&title=???
const { id, title } = qs.parse(search.slice(1))
```

**3. state 传参**：参数放在 `state` 对象中，不在 URL 上体现，同样无需声明接收。

```jsx
const linkState = { pathname: '/home/message/detail', state: { id: item.id, title: item.title } }
<Link to={linkState}>{item.title}</Link>
<Route path="/home/message/detail" component={Detail}></Route>
```

```js
// 接收参数
const { id, title } = this.props.location.state
```

### V6

V6 中可使用 `useLocation`、`useNavigate` 等 Hook 实现同样的能力。

**1. Link 组件携带 state**

```jsx
<Link to="/" state="Form State">注册</Link>
```

```jsx
import { useLocation } from 'react-router-dom'
let location = useLocation()
console.log(location.state)
```

**2. Navigate 组件**：`Navigate` 是 V6 新增的重定向组件，也可携带 state。

```jsx
<Navigate to="/" state="Form State">注册</Navigate>
```

```jsx
import { useLocation } from 'react-router-dom'
let location = useLocation()
console.log(location.state)
```

**3. useNavigate 钩子**：在事件回调中以编程方式跳转并携带参数。

```jsx
const nav = useNavigate()
// nav('/login?b=20')
// nav({ pathname: '/login', search: 'b=21' })
nav({ pathname: '/', state: 'Form State' })
```

## 编程式路由导航

声明式（`Link`）常用于"点击后跳转"，遇到"点击后先做一些处理再跳转"的场景，则需使用编程式导航。

### V5

- `push`：往历史栈里压入一条新记录，可以返回；`replace`：替换当前记录，不新增历史。
- `goBack`、`goForward`、`go(n)`：回退、前进、跳转 n 步。

```jsx
<button onClick={() => this.pushShow(item.id, item.title)}>push 查看</button>
<button onClick={this.replaceShow(item.id, item.title)}>replace 查看</button>
<button onClick={this.back}>回退</button>
<button onClick={this.forward}>前进</button>
<button onClick={this.go}>跳转</button>
```

```jsx
replaceShow = (id, title) => {
  return () => {
    // params 参数
    this.props.history.replace(`/home/message/detail/${id}/${title}`)
    // search 参数
    // this.props.history.replace(`/home/message/detail/?id=${id}&title=${title}`)
    // state 参数
    // this.props.history.replace(`/home/message/detail`, { id, title })
  }
}
pushShow = (id, title) => {
  this.props.history.push(`/home/message/detail/${id}/${title}`)
}
back = () => this.props.history.goBack()
forward = () => this.props.history.goForward()
go = () => this.props.history.go(-2)
```

### V6

V6 使用 `useNavigate` 钩子统一实现编程式导航：

```jsx
import { FC } from 'react'
import { useNavigate, Link } from 'react-router-dom'

const Home: FC = () => {
  const nav = useNavigate()
  const clickHandler = () => {
    // nav('/login?b=20')
    nav({
      pathname: '/login',
      search: 'b=21'
    })
  }
  return (
    <div>
      <p>Home</p>
      <div>
        <button onClick={clickHandler}>登录</button>
        <Link to="/register">注册</Link>
      </div>
    </div>
  )
}

export default Home
```

## 动态路由

当路由参数不确定、需要根据用户操作动态变化时，使用动态路由（即通过 params 传参，路径省略号标识）。

### V5

```jsx
<Link to={`/home/message/detail/${item.id}/${item.title}`}>{item.title}</Link>

{/* 声明接收 params 参数 */}
<Route path="/home/message/detail/:id/:title" component={Detail}></Route>
```

```jsx
// 路由组件中通过 props.match.params 获取
const { id, title } = this.props.match.params
```

### V6

V6 通过 `useParams` 获取动态参数：

```jsx
<Route path="/home/message/detail/:id/:title" component={Detail}></Route>
```

```jsx
import { useParams } from 'react-router-dom'
const { id = '' } = useParams()
```

另外，若需要读取 URL 上的 query 查询参数，V6 提供了 `useSearchParams` Hook，用法类似 React 的 `useState`。

## 嵌套路由

嵌套路由用于实现页面的二级导航结构。父组件中通过 `Route`（V5 用 `Switch`）定义子路由，需要注意子路径要带上父路径前缀。

```jsx
export default class Home extends Component {
  render() {
    return (
      <div>
        <h3>我是Home的内容</h3>
        <div>
          <ul className="nav nav-tabs">
            <li><NavLink to="/home/news">News</NavLink></li>
            <li><NavLink to="/home/message">Message</NavLink></li>
          </ul>
          <Switch>
            <Route path="/home/news" component={News} />
            <Route path="/home/message" component={Message} />
          </Switch>
        </div>
      </div>
    )
  }
}
```

### Route 配置（useRoutes）

React Router V6 内置了 `useRoutes` Hook，它在功能上等同于 `<Routes>`，但使用 **JavaScript 对象**而非 `<Route>` 元素定义路由，字段与 `<Route>` 路由一致，只是不再用 JSX 编写。其返回值是要渲染的有效 React 元素（没有匹配项时返回 `null`），非常适合把路由集中到一处配置。

假如应用中有这些路径：

```
/
/invoices
  :id
  pending
  complete
```

用 `<Route>` 组件定义：

```jsx
export default function App() {
  return (
    <div>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/invoices" element={<Invoices />}>
          <Route path=":id" element={<Invoice />} />
          <Route path="pending" element={<Pending />} />
          <Route path="complete" element={<Complete />} />
        </Route>
      </Routes>
    </div>
  )
}
```

用 `useRoutes` 以对象方式定义，等同效果，且便于集中管理与逻辑扩展：

```jsx
import { useRoutes } from 'react-router-dom'

const router = useRoutes([
  {
    path: '/',
    element: <Home />
  },
  {
    path: '/invoices',
    element: <Invoices />,
    children: [
      { path: ':id', element: <Invoice /> },
      { path: 'pending', element: <Pending /> },
      { path: 'complete', element: <Complete /> }
    ]
  }
])
```

## 路由守卫

路由守卫用于在进入某些页面之前做**权限校验**（比如判断是否已登录），未通过则重定向到登录页或 404。React Router 没有像 Vue Router 那样的内置守卫钩子，通常采用**"条件渲染 + 高阶组件（HOC）或自定义 Hook"**来实现。

一个常见的自定义守卫 Hook 示例：

```jsx
import { useNavigate } from 'react-router-dom'

// 判断是否登录
function useAuth() {
  return !!localStorage.getItem('token')
}

// 守卫组件：未登录则跳转登录页
function RequireAuth({ children }) {
  const isLogin = useAuth()
  const navigate = useNavigate()
  if (!isLogin) {
    navigate('/login', { replace: true })
    return null
  }
  return children
}

// 使用：把受保护的页面包裹起来
<Routes>
  <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
</Routes>
```

要点：
- 守卫的产物通常是**跳转逻辑 + 条件渲染**，可抽成独立 Hook（如 `useNavPage`）供多个页面复用。
- 使用 `<Navigate to="/login" replace />` 或 `navigate` 进行重定向。
- 守卫逻辑应放在路由配置层，避免业务组件各写各的。

## 懒加载与代码分割

随着项目变大，一次性打包所有页面会导致首屏体积过大。可以通过 React 的 `React.lazy` + `Suspense` 结合路由做**按需加载**，实现代码分割，仅在真正访问某个路由时才加载对应组件包。

```jsx
import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

const Home = lazy(() => import('./pages/Home'))
const About = lazy(() => import('./pages/About'))

function App() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Suspense>
  )
}
```

- `lazy(() => import(...))`：动态 import 返回一个组件，构建工具会将其拆分成独立 chunk。
- `Suspense` 的 `fallback`：在 chunk 未加载完成时显示的兜底内容（如 loading 态）。

## 路由实战

以一个问卷系统为例，梳理路由设计到落地的完整流程，涉及三个层面。

### 1. 页面对应的路由规划

- 首页 `/`
- 登录 `/login`
- 注册 `/register`
- 问卷管理
  - 我的问卷 `/manage/list`
  - 星标问卷 `/manage/star`
  - 回收站 `/manage/trash`
- 问卷详情
  - 编辑问卷 `/question/edit/:id` （动态路由）
  - 问卷统计 `/question/stat/:id`
- 404 兜底页

### 2. Layout 模板

不同页面使用不同布局壳子（Layout），把公共的导航、侧边栏抽到 Layout 中，子页面只需渲染自己的内容：

- MainLayout：主布局
- ManageLayout：问卷管理布局
- QuestionLayout：问卷编辑/统计布局

### 3. 落地步骤

1. **增加页面**：新建各页面文件，如 `pages/Home.tsx`、`pages/Login.tsx`、`pages/Register.tsx`、`pages/NotFoundPage.tsx`、`pages/manage/List.tsx`、`pages/manage/Star.tsx`、`pages/manage/Delete.tsx`、`pages/question/Edit.tsx`、`pages/question/Stat.tsx`。
2. **增加 Layout**：在 `layouts` 目录下为每个布局壳子写文件，先不管 antd 组件和样式，把 JSX 结构写出来。
3. **配置路由**：安装 `react-router-dom`，参考 `router/index.ts` 集中配置路由组件（可配合 `useRoutes`），同时调整 `App.ts`，将 Router 与 Layout 接入。
4. **路由功能串联**：
   - 跳转：Home 页面使用 `useNavigate` 和 `<Link>`。
   - 获取动态路由参数：Edit 页面使用 `useParams` 读取 `:id`。
   - 获取 query：Home 页面使用 `useSearchParams`。
   - 权限：MainLayout / QuestionLayout 中接入守卫逻辑（`useNavPage`），未登录跳转登录页。

这样一来，单页应用中"URL → 页面 → 布局 → 权限"的整条链路就打通了，后续新增页面只需"加页面 + 加路由 + 挂布局"三步。

## 最小实现：路由的本质是"状态决定界面"

前端路由没有神秘之处：它不过是监听 URL（hash 或 history）变化，把解析出的路径存进应用状态，再触发一次渲染。到 `code/frontend/07-react` 运行 `mini-runtime.html` 感受"状态一变就重渲染界面"，再对照 `vdom-diff.html` 理解为什么切换页面不是整页重建，而是尽量只改变化的部分。原理一句话：路由 = 把 URL 变成状态 + 按状态渲染对应组件。

## 面试衔接

本节对应 `90-附录-面试体系` 的「React 路由」板块：hash vs history 路由、V5 与 V6 差异、动态路由与传参（params / search / state）、路由守卫、懒加载。做真题自测后，进入下一节 `04-React 状态管理`。