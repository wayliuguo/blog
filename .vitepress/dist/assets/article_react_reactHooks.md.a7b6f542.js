import{_ as s,o as n,c as a,U as l}from"./chunks/framework.9adb0f96.js";const d=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"article/react/reactHooks.md","filePath":"article/react/reactHooks.md","lastUpdated":1693308924000}'),e={name:"article/react/reactHooks.md"},p=l(`<h2 id="react-hooks-是什么" tabindex="-1">React Hooks 是什么？ <a class="header-anchor" href="#react-hooks-是什么" aria-label="Permalink to &quot;React Hooks 是什么？&quot;">​</a></h2><ul><li>一套能够使函数组件更加强大、更加灵活的“钩子”</li><li>把某个目标结果钩到可能会变化的数据源或者事件源上，那么当被钩到的数据或事件发生变化时，产生这个目标结果的代码就会重新执行，产生更新后的结果</li><li>使用规范 <ul><li>安装插件 eslint-plugin-react-hooks</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm install eslint-plugin-react-hooks --save-dev</span></span></code></pre></div><ul><li>配置hooks规则</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&quot;rules&quot;: {</span></span>
<span class="line"><span style="color:#A6ACCD;">  &quot;react-hooks/rules-of-hooks&quot;: &quot;error&quot;, // 检查 hooks 规则</span></span>
<span class="line"><span style="color:#A6ACCD;">  &quot;react-hooks/exhaustive-deps&quot;: &quot;warn&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div></li><li>特点 <ul><li>简化逻辑复用</li><li>关注分离</li></ul></li></ul><p>下面是一个例子用于说明简化逻辑复用： 我们有多个组件，当用户调整浏览器窗口的大小，需要重新调整页面布局，根据size渲染不同组件。 如果用类组件实现，需要定义一个高阶组件，负责监听窗口的变化，并将变化后的值作为props传给下一个组件</p><h2 id="class-组件逻辑复用" tabindex="-1">Class 组件逻辑复用 <a class="header-anchor" href="#class-组件逻辑复用" aria-label="Permalink to &quot;Class 组件逻辑复用&quot;">​</a></h2><p><strong>WithWindowSize.tsx</strong> 入参是一个组件<code>Component</code>，其成一个组件获取<code>size</code>的变化，<code>render</code>时传递给<code>Component</code>实现传递</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// WithWindowSize.tsx</span></span>
<span class="line"><span style="color:#A6ACCD;">import React from &#39;react&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">interface stateType {</span></span>
<span class="line"><span style="color:#A6ACCD;">    size: string</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const WithWindowSize = (Component: any) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    class WrappedComponent extends React.PureComponent&lt;any, stateType&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        constructor(props: any) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            super(props)</span></span>
<span class="line"><span style="color:#A6ACCD;">            this.state = {</span></span>
<span class="line"><span style="color:#A6ACCD;">                size: this.getSize()</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        componentDidMount(): void {</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 监听浏览器窗口大小</span></span>
<span class="line"><span style="color:#A6ACCD;">            window.addEventListener(&#39;resize&#39;, this.handleResize)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        componentWillUnmount(): void {</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 移除监听</span></span>
<span class="line"><span style="color:#A6ACCD;">            window.removeEventListener(&#39;resize&#39;, this.handleResize)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        getSize() {</span></span>
<span class="line"><span style="color:#A6ACCD;">            return window.innerWidth &gt; 1000 ? &#39;large&#39; : &#39;small&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        handleResize = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            this.setState({</span></span>
<span class="line"><span style="color:#A6ACCD;">                size: this.getSize()</span></span>
<span class="line"><span style="color:#A6ACCD;">            })</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        render() {</span></span>
<span class="line"><span style="color:#A6ACCD;">            return &lt;Component size={this.state.size}&gt;&lt;/Component&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return WrappedComponent</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">export default WithWindowSize</span></span></code></pre></div><p><strong>MyComponent.tsx</strong> 调用<code>WithWindowSize</code>组件产生一个新组件，自带<code>size</code>属性</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">import React from &#39;react&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">import WithWindowSize from &#39;./WithWindowSize&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">interface propsTypes {</span></span>
<span class="line"><span style="color:#A6ACCD;">    size: string</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">class MyComponent extends React.Component&lt;propsTypes&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    render() {</span></span>
<span class="line"><span style="color:#A6ACCD;">        const { size } = this.props</span></span>
<span class="line"><span style="color:#A6ACCD;">        return &lt;div&gt;{size}&lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">export default WithWindowSize(MyComponent)</span></span></code></pre></div><h2 id="hooks-逻辑复用" tabindex="-1">hooks 逻辑复用 <a class="header-anchor" href="#hooks-逻辑复用" aria-label="Permalink to &quot;hooks 逻辑复用&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">import { useEffect, useState } from &#39;react&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const getSize = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return window.innerWidth &gt; 1000 ? &#39;large&#39; : &#39;small&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const useWindowSize = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const [size, setSize] = useState(getSize())</span></span>
<span class="line"><span style="color:#A6ACCD;">    useEffect(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        const handler = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            setSize(getSize())</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        window.addEventListener(&#39;resize&#39;, handler)</span></span>
<span class="line"><span style="color:#A6ACCD;">        return () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            window.removeEventListener(&#39;resize&#39;, handler)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }, [])</span></span>
<span class="line"><span style="color:#A6ACCD;">    return size</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const Demo = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const size = useWindowSize()</span></span>
<span class="line"><span style="color:#A6ACCD;">    return &lt;div&gt;{size}&lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">export default Demo</span></span></code></pre></div><h2 id="usestate-维护状态" tabindex="-1">useState 维护状态 <a class="header-anchor" href="#usestate-维护状态" aria-label="Permalink to &quot;useState 维护状态&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const [state, setState] = useState(0)</span></span></code></pre></div><ul><li>参数：初始化值，可以是任意类型，默认undefined</li><li>返回值：数组，包含两个元素（通常通过数组解构赋值来获取）</li><li>特点 <ul><li>两种更新方式，推荐使用函数形式</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">setCount(count + 1)</span></span>
<span class="line"><span style="color:#A6ACCD;">setCount(count =&gt; count+1)</span></span></code></pre></div><ul><li>异步更新，日志打印不是最新的state值（页面上的值才是最新的）</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">setCount(count =&gt; count + 1)</span></span>
<span class="line"><span style="color:#A6ACCD;">// 日志打印不是最新的值,页面如果是1，日志则为0</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(count)</span></span></code></pre></div><ul><li>useState 使用更新函数会触发页面重新渲染，如果值不用于页面渲染，不要使用 useState， 使用 useRef</li><li>简单数据不使用函数形式可能会被合并</li><li>不可变数据（重要），其更新机制是对<code>state</code>只进行浅对比，只要<strong>引用地址</strong>没有变就不会重新渲染</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const [userInfo, setUserInfo] = useState({ name: &#39;well&#39;, age: 18 })</span></span>
<span class="line"><span style="color:#A6ACCD;">const changeAge = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">  setUserInfo({</span></span>
<span class="line"><span style="color:#A6ACCD;">      ...userInfo,</span></span>
<span class="line"><span style="color:#A6ACCD;">      age: ++userInfo.age</span></span>
<span class="line"><span style="color:#A6ACCD;">  })</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><ul><li>可以使用immer解决不可变数据需要改变引用地址</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm i immer</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">let age = userInfo.age</span></span>
<span class="line"><span style="color:#A6ACCD;">setUserInfo(</span></span>
<span class="line"><span style="color:#A6ACCD;">    produce(draft =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        draft.age = age + 1</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">)</span></span></code></pre></div></li></ul><h2 id="useeffect-执行副作用" tabindex="-1">useEffect：执行副作用 <a class="header-anchor" href="#useeffect-执行副作用" aria-label="Permalink to &quot;useEffect：执行副作用&quot;">​</a></h2><ul><li>函数式组件通过<code>useState</code>具备操控<code>state</code>的能力，修改<code>state</code>需要在适当的场景</li><li>目前<code>useEffect</code>相当于<code>componentDidMount、componentDidUpdate、componentWillUnmount</code>三个周期综合，即其回调函数会在组件<strong>挂载、更新、卸载</strong>时执行</li><li>React18开始，useEffect 在开发环境下会执行两次，用于模拟组件创建、销毁再创建的完整流程，及早暴露问题</li><li>使用形式<div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">useEffect(callBack, [])</span></span></code></pre></div><ul><li>callBack: 回调函数</li><li>[]: 依赖数组，只有渲染时数组中值发生了变化才会执行回调函数</li><li>销毁会执行返回的方法，一边用于清理操作，防止内存泄漏</li></ul></li><li>使用示例-有依赖项 <ul><li>初次渲染执行一次</li><li>依赖项更新执行一次</li><li>销毁只执行return回去的函数</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">useEffect(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;count值发生了变化&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    return () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(&#39;销毁&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}, [count])</span></span></code></pre></div><ul><li>使用示例-没有依赖项 <ul><li>每次render之后都会执行一次</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">useEffect(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;count值发生了变化&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    return () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(&#39;销毁&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span></code></pre></div><ul><li>使用示例-依赖项为空 <ul><li>首次执行时触发</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">useEffect(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;count值发生了变化&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    return () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(&#39;销毁&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}, [])</span></span></code></pre></div><h2 id="useref-共享数据" tabindex="-1">useRef: 共享数据 <a class="header-anchor" href="#useref-共享数据" aria-label="Permalink to &quot;useRef: 共享数据&quot;">​</a></h2><ul><li>在函数组件中，需要用<code>useRef</code>提供一个组件多次渲染之间共享数据的功能</li><li>其返回一个可变的ref对象，其<code>.current</code>属性被初始化为传入的参数</li><li>其值的更改不会触发组件的重新渲染，这是区别于<code>useState</code>的地方</li><li>使用形式 <ul><li>绑定 DOM</li><li>保存数据</li></ul></li><li>绑定 DOM</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const inputRef = useRef&lt;HTMLInputElement&gt;(null)</span></span>
<span class="line"><span style="color:#A6ACCD;">const selectInput = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const inputElem = inputRef.current</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (inputElem) inputElem.select()</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;input type=&quot;text&quot; ref={inputRef} defaultValue=&quot;hello world&quot; /&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;button onClick={selectInput}&gt;选中input&lt;/button&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/div&gt;</span></span></code></pre></div><ul><li>保存数据(页面没有更新，ref值变化了)</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const nameRef = useRef(&#39;well&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">const changeName = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    nameRef.current = &#39;wayliuguo&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(nameRef.current)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;p&gt;name:{nameRef.current}&lt;/p&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;button onClick={changeName}&gt;change name&lt;/button&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/div&gt;</span></span></code></pre></div><h2 id="usememo-缓存结果" tabindex="-1">useMemo: 缓存结果 <a class="header-anchor" href="#usememo-缓存结果" aria-label="Permalink to &quot;useMemo: 缓存结果&quot;">​</a></h2><ul><li>函数组件，每次更新都会重新执行函数</li><li><code>useMemo</code> 可以缓存数据，不用每次执行函数都重新生成</li><li>可用于计算量较大的场景，缓存提高性能</li><li>使用示例 <ul><li>只有依赖项的值变更了才会重新执行</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">useMemo(callBack, [])</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const [num1, setNum1] = useState(10)</span></span>
<span class="line"><span style="color:#A6ACCD;">const [num2, setNum2] = useState(20)</span></span>
<span class="line"><span style="color:#A6ACCD;">const sum = useMemo(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;useMemo的依赖项变更了&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    return num1 + num2</span></span>
<span class="line"><span style="color:#A6ACCD;">}, [num1, num2])</span></span></code></pre></div><h2 id="usecallback-缓存回调函数" tabindex="-1">useCallback: 缓存回调函数 <a class="header-anchor" href="#usecallback-缓存回调函数" aria-label="Permalink to &quot;useCallback: 缓存回调函数&quot;">​</a></h2><ul><li>当依赖的值变化后，才会生成新的函数</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const set = new Set()</span></span>
<span class="line"><span style="color:#A6ACCD;">...</span></span>
<span class="line"><span style="color:#A6ACCD;">const callback = useCallback(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(count)</span></span>
<span class="line"><span style="color:#A6ACCD;">}, [count])</span></span>
<span class="line"><span style="color:#A6ACCD;">set.add(callback)</span></span>
<span class="line"><span style="color:#A6ACCD;">...</span></span>
<span class="line"><span style="color:#A6ACCD;">div&gt;Set.size{set.size}&lt;/div&gt;</span></span></code></pre></div><h2 id="自定义-hook-——-usetitle" tabindex="-1">自定义 hook —— useTitle <a class="header-anchor" href="#自定义-hook-——-usetitle" aria-label="Permalink to &quot;自定义 hook —— useTitle&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">import { useEffect } from &#39;react&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const useTitle = (title: string) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    useEffect(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        document.title = title</span></span>
<span class="line"><span style="color:#A6ACCD;">    }, [])</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">export default useTitle</span></span></code></pre></div><h2 id="自定义-hook-——-usemouse" tabindex="-1">自定义 hook —— useMouse <a class="header-anchor" href="#自定义-hook-——-usemouse" aria-label="Permalink to &quot;自定义 hook —— useMouse&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">import { useEffect, useState } from &#39;react&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const useMouse = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const [x, setX] = useState&lt;number&gt;(0)</span></span>
<span class="line"><span style="color:#A6ACCD;">    const [y, setY] = useState&lt;number&gt;(0)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    const mouseMoveHandler = (event: MouseEvent) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        setX(event.clientX)</span></span>
<span class="line"><span style="color:#A6ACCD;">        setY(event.clientY)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    useEffect(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 监听鼠标事件</span></span>
<span class="line"><span style="color:#A6ACCD;">        window.addEventListener(&#39;mousemove&#39;, mouseMoveHandler)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">        // 组件销毁时，解绑DOM事件（否则可能出现内存泄漏问题）</span></span>
<span class="line"><span style="color:#A6ACCD;">        return () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            window.removeEventListener(&#39;mousemove&#39;, mouseMoveHandler)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }, [])</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    return { x, y }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">export default useMouse</span></span></code></pre></div><h2 id="自定义hook-——-usegetinfo" tabindex="-1">自定义hook —— useGetInfo <a class="header-anchor" href="#自定义hook-——-usegetinfo" aria-label="Permalink to &quot;自定义hook —— useGetInfo&quot;">​</a></h2><ul><li>传入了依赖的值，当依赖的值变更后再次请求数据</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">import { useEffect, useState } from &#39;react&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const getInfo = (): Promise&lt;string&gt; =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return new Promise(resolve =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        setTimeout(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            resolve(Date.now().toString())</span></span>
<span class="line"><span style="color:#A6ACCD;">        }, 1500)</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const useGetInfo = (count: number) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const [loading, setLoading] = useState(true)</span></span>
<span class="line"><span style="color:#A6ACCD;">    const [info, setInfo] = useState(&#39;&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    useEffect(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        getInfo().then(info =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            setLoading(false)</span></span>
<span class="line"><span style="color:#A6ACCD;">            setInfo(info)</span></span>
<span class="line"><span style="color:#A6ACCD;">        })</span></span>
<span class="line"><span style="color:#A6ACCD;">    }, [count])</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    return { loading, info }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">export default useGetInfo</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">...</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const { loading, info } = useGetInfo(count)</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;p&gt;{loading ? &#39;加载中...&#39; : info}&lt;/p&gt;</span></span></code></pre></div><h2 id="三条使用规则" tabindex="-1">三条使用规则 <a class="header-anchor" href="#三条使用规则" aria-label="Permalink to &quot;三条使用规则&quot;">​</a></h2><ul><li>必须使用 useXxx 格式命名</li><li>只能在两个地方调用 Hook（组件内，其他 Hook 内）</li><li>必须保证每次的调用顺序一致（不能放在 if for 内部）</li></ul><h2 id="闭包陷阱" tabindex="-1">闭包陷阱 <a class="header-anchor" href="#闭包陷阱" aria-label="Permalink to &quot;闭包陷阱&quot;">​</a></h2><ul><li>在点击一下<code>alertFn</code>到<code>alert</code>触发过程中多次点击<code>add</code>，由于<code>闭包陷阱</code>会导致<code>alert</code>显示的是旧值</li><li>可以使用<code>useRef</code>解决，原因是<code>useState</code>是值类型，<code>useRef</code>是引用类型</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">import { FC, useState } from &#39;react&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const ClosureTrap: FC = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const [count, setCount] = useState(0)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    const add = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        setCount(count + 1)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    const alertFn = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        setTimeout(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            alert(count)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }, 3000)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return (</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            &lt;p&gt;闭包陷阱&lt;/p&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            &lt;div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                &lt;p&gt;{count}&lt;/p&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                &lt;button onClick={add}&gt; add&lt;/button&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                &lt;button onClick={alertFn}&gt; alertFn&lt;/button&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            &lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;/&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    )</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">export default ClosureTrap</span></span></code></pre></div><ul><li>使用 useRef 解决闭包陷阱</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 添加 useRef 依赖 count</span></span>
<span class="line"><span style="color:#A6ACCD;">const countRef = useRef(0)</span></span>
<span class="line"><span style="color:#A6ACCD;">useEffect(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    countRef.current = count</span></span>
<span class="line"><span style="color:#A6ACCD;">}, [count])</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const alertFn = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    setTimeout(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        alert(countRef.current)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }, 3000)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div>`,46),o=[p];function t(c,i,r,C,A,u){return n(),a("div",null,o)}const D=s(e,[["render",t]]);export{d as __pageData,D as default};
