import{_ as s,o as a,c as n,U as l}from"./chunks/framework.9adb0f96.js";const y=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"article/react/reactRouter.md","filePath":"article/react/reactRouter.md","lastUpdated":1695802073000}'),t={name:"article/react/reactRouter.md"},e=l(`<h2 id="安装" tabindex="-1">安装 <a class="header-anchor" href="#安装" aria-label="Permalink to &quot;安装&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm i react-router-dom</span></span></code></pre></div><h2 id="基本使用" tabindex="-1">基本使用 <a class="header-anchor" href="#基本使用" aria-label="Permalink to &quot;基本使用&quot;">​</a></h2><ul><li>路由器（Router）种类</li><li>NavLink、Link</li><li>Routes</li><li>路由顺序与 Switch</li></ul><ol><li><p>路由器（Router）种类</p><ul><li>BrowserRouter：浏览器路由</li><li>HashRouter: 哈希路由</li><li>MemoryRouter: 不存储history，路由过程保存在内存中，适用于 React Native 这种非浏览器环境</li><li>NativeRouter：配合React Native 使用，多用于移动端</li><li>StaticRouter: 主要用于服务端渲染</li><li>使用时需要把此组件包裹App组件</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">import React from &#39;react&#39;;</span></span>
<span class="line"><span style="color:#A6ACCD;">import ReactDOM from &#39;react-dom&#39;;</span></span>
<span class="line"><span style="color:#A6ACCD;">import { BrowserRouter } from &#39;react-router-dom&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">import App from &#39;./App&#39;;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">ReactDOM.render(</span></span>
<span class="line"><span style="color:#A6ACCD;">  &lt;React.StrictMode&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;BrowserRouter&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">      &lt;App /&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;/BrowserRouter&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">  &lt;/React.StrictMode&gt;,</span></span>
<span class="line"><span style="color:#A6ACCD;">  document.getElementById(&#39;root&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">);</span></span></code></pre></div></li><li><p>NavLink、Link</p><ul><li>其是一个导航链接组件，相当于<code>a</code>标签</li><li>其与 Link 不同的点在于其是有<code>active</code>状态的，这里的<code>aboutActive</code>、<code>homeActive</code>是<code>active</code>时可以指定的类名</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">import { NavLink } from &#39;react-router-dom&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">function App() {</span></span>
<span class="line"><span style="color:#A6ACCD;">  return (</span></span>
<span class="line"><span style="color:#A6ACCD;">  	&lt;nav&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">  		&lt;NavLink activeClassName=&quot;aboutActive&quot; className=&quot;list-group-item&quot;  to=&quot;/about&quot;&gt;About&lt;/NavLink&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            &lt;NavLink activeClassName=&quot;homeActive&quot; className=&quot;list-group-item&quot; to=&quot;/home&quot;&gt;Home&lt;/NavLink&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">  	&lt;/nav&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">  )</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div></li><li><p>Routes、Route</p><ul><li>可以将路由映射为对应的页面（组件）</li><li>需要在<code>Routes</code>组件中使用<code>Route</code>组件来定义所有路由，该组件接受两个<code>props</code><ul><li><code>path</code>：页面 URL 应导航到的路径，类似于 NavLink 组件的 to</li><li><code>component</code>(V6: element): 页面导航到还路径加载的元素</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">import { NavLink, Routes, Route } from &#39;react-router-dom&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">import About from &#39;./pages/About&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">import Home from &#39;./pages/Home&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">function App() {</span></span>
<span class="line"><span style="color:#A6ACCD;">  return (</span></span>
<span class="line"><span style="color:#A6ACCD;">  	&lt;nav&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">  		&lt;NavLink activeClassName=&quot;aboutActive&quot; className=&quot;list-group-item&quot;  to=&quot;/about&quot;&gt;About&lt;/NavLink&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;NavLink activeClassName=&quot;homeActive&quot; className=&quot;list-group-item&quot; to=&quot;/home&quot;&gt;Home&lt;/NavLink&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">  	&lt;/nav&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">  	&lt;Routes&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">  		&lt;Route path=&quot;/about&quot; component={About}&gt;&lt;/Route&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">  		&lt;Route path=&quot;/about&quot; component={About}&gt;&lt;/Route&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">  	&lt;/Routes&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">  )</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div></li><li><p>路由顺序与 Switch</p><ul><li>在v6 以前，我们必须按照一定的顺序来定义路由，以获得准确的渲染</li><li>在v6以后，路由的定义顺序无关紧要</li></ul><p>以下代码在v5中，<code>/product/new</code>将匹配到第一个路由并渲染<code>Product</code>组件</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;Switch&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;Route path=&quot;/product/:id&quot; component={Product} /&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;Route path=&quot;/product/new&quot; component={NewProduct} /&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/Switch&gt;</span></span></code></pre></div><p>而v6中，将<code>&lt;Switch&gt;</code>替换成<code>&lt;Routes&gt;</code>组件，<code>/product/new</code>将匹配到这两个路由但只会渲染<code>NewProduct</code>，因为它是更具体的匹配</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;Routes&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;Route path=&quot;/product/:id&quot; component={Product} /&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;Route path=&quot;/product/new&quot; component={NewProduct} /&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/Routes&gt;</span></span></code></pre></div></li></ol><h2 id="一般组件与路由组件" tabindex="-1">一般组件与路由组件 <a class="header-anchor" href="#一般组件与路由组件" aria-label="Permalink to &quot;一般组件与路由组件&quot;">​</a></h2><ol><li><p>写法不同</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 一般组件</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;Demo /&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">// 路由组件</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;Route path=&quot;/about&quot; component={About} /&gt;</span></span></code></pre></div></li><li><p>接收到的props不同</p><ul><li><p>一般组件：写组件标签时传递了什么就接收什么</p></li><li><p>路由组件：一定接收到三个固定属</p></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">history:</span></span>
<span class="line"><span style="color:#A6ACCD;">    action: &quot;PUSH&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">    block: ƒ block(prompt)</span></span>
<span class="line"><span style="color:#A6ACCD;">    createHref: ƒ createHref(location)</span></span>
<span class="line"><span style="color:#A6ACCD;">    go: ƒ go(n)</span></span>
<span class="line"><span style="color:#A6ACCD;">    goBack: ƒ goBack()</span></span>
<span class="line"><span style="color:#A6ACCD;">    goForward: ƒ goForward()</span></span>
<span class="line"><span style="color:#A6ACCD;">    length: 10</span></span>
<span class="line"><span style="color:#A6ACCD;">    listen: ƒ listen(listener)</span></span>
<span class="line"><span style="color:#A6ACCD;">    location: {pathname: &#39;/about&#39;, search: &#39;&#39;, hash: &#39;&#39;, state: undefined, key: &#39;2yemhp&#39;}</span></span>
<span class="line"><span style="color:#A6ACCD;">    push: ƒ push(path, state)</span></span>
<span class="line"><span style="color:#A6ACCD;">    replace: ƒ replace(path, state)</span></span>
<span class="line"><span style="color:#A6ACCD;">	[[Prototype]]: Object</span></span>
<span class="line"><span style="color:#A6ACCD;">location:</span></span>
<span class="line"><span style="color:#A6ACCD;">    hash: &quot;&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">    key: &quot;2yemhp&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">    pathname: &quot;/about&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">    search: &quot;&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">    state: undefined</span></span>
<span class="line"><span style="color:#A6ACCD;">    [[Prototype]]: Object</span></span>
<span class="line"><span style="color:#A6ACCD;">match:</span></span>
<span class="line"><span style="color:#A6ACCD;">    isExact: true</span></span>
<span class="line"><span style="color:#A6ACCD;">    params: {}</span></span>
<span class="line"><span style="color:#A6ACCD;">    path: &quot;/about&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">    url: &quot;/about&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">    [[Prototype]]: Object</span></span>
<span class="line"><span style="color:#A6ACCD;"> staticContext: undefined</span></span></code></pre></div></li></ol><h2 id="路由传参与查询参数" tabindex="-1">路由传参与查询参数 <a class="header-anchor" href="#路由传参与查询参数" aria-label="Permalink to &quot;路由传参与查询参数&quot;">​</a></h2><h3 id="v5" tabindex="-1">v5 <a class="header-anchor" href="#v5" aria-label="Permalink to &quot;v5&quot;">​</a></h3><ol><li><p>params传参</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;Link to={\`/home/message/detail/\${item.id}/\${item.title}\`}&gt;{item.title}&lt;/Link&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">...</span></span>
<span class="line"><span style="color:#A6ACCD;">{/* 声明接收params参数 */}</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;Route path=&quot;/home/message/detail/:id/:title&quot; component={Detail}&gt;&lt;/Route&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">...</span></span>
<span class="line"><span style="color:#A6ACCD;">// 对应路由组件中可以通过 props获取</span></span>
<span class="line"><span style="color:#A6ACCD;">const { id, title} = this.props.match.params</span></span></code></pre></div></li><li><p>search 传参</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">{/* 向路由组件传递 search 参数 */}</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;Link to={\`/home/message/detail/?id=\${item.id}&amp;title=\${item.title}\`}&gt;{item.title}&lt;/Link&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">...</span></span>
<span class="line"><span style="color:#A6ACCD;">{/* search参数无需声明接收 */}</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;Route path=&quot;/home/message/detail&quot; component={Detail}&gt;&lt;/Route&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 接收参数</span></span>
<span class="line"><span style="color:#A6ACCD;">import qs from &#39;querystring&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">const { search } = this.props.location // ?id=???&amp;title=???</span></span>
<span class="line"><span style="color:#A6ACCD;">const {id, title} = qs.parse(search.slice(1))</span></span></code></pre></div></li><li><p>state 传参</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">/* 向路由组件传递 state 参数 */}</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;Link  to={{pathname:&#39;/home/message/detail&#39;, state:{id:item.id,title:item.title}}}&gt;{item.title}&lt;/Link&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">{/* state参数无需声明接收 */}</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;Route path=&quot;/home/message/detail&quot; component={Detail}&gt;&lt;/Route&gt;</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 接收参数</span></span>
<span class="line"><span style="color:#A6ACCD;">const {id, title} = this.props.location.state</span></span></code></pre></div></li></ol><h3 id="v6" tabindex="-1">v6 <a class="header-anchor" href="#v6" aria-label="Permalink to &quot;v6&quot;">​</a></h3><ol><li><p>Link 组件</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;Link to=&quot;/&quot; state={&quot;Form State&quot;}&gt;注册&lt;/Link&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">...</span></span>
<span class="line"><span style="color:#A6ACCD;">import { useLocation } from &#39;react-router-dom&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">let location = useLocation()</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(location.state)</span></span></code></pre></div></li><li><p>Navigate 组件</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;Navigate  to=&quot;/&quot; state={&quot;Form State&quot;}&gt;注册&lt;/Navigate &gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">...</span></span>
<span class="line"><span style="color:#A6ACCD;">import { useLocation } from &#39;react-router-dom&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">let location = useLocation()</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(location.state)</span></span></code></pre></div></li><li><p>useNavigate 钩子</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const nav = useNavigate()</span></span>
<span class="line"><span style="color:#A6ACCD;">// nav(&#39;/login?b=20&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">// nav({</span></span>
<span class="line"><span style="color:#A6ACCD;">    // pathname: &#39;/login&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    // search: &#39;b=21&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">// })</span></span>
<span class="line"><span style="color:#A6ACCD;">nav({</span></span>
<span class="line"><span style="color:#A6ACCD;">	pathname: &#39;/&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">	state: &#39;Form State&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span></code></pre></div></li></ol><h2 id="编程式路由导航" tabindex="-1">编程式路由导航 <a class="header-anchor" href="#编程式路由导航" aria-label="Permalink to &quot;编程式路由导航&quot;">​</a></h2><h3 id="v5-1" tabindex="-1">v5 <a class="header-anchor" href="#v5-1" aria-label="Permalink to &quot;v5&quot;">​</a></h3><ul><li>push、replace及三种携带参数</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;button onClick={() =&gt; this.pushShow(item.id, item.title)}&gt;push 查看&lt;/button&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;button onClick={this.replaceShow(item.id, item.title)}&gt;replace 查看&lt;/button&gt;</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">replaceShow = (id, title) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">	return () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 编写一段代码，让其实现跳转到Detail组件，且为replace跳转(携带 params 参数)</span></span>
<span class="line"><span style="color:#A6ACCD;">    this.props.history.replace(\`/home/message/detail/\${id}/\${title}\`)</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 编写一段代码，让其实现跳转到Detail组件，且为replace跳转(携带 search 参数)</span></span>
<span class="line"><span style="color:#A6ACCD;">    // this.props.history.replace(\`/home/message/detail/?id=\${id}&amp;title=\${title}\`)</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 编写一段代码，让其实现跳转到Detail组件，且为replace跳转(携带 state 参数)</span></span>
<span class="line"><span style="color:#A6ACCD;">    // this.props.history.replace(\`/home/message/detail\`, {id, title}) </span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">pushShow = (id, title) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">	this.props.history.push((\`/home/message/detail/\${id}/\${title}\`))</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><ul><li><p>goBack、goForward、go</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;button onClick={this.back}&gt;回退&lt;/button&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;button onClick={this.forward}&gt;前进&lt;/button&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;button onClick={this.go}&gt;跳转&lt;/button&gt;</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">back = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">	this.props.history.goBack()</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">forward = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">	this.props.history.goForward()</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">go = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">	this.props.history.go(-2)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div></li></ul><h3 id="v6-1" tabindex="-1">v6 <a class="header-anchor" href="#v6-1" aria-label="Permalink to &quot;v6&quot;">​</a></h3><ul><li>useNavigate 钩子</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">import { FC } from &#39;react&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">import { useNavigate, Link } from &#39;react-router-dom&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const Home: FC = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const nav = useNavigate()</span></span>
<span class="line"><span style="color:#A6ACCD;">    const clickHandler = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // nav(&#39;/login?b=20&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">        nav({</span></span>
<span class="line"><span style="color:#A6ACCD;">            pathname: &#39;/login&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">            search: &#39;b=21&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">        })</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return (</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            &lt;p&gt;Home&lt;/p&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            &lt;div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                &lt;button onClick={clickHandler}&gt;登录&lt;/button&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                &lt;Link to=&quot;/register&quot;&gt;注册&lt;/Link&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            &lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    )</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">export default Home</span></span></code></pre></div><h2 id="动态路由" tabindex="-1">动态路由 <a class="header-anchor" href="#动态路由" aria-label="Permalink to &quot;动态路由&quot;">​</a></h2><h3 id="v5-2" tabindex="-1">v5 <a class="header-anchor" href="#v5-2" aria-label="Permalink to &quot;v5&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;Link to={\`/home/message/detail/\${item.id}/\${item.title}\`}&gt;{item.title}&lt;/Link&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">...</span></span>
<span class="line"><span style="color:#A6ACCD;">{/* 声明接收params参数 */}</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;Route path=&quot;/home/message/detail/:id/:title&quot; component={Detail}&gt;&lt;/Route&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">...</span></span>
<span class="line"><span style="color:#A6ACCD;">// 对应路由组件中可以通过 props获取</span></span>
<span class="line"><span style="color:#A6ACCD;">const { id, title} = this.props.match.params</span></span></code></pre></div><h3 id="v6-2" tabindex="-1">v6 <a class="header-anchor" href="#v6-2" aria-label="Permalink to &quot;v6&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;Route path=&quot;/home/message/detail/:id/:title&quot; component={Detail}&gt;&lt;/Route&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">...</span></span>
<span class="line"><span style="color:#A6ACCD;">import { useParams } from &#39;react-router-dom&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">const { id = &#39;&#39; } = useParams()</span></span></code></pre></div><h2 id="嵌套路由" tabindex="-1">嵌套路由 <a class="header-anchor" href="#嵌套路由" aria-label="Permalink to &quot;嵌套路由&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">export default class Home extends Component {</span></span>
<span class="line"><span style="color:#A6ACCD;">    render() {</span></span>
<span class="line"><span style="color:#A6ACCD;">        return (</span></span>
<span class="line"><span style="color:#A6ACCD;">            &lt;div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            &lt;h3&gt;我是Home的内容&lt;/h3&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            &lt;div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                &lt;ul className=&quot;nav nav-tabs&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                  &lt;li&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                    &lt;NavLink to=&quot;/home/news&quot;&gt;News&lt;/NavLink&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                  &lt;/li&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                  &lt;li&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                    &lt;NavLink to=&quot;/home/message&quot;&gt;Message&lt;/NavLink&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                  &lt;/li&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                &lt;/ul&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                &lt;Switch&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                    &lt;Route path=&quot;/home/news&quot; component={News} /&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                    &lt;Route path=&quot;/home/message&quot; component={Message} /&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                &lt;/Switch&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">              &lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            &lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        )</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h2 id="route-配置" tabindex="-1">Route 配置 <a class="header-anchor" href="#route-配置" aria-label="Permalink to &quot;Route 配置&quot;">​</a></h2><p>React Router v6 内置了一个<code>useRoutes</code> Hook,它在功能上等同于<code>&lt;Routes&gt;</code>，但它是使用JavaScript对象而不是<code>&lt;Route&gt;</code>元素来定义路由，这个对象具有与普通<code>&lt;Route&gt;</code>元素相同的属性，但不需要使用JSX来编写</p><p><code>useRoutes</code>的返回值要么是一个有效的React元素（可以使用来渲染路由树），如果没有匹配项则返回null</p><p>假如应用中有一下路径：</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">/</span></span>
<span class="line"><span style="color:#A6ACCD;">/invoices</span></span>
<span class="line"><span style="color:#A6ACCD;">	:id</span></span>
<span class="line"><span style="color:#A6ACCD;">	pending</span></span>
<span class="line"><span style="color:#A6ACCD;">	complete</span></span></code></pre></div><p>使用<code>&lt;Route&gt;</code>组件来定义路由将会是这样</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">export default function App() {</span></span>
<span class="line"><span style="color:#A6ACCD;">	return (</span></span>
<span class="line"><span style="color:#A6ACCD;">		&lt;div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">			&lt;Navbar /&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">			&lt;Routes&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">				&lt;Route path=&quot;/&quot; element={&lt;Home /&gt;} /&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">				&lt;Route path=&quot;/invoices&quot; element={&lt;Invoices /&gt;}&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">					&lt;Route path=&quot;:id&quot; element={&lt;Invoice /&gt;} /&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">					&lt;Route path=&quot;pending&quot; element={&lt;Pending /&gt;} /&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">					&lt;Route path=&quot;complete&quot; element={&lt;Complete /&gt;} /&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">				&lt;/Route&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">			&lt;/Routes&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">		&lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">	)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><p>使用<code>useRoutes</code>是利用 JavaScript 对象完成的，而不是使用 React元素（JSX）来声明路由</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">import { useRoutes } from &#39;react-router-dom&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const router = useRoutes([</span></span>
<span class="line"><span style="color:#A6ACCD;">    {</span></span>
<span class="line"><span style="color:#A6ACCD;">        path: &#39;/&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">        element: &lt;Home /&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    {</span></span>
<span class="line"><span style="color:#A6ACCD;">        path: &#39;/invoices&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">        element: &lt;Invoices /&gt;,</span></span>
<span class="line"><span style="color:#A6ACCD;">        children: [</span></span>
<span class="line"><span style="color:#A6ACCD;">            {</span></span>
<span class="line"><span style="color:#A6ACCD;">                path: &#39;:id&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">                element: &lt;Invoice /&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            },</span></span>
<span class="line"><span style="color:#A6ACCD;">            {</span></span>
<span class="line"><span style="color:#A6ACCD;">                path: &#39;/pending&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">                element: &lt;Pending /&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            },</span></span>
<span class="line"><span style="color:#A6ACCD;">            {</span></span>
<span class="line"><span style="color:#A6ACCD;">                path: &#39;/complete&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">                element: &lt;Complete /&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        ]</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">])</span></span></code></pre></div>`,37),p=[e];function o(c,i,r,C,A,u){return a(),n("div",null,p)}const g=s(t,[["render",o]]);export{y as __pageData,g as default};
