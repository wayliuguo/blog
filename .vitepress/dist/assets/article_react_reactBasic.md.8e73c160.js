import{_ as s,o as n,c as a,U as l}from"./chunks/framework.9adb0f96.js";const p="/blog/assets/1605688879048-b8d39c49-b1a1-4317-8dab-f7db088116e9.9bf4025b.png",D=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"article/react/reactBasic.md","filePath":"article/react/reactBasic.md","lastUpdated":1690870891000}'),e={name:"article/react/reactBasic.md"},t=l(`<h2 id="开发依赖" tabindex="-1">开发依赖 <a class="header-anchor" href="#开发依赖" aria-label="Permalink to &quot;开发依赖&quot;">​</a></h2><ul><li>react： 包含 react 所必须的核心代码</li><li>react-dom：react 渲染在不同平台所需要的核心代码 <ul><li>web端：将jsx最终渲染成真是DOM，显示在浏览器中</li><li>native端：将jsx渲染成原生的控件</li></ul></li><li>babel： 将 jsx 转换成 react 代码所需要的工具 <ul><li>默认情况下不需要babel，前提是我们自己使用React.createElement编写源代码</li></ul></li></ul><h2 id="jsx-语法规则" tabindex="-1">JSX 语法规则 <a class="header-anchor" href="#jsx-语法规则" aria-label="Permalink to &quot;JSX 语法规则&quot;">​</a></h2><ul><li><p>顶层只能有一个根元素，所以很多时候我们会在外层包裹一个div原生（或者Fragment文档片段）</p></li><li><p>为了方便阅读，通常在jsx外层包裹一个小括号</p></li><li><p>标签必须闭合</p></li><li><p>标签首字母</p><ul><li>若小写字母开头，则将该标签转为html中用户元素，若html中无该标签同名元素，则报错</li><li>若大写字母开头，react就去渲染对应的组件，若组件没有定义，则报错。</li></ul></li><li><p>嵌入变量</p><ul><li>直接显示：number、string、array</li><li>内容为空：null、undefined、boolean <ul><li>需要显示可以转成字符串</li><li>转换方式：toString、字符串拼接、String(变量)等</li></ul></li><li>对象类型不能作为子元素</li></ul></li><li><p>嵌入表达式，要用{}</p></li><li><p>绑定属性</p><ul><li>定义类名需要用 <code>className</code></li><li>内联样式</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">style={{key:val}}</span></span></code></pre></div><ul><li>要用形式去写，外面第一个大括号是表达式，里面那个是对象，需要驼峰法则</li></ul></li><li><p>绑定事件</p><ul><li>驼峰法则</li><li>绑定事件函数中this指向组件对象的三种方案</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 显式绑定</span></span>
<span class="line"><span style="color:#A6ACCD;">// 第一种显式绑定</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;button onClick={this.btnClick.bind(this)}&gt;绑定事件&lt;/button&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">// 第一种显式绑定，在构造函数重新赋值</span></span>
<span class="line"><span style="color:#A6ACCD;">constructor(props) {</span></span>
<span class="line"><span style="color:#A6ACCD;">	this.btnClick = this.btnClick.bind(this)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 使用箭头函数定义函数</span></span>
<span class="line"><span style="color:#A6ACCD;">btnClickArrow = () =&gt; {}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 传入一个箭头函数，箭头函数中执行需要执行的函数</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;button onClick={() =&gt; { this.btnClick() }}&gt;箭头函数执行绑定事件&lt;/button&gt;</span></span></code></pre></div></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;script type=&quot;text/babel&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        class Weather extends React.Component {</span></span>
<span class="line"><span style="color:#A6ACCD;">            constructor(props) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                super(props)</span></span>
<span class="line"><span style="color:#A6ACCD;">                this.state = {</span></span>
<span class="line"><span style="color:#A6ACCD;">                    name: &#39;well&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">                    age: 18,</span></span>
<span class="line"><span style="color:#A6ACCD;">                    names: [&#39;a&#39;, &#39;b&#39;, &#39;c&#39;],</span></span>
<span class="line"><span style="color:#A6ACCD;">                    test1: undefined,</span></span>
<span class="line"><span style="color:#A6ACCD;">                    test2: null,</span></span>
<span class="line"><span style="color:#A6ACCD;">                    test3: true,</span></span>
<span class="line"><span style="color:#A6ACCD;">                    friend: {</span></span>
<span class="line"><span style="color:#A6ACCD;">                        name: &#39;well&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">                        age: 18</span></span>
<span class="line"><span style="color:#A6ACCD;">                    },</span></span>
<span class="line"><span style="color:#A6ACCD;">                    style: {</span></span>
<span class="line"><span style="color:#A6ACCD;">                        color: &#39;red&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">                        fontSize: &#39;18px&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">                    }</span></span>
<span class="line"><span style="color:#A6ACCD;">                }</span></span>
<span class="line"><span style="color:#A6ACCD;">                // this.btnClick = this.btnClick.bind(this)</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">            getNameAndAge() {</span></span>
<span class="line"><span style="color:#A6ACCD;">                const { name, age } = this.state</span></span>
<span class="line"><span style="color:#A6ACCD;">                return \`姓名：\${name}，年龄\${age}\`</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">            btnClick() {</span></span>
<span class="line"><span style="color:#A6ACCD;">                let { age } = this.state</span></span>
<span class="line"><span style="color:#A6ACCD;">                this.setState({</span></span>
<span class="line"><span style="color:#A6ACCD;">                    age: ++age</span></span>
<span class="line"><span style="color:#A6ACCD;">                })</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">            btnClickArrow = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">                let { age } = this.state</span></span>
<span class="line"><span style="color:#A6ACCD;">                this.setState({</span></span>
<span class="line"><span style="color:#A6ACCD;">                    age: ++age</span></span>
<span class="line"><span style="color:#A6ACCD;">                })</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">            render() {</span></span>
<span class="line"><span style="color:#A6ACCD;">                const { name, age, names, test1, test2, test3, friend, style } = this.state</span></span>
<span class="line"><span style="color:#A6ACCD;">                return (</span></span>
<span class="line"><span style="color:#A6ACCD;">                    &lt;div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                        {/*</span></span>
<span class="line"><span style="color:#A6ACCD;">                            number、string、array 可以渲染</span></span>
<span class="line"><span style="color:#A6ACCD;">                        */}</span></span>
<span class="line"><span style="color:#A6ACCD;">                        &lt;h2&gt;{name}&lt;/h2&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                        &lt;h2&gt;{age}&lt;/h2&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                        &lt;h2&gt;{names}&lt;/h2&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                        {/*</span></span>
<span class="line"><span style="color:#A6ACCD;">                            undefined、null、boolean 渲染为空</span></span>
<span class="line"><span style="color:#A6ACCD;">                        */}</span></span>
<span class="line"><span style="color:#A6ACCD;">                        &lt;h2&gt;{test1}&lt;/h2&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                        &lt;h2&gt;{test2}&lt;/h2&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                        &lt;h2&gt;{test3}&lt;/h2&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                        {/*</span></span>
<span class="line"><span style="color:#A6ACCD;">                            &lt;h2&gt;{friend}&lt;/h2&gt; </span></span>
<span class="line"><span style="color:#A6ACCD;">                        */}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">                        {/*</span></span>
<span class="line"><span style="color:#A6ACCD;">                           嵌入表达式</span></span>
<span class="line"><span style="color:#A6ACCD;">                        */}</span></span>
<span class="line"><span style="color:#A6ACCD;">                        &lt;h2&gt;{\`姓名：\${name}，年龄\${age}\`}&lt;/h2&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                        &lt;h2&gt;{this.getNameAndAge()}&lt;/h2&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">                        {/*</span></span>
<span class="line"><span style="color:#A6ACCD;">                           绑定属性</span></span>
<span class="line"><span style="color:#A6ACCD;">                        */}</span></span>
<span class="line"><span style="color:#A6ACCD;">                        &lt;h2 className=&quot;box&quot;&gt;绑定class&lt;/h2&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                        &lt;h2 style={{ ...style }}&gt;绑定style&lt;/h2&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                        &lt;h2 style={style}&gt;绑定style&lt;/h2&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                        &lt;h2 style={{ color: &#39;red&#39;, fontSize: &#39;18px&#39; }}&gt;绑定style&lt;/h2&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">                        {/*</span></span>
<span class="line"><span style="color:#A6ACCD;">                           绑定事件</span></span>
<span class="line"><span style="color:#A6ACCD;">                        */}</span></span>
<span class="line"><span style="color:#A6ACCD;">                        &lt;button onClick={this.btnClick.bind(this)}&gt;显示绑定事件&lt;/button&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                        &lt;button onClick={this.btnClickArrow}&gt;箭头函数绑定事件&lt;/button&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                        &lt;button onClick={() =&gt; { this.btnClick() }}&gt;箭头函数执行绑定事件&lt;/button&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                    &lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                )</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        ReactDOM.render(&lt;Weather /&gt;, document.querySelector(&#39;#test&#39;))</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/script&gt;</span></span></code></pre></div><h2 id="受控组件" tabindex="-1">受控组件 <a class="header-anchor" href="#受控组件" aria-label="Permalink to &quot;受控组件&quot;">​</a></h2><p>由React 管理表单元素的值，表单元素的变化实时映射到React的state，类似双向绑定。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;script type=&quot;text/babel&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        class Login extends React.Component {</span></span>
<span class="line"><span style="color:#A6ACCD;">            state = {</span></span>
<span class="line"><span style="color:#A6ACCD;">                username: &#39;&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">                password: &#39;&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">            usernameChange = (evnet) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">                console.log(event.target.value)</span></span>
<span class="line"><span style="color:#A6ACCD;">                this.setState({</span></span>
<span class="line"><span style="color:#A6ACCD;">                    username: evnet.target.value</span></span>
<span class="line"><span style="color:#A6ACCD;">                })</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">            passwordChange = (event) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">                console.log(event.target.value)</span></span>
<span class="line"><span style="color:#A6ACCD;">                this.setState({</span></span>
<span class="line"><span style="color:#A6ACCD;">                    password: event.target.value</span></span>
<span class="line"><span style="color:#A6ACCD;">                })</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">            handleSubmit = (event) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">                event.preventDefault()</span></span>
<span class="line"><span style="color:#A6ACCD;">                const { username, password } = this.state</span></span>
<span class="line"><span style="color:#A6ACCD;">                alert(\`你输入的用户名是:\${username}，密码:\${password}\`)</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">            render() {</span></span>
<span class="line"><span style="color:#A6ACCD;">                return (</span></span>
<span class="line"><span style="color:#A6ACCD;">                    &lt;form onSubmit={this.handleSubmit}&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                        用户名: &lt;input type=&quot;text&quot; onChange={this.usernameChange} name=&quot;username&quot; /&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                        密码: &lt;input type=&quot;password&quot; onChange={this.passwordChange} name=&quot;password&quot; /&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                        &lt;button&gt;登录&lt;/button&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                    &lt;/form&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                )</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        ReactDOM.render(&lt;Login /&gt;, document.querySelector(&#39;#test1&#39;))</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/script&gt;</span></span></code></pre></div><h2 id="非受控组件" tabindex="-1">非受控组件 <a class="header-anchor" href="#非受控组件" aria-label="Permalink to &quot;非受控组件&quot;">​</a></h2><p>表单数据将交由节点处理，react提供一个<code>ref</code>属性，用来从<code>DOM</code>节点中获取表单数据</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;script type=&quot;text/babel&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        class Login extends React.Component {</span></span>
<span class="line"><span style="color:#A6ACCD;">            handleSubmit = (event) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">                event.preventDefault()</span></span>
<span class="line"><span style="color:#A6ACCD;">                const { usernameDom, passwordDom } = this</span></span>
<span class="line"><span style="color:#A6ACCD;">                console.log(this)</span></span>
<span class="line"><span style="color:#A6ACCD;">                alert(\`你输入的用户名是:\${usernameDom.value}，密码:\${passwordDom.value}\`)</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">            render() {</span></span>
<span class="line"><span style="color:#A6ACCD;">                return (</span></span>
<span class="line"><span style="color:#A6ACCD;">                    &lt;form action=&quot;http://www.atguigu.com&quot; onSubmit={this.handleSubmit}&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                        用户名: &lt;input type=&quot;text&quot; ref={dom =&gt; this.usernameDom = dom} name=&quot;username&quot; /&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                        密码: &lt;input type=&quot;password&quot; ref={dom =&gt; this.passwordDom = dom} name=&quot;password&quot; /&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                        &lt;button&gt;登录&lt;/button&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                    &lt;/form&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                )</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        ReactDOM.render(&lt;Login /&gt;, document.querySelector(&#39;#test1&#39;))</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/script&gt;</span></span></code></pre></div><h2 id="refs" tabindex="-1">refs <a class="header-anchor" href="#refs" aria-label="Permalink to &quot;refs&quot;">​</a></h2><ul><li>字符串形式</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;input ref=&quot;input1&quot; type=&quot;text&quot; placeholder=&quot;点击按钮提示数据&quot;/&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const { input1 } = this.refs</span></span></code></pre></div><ul><li>回调函数形式 ,这种方式</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;input ref={dom=&gt;this.input1 = dom} type=&quot;text&quot; placeholder=&quot;点击按钮提示数据&quot;/&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const { input1 } = this</span></span></code></pre></div><ul><li>类的绑定函数形式</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">class Demo extends React.Component {</span></span>
<span class="line"><span style="color:#A6ACCD;">	state = {}</span></span>
<span class="line"><span style="color:#A6ACCD;">	saveInput = (dom) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">		this.input1 = dom</span></span>
<span class="line"><span style="color:#A6ACCD;">	}</span></span>
<span class="line"><span style="color:#A6ACCD;">	...</span></span>
<span class="line"><span style="color:#A6ACCD;">	&lt;input ref={this.saveInput} type=&quot;text&quot; placeholder=&quot;点击按钮提示数据&quot;/&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><ul><li>React.createRef()</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">class Demo extends React.Component {</span></span>
<span class="line"><span style="color:#A6ACCD;"> 	myRef1 = React.createRef()</span></span>
<span class="line"><span style="color:#A6ACCD;"> 	...</span></span>
<span class="line"><span style="color:#A6ACCD;"> 	&lt;input ref={this.myRef1} type=&quot;text&quot; placeholder=&quot;点击按钮提示数据&quot;/&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;"> }</span></span></code></pre></div><h2 id="props-约束" tabindex="-1">props 约束 <a class="header-anchor" href="#props-约束" aria-label="Permalink to &quot;props 约束&quot;">​</a></h2><ul><li><p>安装</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm install prop-types</span></span></code></pre></div></li><li><p>定义</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">class Person extends React.Component {}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 参数类型</span></span>
<span class="line"><span style="color:#A6ACCD;">Person.propTypes = {</span></span>
<span class="line"><span style="color:#A6ACCD;">	name: PropTypes.string.isRequired</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">// 默认值</span></span>
<span class="line"><span style="color:#A6ACCD;">Person.defaultProps = {</span></span>
<span class="line"><span style="color:#A6ACCD;">	sex: &#39;女&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">	age: 18</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div></li><li><p>简写</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">class Person extends React.Component {</span></span>
<span class="line"><span style="color:#A6ACCD;">	static propTypes = {</span></span>
<span class="line"><span style="color:#A6ACCD;">		...</span></span>
<span class="line"><span style="color:#A6ACCD;">	}</span></span>
<span class="line"><span style="color:#A6ACCD;">	static defaultProps = {</span></span>
<span class="line"><span style="color:#A6ACCD;">		...</span></span>
<span class="line"><span style="color:#A6ACCD;">	}</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div></li><li><p><a href="https://www.npmjs.com/package/prop-types" target="_blank" rel="noreferrer">规则</a></p><ul><li><p>常见类型</p><ul><li>PropTypes.number</li><li>PropTypes.string</li><li>PropTypes.bool</li><li>PropTypes.symbol</li><li>PropTypes.bigint</li><li>PropTypes.array</li><li>PropTypes.object</li><li>PropTypes.func</li><li>PropTypes.node</li><li>PropTypes.element</li><li>PropTypes.elementType</li></ul></li><li><p>必填</p><ul><li>添加isRequired</li><li>PropTypes.number.isRequired</li></ul></li><li><p>特定值</p><ul><li>只能是 option1 或者 option2</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">PropTypes.oneOf([&#39;option1&#39;, &#39;option2&#39;])</span></span></code></pre></div><ul><li>只能是某几个类型</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">PropTypes.oneOfType([PropTypes.string, PropTypes.number])</span></span></code></pre></div></li><li><p>特定数组对象</p><ul><li>arrayof</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">PropTypes.arrayOf(PropTypes.number)</span></span></code></pre></div><ul><li>objectOf</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">PropTypes.objectOf(PropTypes.number)</span></span></code></pre></div><ul><li>shape</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">PropTypes.shape({</span></span>
<span class="line"><span style="color:#A6ACCD;">	name: PropTypes.string</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span></code></pre></div></li><li><p>自定义规则</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function (props, proName, componentName) {</span></span>
<span class="line"><span style="color:#A6ACCD;">	if (props[propName] !== &#39;customValue&#39;) {</span></span>
<span class="line"><span style="color:#A6ACCD;">      return new Error(\`Invalid value for prop \${propName} in component \${componentName}\`);</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div></li></ul></li><li><p>函数式组件中使用</p></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function Person (props) {</span></span>
<span class="line"><span style="color:#A6ACCD;">	...</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">Person.propTypes = {}</span></span>
<span class="line"><span style="color:#A6ACCD;">Person.defaultProps = {}</span></span></code></pre></div><h2 id="事件处理" tabindex="-1">事件处理 <a class="header-anchor" href="#事件处理" aria-label="Permalink to &quot;事件处理&quot;">​</a></h2><ul><li>通过onXxx属性指定事件处理函数，注意大小写 <ul><li>React 使用的是自定义（合成）事件，而不是使用的原生Dom事件</li><li>React 中的事件是通过事件委托方式处理的(委托给组件最外层元素)</li></ul></li><li>通过event.target得到发生事件的DOM元素对象</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">class Demo extends React.Component {</span></span>
<span class="line"><span style="color:#A6ACCD;">	showData = (event) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    	alert(event.target.value)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    ...</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;input onBlur={this.showData} type=&quot;text&quot; /&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h2 id="生命周期" tabindex="-1">生命周期 <a class="header-anchor" href="#生命周期" aria-label="Permalink to &quot;生命周期&quot;">​</a></h2><p><img src="`+p+`" alt="img"></p><ul><li>装载阶段(Mount): 组件第一次在DOM树中被渲染的过程 <ul><li>constructor <ul><li>如果显式调用必须super()</li></ul></li><li>getDerivedStateFromProps(props, state) <ul><li>在接收新的<code>props</code>或者调用<code>setState</code>和<code>forceUpdate</code>时调用</li><li>当我们接收到新的属性想要修改我们的state，就可以使用</li></ul></li><li>render <ul><li>根据<code>state</code>和<code>props</code>渲染组件</li></ul></li><li>componentDidMount <ul><li>组件挂载后立即调用</li><li>执行依赖于DOM的操作</li><li>发送网络请求（官方建议）</li><li>添加订阅消息</li></ul></li></ul></li><li>更新过程(Update): 组件状态发生变化，重写更新渲染的过程 <ul><li>getDerivedStateFromProps</li><li>shouldComponentUpdate <ul><li>setState 调用会引起子组件的重新渲染</li><li>如果子组件<code>state</code>、<code>props</code>没有变化不希望重新渲染使用这里拦截</li></ul></li><li>render</li><li>getSnapshotBeforeUpdate(prevProps, prevState)</li><li>componentDidUpdate</li></ul></li><li>卸载过程(Unmount): 组件从DOM树中被移除的过程 <ul><li>componentWillUnmount <ul><li>清楚timer，取消网络请求</li><li>取消在<code>componentDidMount</code>添加的订阅</li></ul></li></ul></li></ul><h2 id="create-react-app" tabindex="-1">create-react-app <a class="header-anchor" href="#create-react-app" aria-label="Permalink to &quot;create-react-app&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm i create-react-app -g</span></span>
<span class="line"><span style="color:#A6ACCD;">npx create-react-app react-ts-demo --template typescript</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">npm create vite@latest react-demo-vite --template react-ts</span></span></code></pre></div>`,31),o=[t];function c(i,r,C,A,y,u){return n(),a("div",null,o)}const g=s(e,[["render",c]]);export{D as __pageData,g as default};
