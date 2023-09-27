## 安装

```
npm i react-router-dom
```

## 基本使用

- 路由器（Router）种类
- NavLink、Link
- Routes
- 路由顺序与 Switch

1. 路由器（Router）种类

   - BrowserRouter：浏览器路由
   - HashRouter: 哈希路由
   - MemoryRouter: 不存储history，路由过程保存在内存中，适用于 React Native 这种非浏览器环境
   - NativeRouter：配合React Native 使用，多用于移动端
   - StaticRouter: 主要用于服务端渲染
   - 使用时需要把此组件包裹App组件

   ```
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

2. NavLink、Link

   - 其是一个导航链接组件，相当于`a`标签
   - 其与 Link 不同的点在于其是有`active`状态的，这里的`aboutActive`、`homeActive`是`active`时可以指定的类名

   ```
   import { NavLink } from 'react-router-dom'
   function App() {
     return (
     	<nav>
     		<NavLink activeClassName="aboutActive" className="list-group-item"  to="/about">About</NavLink>
               <NavLink activeClassName="homeActive" className="list-group-item" to="/home">Home</NavLink>
     	</nav>
     )
   }
   ```

3. Routes、Route

   - 可以将路由映射为对应的页面（组件）
   - 需要在`Routes`组件中使用`Route`组件来定义所有路由，该组件接受两个`props`
     - `path`：页面 URL 应导航到的路径，类似于 NavLink 组件的 to
     - `component`(V6: element): 页面导航到还路径加载的元素

   ```
   import { NavLink, Routes, Route } from 'react-router-dom'
   import About from './pages/About'
   import Home from './pages/Home'
   function App() {
     return (
     	<nav>
     		<NavLink activeClassName="aboutActive" className="list-group-item"  to="/about">About</NavLink>
           <NavLink activeClassName="homeActive" className="list-group-item" to="/home">Home</NavLink>
     	</nav>
     	<Routes>
     		<Route path="/about" component={About}></Route>
     		<Route path="/about" component={About}></Route>
     	</Routes>
     )
   }
   ```

4. 路由顺序与 Switch

   - 在v6 以前，我们必须按照一定的顺序来定义路由，以获得准确的渲染
   - 在v6以后，路由的定义顺序无关紧要

   以下代码在v5中，`/product/new`将匹配到第一个路由并渲染`Product`组件

   ```
   <Switch>
       <Route path="/product/:id" component={Product} />
       <Route path="/product/new" component={NewProduct} />
   </Switch>
   ```

   而v6中，将`<Switch>`替换成`<Routes>`组件，`/product/new`将匹配到这两个路由但只会渲染`NewProduct`，因为它是更具体的匹配

   ```
   <Routes>
       <Route path="/product/:id" component={Product} />
       <Route path="/product/new" component={NewProduct} />
   </Routes>
   ```

## 一般组件与路由组件

1. 写法不同

   ```
   // 一般组件
   <Demo />
   // 路由组件
   <Route path="/about" component={About} />
   ```

2. 接收到的props不同

   - 一般组件：写组件标签时传递了什么就接收什么

   - 路由组件：一定接收到三个固定属

   ```
   history:
       action: "PUSH"
       block: ƒ block(prompt)
       createHref: ƒ createHref(location)
       go: ƒ go(n)
       goBack: ƒ goBack()
       goForward: ƒ goForward()
       length: 10
       listen: ƒ listen(listener)
       location: {pathname: '/about', search: '', hash: '', state: undefined, key: '2yemhp'}
       push: ƒ push(path, state)
       replace: ƒ replace(path, state)
   	[[Prototype]]: Object
   location:
       hash: ""
       key: "2yemhp"
       pathname: "/about"
       search: ""
       state: undefined
       [[Prototype]]: Object
   match:
       isExact: true
       params: {}
       path: "/about"
       url: "/about"
       [[Prototype]]: Object
    staticContext: undefined
   ```
   

## 路由传参与查询参数

### v5

1. params传参

   ```
   <Link to={`/home/message/detail/${item.id}/${item.title}`}>{item.title}</Link>
   ...
   {/* 声明接收params参数 */}
   <Route path="/home/message/detail/:id/:title" component={Detail}></Route>
   ...
   // 对应路由组件中可以通过 props获取
   const { id, title} = this.props.match.params
   ```

2. search 传参

   ```
   {/* 向路由组件传递 search 参数 */}
   <Link to={`/home/message/detail/?id=${item.id}&title=${item.title}`}>{item.title}</Link>
   ...
   {/* search参数无需声明接收 */}
   <Route path="/home/message/detail" component={Detail}></Route>
   
   // 接收参数
   import qs from 'querystring'
   const { search } = this.props.location // ?id=???&title=???
   const {id, title} = qs.parse(search.slice(1))
   ```

3. state 传参

   ```
   /* 向路由组件传递 state 参数 */}
   <Link  to={{pathname:'/home/message/detail', state:{id:item.id,title:item.title}}}>{item.title}</Link>
   {/* state参数无需声明接收 */}
   <Route path="/home/message/detail" component={Detail}></Route>
   ```

   ```
   // 接收参数
   const {id, title} = this.props.location.state
   ```

### v6

1. Link 组件

   ```
   <Link to="/" state={"Form State"}>注册</Link>
   ...
   import { useLocation } from 'react-router-dom'
   let location = useLocation()
   console.log(location.state)
   ```

2. Navigate 组件

   ```
   <Navigate  to="/" state={"Form State"}>注册</Navigate >
   ...
   import { useLocation } from 'react-router-dom'
   let location = useLocation()
   console.log(location.state)
   ```

3. useNavigate 钩子

   ```
   const nav = useNavigate()
   // nav('/login?b=20')
   // nav({
       // pathname: '/login',
       // search: 'b=21'
   // })
   nav({
   	pathname: '/'
   	state: 'Form State'
   })
   ```

## 编程式路由导航

### v5

- push、replace及三种携带参数

```
<button onClick={() => this.pushShow(item.id, item.title)}>push 查看</button>
<button onClick={this.replaceShow(item.id, item.title)}>replace 查看</button>
```

```
replaceShow = (id, title) => {
	return () => {
    // 编写一段代码，让其实现跳转到Detail组件，且为replace跳转(携带 params 参数)
    this.props.history.replace(`/home/message/detail/${id}/${title}`)
    // 编写一段代码，让其实现跳转到Detail组件，且为replace跳转(携带 search 参数)
    // this.props.history.replace(`/home/message/detail/?id=${id}&title=${title}`)
    // 编写一段代码，让其实现跳转到Detail组件，且为replace跳转(携带 state 参数)
    // this.props.history.replace(`/home/message/detail`, {id, title}) 
    }
}
pushShow = (id, title) => {
	this.props.history.push((`/home/message/detail/${id}/${title}`))
}
```

- goBack、goForward、go

  ```
  <button onClick={this.back}>回退</button>
  <button onClick={this.forward}>前进</button>
  <button onClick={this.go}>跳转</button>
  ```

  ```
  back = () => {
  	this.props.history.goBack()
  }
  forward = () => {
  	this.props.history.goForward()
  }
  go = () => {
  	this.props.history.go(-2)
  }
  ```

### v6

- useNavigate 钩子

```
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

### v5

```
<Link to={`/home/message/detail/${item.id}/${item.title}`}>{item.title}</Link>
...
{/* 声明接收params参数 */}
<Route path="/home/message/detail/:id/:title" component={Detail}></Route>
...
// 对应路由组件中可以通过 props获取
const { id, title} = this.props.match.params
```

### v6

```
<Route path="/home/message/detail/:id/:title" component={Detail}></Route>
...
import { useParams } from 'react-router-dom'
const { id = '' } = useParams()
```

## 嵌套路由

```
export default class Home extends Component {
    render() {
        return (
            <div>
            <h3>我是Home的内容</h3>
            <div>
                <ul className="nav nav-tabs">
                  <li>
                    <NavLink to="/home/news">News</NavLink>
                  </li>
                  <li>
                    <NavLink to="/home/message">Message</NavLink>
                  </li>
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

## Route 配置

React Router v6 内置了一个`useRoutes` Hook,它在功能上等同于`<Routes>`，但它是使用JavaScript对象而不是`<Route>`元素来定义路由，这个对象具有与普通`<Route>`元素相同的属性，但不需要使用JSX来编写

`useRoutes`的返回值要么是一个有效的React元素（可以使用来渲染路由树），如果没有匹配项则返回null

假如应用中有一下路径：

```
/
/invoices
	:id
	pending
	complete
```

使用`<Route>`组件来定义路由将会是这样

```
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

使用`useRoutes`是利用 JavaScript 对象完成的，而不是使用 React元素（JSX）来声明路由

```
import { useRoutes } from 'react-router-dom'

const router = useRoutes([
    {
        path: '/',
        element: <Home />
    {
        path: '/invoices',
        element: <Invoices />,
        children: [
            {
                path: ':id',
                element: <Invoice />
            },
            {
                path: '/pending',
                element: <Pending />
            },
            {
                path: '/complete',
                element: <Complete />
            }
        ]
    }
])
```

