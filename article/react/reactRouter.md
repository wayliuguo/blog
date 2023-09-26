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

4. 

