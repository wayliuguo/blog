# React 路由

React 是单页应用（SPA），页面的切换并不依赖浏览器刷新，而是通过路由在内存中维护"当前 URL"，并把不同路径映射到不同组件。`react-router-dom` 是 React 生态中最主流的路由方案，其主要职责是：根据 URL 渲染对应组件、在组件间跳转并传递参数、支持嵌套路由与动态路由。本文覆盖路由原理、React Router 基础用法（BrowserRouter / Route / Link / Navigate）、嵌套路由、动态路由、路由守卫、懒加载与代码分割，以及路由实战要点，帮助你建立 React 路由的完整知识框架。

## 路由原理

前端路由的核心是在**不刷新页面**的前提下，实现 URL 与页面内容的一一对应。它的本质是：监听 URL 变化 → 解析出路径 → 匹配到对应组件 → 渲染到页面容器中。

- **前端路由 vs 后端路由**：后端路由由服务器根据路径返回不同页面，会触发整页刷新；前端路由由 JS 拦截并响应路径变化，只替换部分内容，用户体验更流畅。
- **哈希（hash）路由**：URL 形如 `http://xxx/#/about`，改变 `#` 后面的 `hash` 不会触发浏览器向服务器发请求，因此兼容性最好（老旧浏览器也能用）。
- **History 路由**：URL 形如 `http://xxx/about`，基于 HTML5 的 `History API`（`pushState` / `replaceState` / `popstate`），URL 更美观，但刷新时需服务端配合把请求回落到入口页面，否则会 404。

React Router 正是基于这两种思路抽象出不同的 Router 组件供我们选择。

## React Router 基础

### 安装

> 示意片段（无配套脚本）

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

> 示意片段（无配套脚本）

```jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'
import App from './App';

// React 18+ 用 createRoot 挂载（React 17 及以前的 ReactDOM.render 已移除）
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

### Link 与 NavLink

`Link` 相当于 `a` 标签，是声明式导航的核心组件。`NavLink` 是 `Link` 的升级版，多了一个 `active` 激活状态，可以在被选中时设置指定类名，常用于导航栏高亮当前菜单。

> 示意片段（无配套脚本）

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

> 示意片段（无配套脚本）

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

### 路由顺序与匹配规则（V5 Switch → V6 Routes）

在 V6 以前（V5），路由必须**按照一定顺序**定义才能准确渲染。例如下面这段代码，在 V5 中 `/product/new` 会匹配到第一个路由并渲染 `Product`，这显然不是我们期望的：

> 示意片段（无配套脚本）

```jsx
<Switch>
    <Route path="/product/:id" component={Product} />
    <Route path="/product/new" component={NewProduct} />
</Switch>
```

在 V6 中，`<Switch>` 被替换为 `<Routes>`。`Routes` 会根据路径优先级（更具体的路径优先）来自动选择最匹配的路由，因此**定义顺序无关紧要**。同样的配置在 V6 中，`/product/new` 只会渲染 `NewProduct`：

> 示意片段（无配套脚本）

```jsx
<Routes>
    <Route path="/product/:id" element={<Product />} />
    <Route path="/product/new" element={<NewProduct />} />
</Routes>
```

## 一般组件与路由组件

路由组件与一般组件虽然都是组件，但有两点明显区别：

1. **写法不同**：一般组件直接当作标签使用；路由组件绑在 `Route` 的 `path` 上。

> 示意片段（无配套脚本）

```jsx
// 一般组件
<Demo />
// 路由组件
<Route path="/about" element={<About />} />
```

2. **接收路由信息的方式不同**
   - 一般组件：写组件标签时传了什么 props 就接收什么。
   - 路由组件：路径参数、查询串、location 这些路由信息不在 props 里，而是在组件内部用 `useParams` / `useSearchParams` / `useLocation` 取。

> 迁移对照：V5 会向路由组件注入 `history`、`location`、`match` 三个 props，V6 取消了这一注入，统一改用 Hook——好处是路由信息不再依赖组件层级，任意深度的子组件都能直接取到。

## 路由传参与查询参数

三种传参方式各对应一个 Hook：params 用 `useParams`、查询串用 `useSearchParams`、state 用 `useLocation`。

> 迁移对照：V5 会把 `history` / `location` / `match` 三个对象注入路由组件的 props，V6 不再注入，改为在组件内部用 Hook 取。

### 1. params 传参

把参数拼进 URL 路径，路由上要声明占位符：

> 示意片段（无配套脚本）

```jsx
<Link to={`/home/message/detail/${item.id}/${item.title}`}>{item.title}</Link>

{/* 声明接收 params 参数 */}
<Route path="/home/message/detail/:id/:title" element={<Detail />} />
```

> 示意片段（无配套脚本）

```jsx
import { useParams } from 'react-router-dom'

const { id = '', title = '' } = useParams()
```

### 2. search（查询串）传参

参数拼在查询串中，路由无需声明接收：

> 示意片段（无配套脚本）

```jsx
<Link to={`/home/message/detail?id=${item.id}&title=${item.title}`}>{item.title}</Link>
<Route path="/home/message/detail" element={<Detail />} />
```

> 示意片段（无配套脚本）

```jsx
import { useSearchParams } from 'react-router-dom'

const [searchParams] = useSearchParams()
const id = searchParams.get('id')
const title = searchParams.get('title')
```

`useSearchParams` 用法类似 `useState`：第二个返回值用于改写查询串，`setSearchParams({ id: '1' })` 会触发一次导航。

### 3. state 传参

参数放在 `state` 中，不在 URL 上体现，同样无需声明接收：

> 示意片段（无配套脚本）

```jsx
<Link to="/home/message/detail" state={{ id: item.id, title: item.title }}>{item.title}</Link>
<Route path="/home/message/detail" element={<Detail />} />
```

> 示意片段（无配套脚本）

```jsx
import { useLocation } from 'react-router-dom'

const { state } = useLocation() // { id, title }
```

编程式导航同样能携带 state：`navigate('/detail', { state: { id: 1 } })`。重定向组件 `Navigate` 也支持：` <Navigate to="/" state="Form State" />`。

## 编程式路由导航

声明式（`Link`）常用于"点击后跳转"；遇到"点击后先做处理再跳转"的场景，用 `useNavigate`：

- `navigate(to)`：往历史栈压入一条新记录，可以返回（对应 V5 的 `push`）。
- `navigate(to, { replace: true })`：替换当前记录，不新增历史（对应 `replace`）。
- `navigate(-1)` / `navigate(1)` / `navigate(-2)`：回退、前进、跳转 n 步（对应 `goBack` / `goForward` / `go`）。

> 示意片段（无配套脚本）

```jsx
import { FC } from 'react'
import { useNavigate, Link } from 'react-router-dom'

const Message: FC = () => {
  const navigate = useNavigate()
  const item = { id: 1, title: '消息一' }
  const to = `/home/message/detail/${item.id}/${item.title}`

  return (
    <div>
      <p>Message</p>
      <button onClick={() => navigate(to)}>push 查看</button>
      <button onClick={() => navigate(to, { replace: true })}>replace 查看</button>
      <button onClick={() => navigate(-1)}>回退</button>
      <button onClick={() => navigate(1)}>前进</button>
      <button onClick={() => navigate(-2)}>跳转</button>
      <Link to="/register">注册</Link>
    </div>
  )
}

export default Message
```

> 迁移对照：V5 通过 `this.props.history.push/replace/goBack` 实现同样的事，V6 统一收敛到 `navigate`，且不再依赖组件 props。

## 动态路由

当路由参数不确定、需要根据用户操作动态变化时，使用动态路由——路径用 `:` 声明占位符，参数用 `useParams` 读取：

> 示意片段（无配套脚本）

```jsx
<Link to={`/home/message/detail/${item.id}/${item.title}`}>{item.title}</Link>
<Route path="/home/message/detail/:id/:title" element={<Detail />} />
```

> 示意片段（无配套脚本）

```jsx
import { useParams } from 'react-router-dom'

const { id = '', title = '' } = useParams()
```

需要读取 URL 上的查询参数时用 `useSearchParams`，用法类似 `useState`。

## 嵌套路由

嵌套路由用于实现页面的二级导航结构。V6 中在父路由下继续写 `<Route>`，子路径写相对路径即可，父组件用 `<Outlet />` 作为子路由的渲染出口。

> 示意片段（无配套脚本）

```jsx
import { NavLink, Outlet } from 'react-router-dom'

function Home() {
  return (
    <div>
      <h3>我是 Home 的内容</h3>
      <ul className="nav nav-tabs">
        <li><NavLink to="news">News</NavLink></li>
        <li><NavLink to="message">Message</NavLink></li>
      </ul>
      {/* 子路由渲染在这里 */}
      <Outlet />
    </div>
  )
}
```

路由表一侧：

> 示意片段（无配套脚本）

```jsx
<Routes>
  <Route path="/home" element={<Home />}>
    <Route path="news" element={<News />} />
    <Route path="message" element={<Message />} />
  </Route>
</Routes>
```

> 迁移对照：V5 用 `<Switch>` 包裹子路由、子路径要写全父前缀、且匹配结果与定义顺序有关；V6 的 `<Routes>` 按最具体匹配、顺序无关，子路由写相对路径。

### Route 配置（useRoutes）

React Router V6 内置了 `useRoutes` Hook，它在功能上等同于 `<Routes>`，但使用 **JavaScript 对象**而非 `<Route>` 元素定义路由，字段与 `<Route>` 路由一致，只是不再用 JSX 编写。其返回值是要渲染的有效 React 元素（没有匹配项时返回 `null`），非常适合把路由集中到一处配置。

假如应用中有这些路径：

> 示意片段（无配套脚本）

```
/
/invoices
  :id
  pending
  complete
```

用 `<Route>` 组件定义：

> 示意片段（无配套脚本）

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

> 示意片段（无配套脚本）

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

> 示意片段（无配套脚本）

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

> 示意片段（无配套脚本）

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

## 小结

- React 路由
  - 路由原理
    - 前端路由 vs 后端路由
    - 哈希（hash）路由
    - History 路由（History API）
  - React Router 基础
    - 安装 `react-router-dom`
    - Router 种类（`BrowserRouter`、`HashRouter`、`MemoryRouter`、`NativeRouter`、`StaticRouter`）
    - `Link` 与 `NavLink`
    - `Routes` 与 `Route`
    - 路由顺序与 `Switch`（V5 → V6）
  - 一般组件与路由组件
    - 写法区别
    - props 区别（`history`、`location`、`match`）
    - V6 改用 Hooks
  - 路由传参与查询参数
    - V5：params / search / state
    - V6：`useLocation`、`Navigate`、`useNavigate`
  - 编程式路由导航
    - V5：`push`、`replace`、`goBack` 等
    - V6：`useNavigate`
  - 动态路由
    - V5：`props.match.params`
    - V6：`useParams`、`useSearchParams`
  - 嵌套路由
    - 子路由带父路径前缀
    - `useRoutes` 对象配置
  - 路由守卫
    - 条件渲染 + HOC / 自定义 Hook
    - `RequireAuth`、重定向
  - 懒加载与代码分割
    - `React.lazy` + `Suspense`
    - 动态 `import` 拆 chunk
  - 路由实战
    - 路由规划
    - Layout 模板
    - 落地步骤（页面、Layout、路由配置、功能串联）

## 配套代码

本篇的可运行示例在仓库 `frontend/基础/前端框架-React/code/site/`。

| 文件 | 演示什么 | 对应小节 |
| --- | --- | --- |
| `./code/site/vdom-diff.html` | 路由切换为何不是整页重建（轻量虚拟 DOM diff） | 路由原理 |

启动方式：在 `code` 目录执行 `node server.js`（即 `npm start`），打开 `http://localhost:5180/`。

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[React Hooks](./React%20Hooks.md)
- 下一篇：[React 状态管理](./React%20状态管理.md)
