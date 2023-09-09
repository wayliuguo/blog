import{_ as s,o as n,c as a,U as l}from"./chunks/framework.9adb0f96.js";const d=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"node/express.md","filePath":"node/express.md","lastUpdated":1692534215000}'),e={name:"node/express.md"},p=l(`<h2 id="快速入门" tabindex="-1">快速入门 <a class="header-anchor" href="#快速入门" aria-label="Permalink to &quot;快速入门&quot;">​</a></h2><ul><li><a href="https://nodejs.cn/express/5x/api/app/" target="_blank" rel="noreferrer">应用</a><ul><li>通过调用 Express 模块导出的顶级express()函数来创建</li></ul></li><li><a href="https://nodejs.cn/express/5x/api/router/" target="_blank" rel="noreferrer">路由</a><ul><li>app.method(path, handler)</li></ul></li><li><a href="https://nodejs.cn/express/5x/api/req/#path" target="_blank" rel="noreferrer">请求</a><ul><li>handler参数，继承于 http.InComingMessage 类</li><li>常用属性 <ul><li>req.body</li><li>req.ip</li><li>req.baseUrl</li><li>req.query</li><li>...</li></ul></li></ul></li><li><a href="https://nodejs.cn/express/5x/api/res/" target="_blank" rel="noreferrer">响应</a><ul><li>handler 参数，继承于 http.ServerResponse 类</li><li>常用属性 <ul><li>res.json([body])</li><li>res.send([body])</li><li>res.status(code)</li><li>res.set(&#39;field&#39;[, value])</li><li>...</li></ul></li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const express = require(&#39;express&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">const app = express()</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 配置解析表单请求体：application/json</span></span>
<span class="line"><span style="color:#A6ACCD;">// 配置后可以通过 req.body 获取请求数据</span></span>
<span class="line"><span style="color:#A6ACCD;">app.use(express.json())</span></span>
<span class="line"><span style="color:#A6ACCD;">// 配置表单请求体：application/x-www-form-urlencoded</span></span>
<span class="line"><span style="color:#A6ACCD;">app.use(express.urlencoded())</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">app.get(&#39;/&#39;, (req, res) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    res.send(&#39;get&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">app.post(&#39;/todos/:id&#39;, async (req, res) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const ret = await Promise.resolve({name: &#39;well&#39;})</span></span>
<span class="line"><span style="color:#A6ACCD;">    const { id } = req.params</span></span>
<span class="line"><span style="color:#A6ACCD;">    const { age } = req.body</span></span>
<span class="line"><span style="color:#A6ACCD;">    const { name } = ret</span></span>
<span class="line"><span style="color:#A6ACCD;">    res.send(\`name：\${name}，id：\${id}，age：\${age}\`)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">app.listen(3000, () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;server is running at 3000&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span></code></pre></div><h2 id="中间件" tabindex="-1">中间件 <a class="header-anchor" href="#中间件" aria-label="Permalink to &quot;中间件&quot;">​</a></h2><ul><li>中间件函数 <ul><li>可以访问应用程序请求对象、响应对象和下一中间件函数的函数</li><li>下一中间件函数通常由一个名为<code>next</code>的变量表示</li><li>中间件函数可以执行的任务 <ul><li>执行任何代码</li><li>更改请求和响应对象</li><li>结束请求-响应周期</li><li>调用堆栈中下一个中间件函数</li></ul></li></ul></li><li>中间件分类 <ul><li>应用级中间件</li><li>路由级中间件</li><li>错误处理中间件</li><li>内置中间件</li><li>第三方中间件</li></ul></li><li>应用级中间件 <ul><li>使用<code>app.use()</code>和<code>app.method()</code>函数将应用级中间件绑定到<code>app对象实例</code></li><li><code>app.use(handler)</code></li><li><code>app.use(&#39;/user/:id&#39;, handler)</code></li><li><code>app.post(&#39;/user/:id&#39;, handler)</code></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const logTime = (req, res, next) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(\`time：\${Date.now()}\`)</span></span>
<span class="line"><span style="color:#A6ACCD;">  next()</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">app.use(logTime, (req, res, next) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(&#39;middleware next&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">  next()</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span></code></pre></div></li><li>路由级中间件 <ul><li>工作方式与应用级中间件相同，只是绑定到<code>express.Router()</code>的实例上</li><li><code>const router = express.Router()</code></li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// userRouter</span></span>
<span class="line"><span style="color:#A6ACCD;">const userRouter = require(&#39;./userRouter&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">// userRouter middleware</span></span>
<span class="line"><span style="color:#A6ACCD;">app.use(&#39;/user&#39;, userRouter)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// userRouter.js</span></span>
<span class="line"><span style="color:#A6ACCD;">const express = require(&#39;express&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">const userRouter = express.Router()</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">userRouter.get(&#39;/:id&#39;, (req, res) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">  const { id } = req.params</span></span>
<span class="line"><span style="color:#A6ACCD;">  res.send(id)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">module.exports = userRouter</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 访问 http://localhost:3000/user/110  &gt;&gt;&gt; 110</span></span></code></pre></div><ul><li>错误处理中间件 <ul><li>总是需要四个参数，必须提供四个参数</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">app.get(&#39;/&#39;, (req, res, next) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    try {</span></span>
<span class="line"><span style="color:#A6ACCD;">        throw new Error(&#39;测试错误&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    } catch (error) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        next(error)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// error middleware</span></span>
<span class="line"><span style="color:#A6ACCD;">app.use((err, req, res, next) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    res.status(500).json({</span></span>
<span class="line"><span style="color:#A6ACCD;">        error: err.message</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span></code></pre></div><ul><li>内置中间件 <ul><li>express.json() <ul><li>解析 Content-Type 为application/json 格式的请求体</li></ul></li><li>express.urlencoded() <ul><li>解析 Content-Type 为 www-form-urlencoded 格式的请求体</li></ul></li><li>express.raw() <ul><li>解析 Content-Type 为 application/octet-stream 格式的请求体</li></ul></li><li>express.text() <ul><li>解析 Content-Type 为 text/plain 格式的请求体</li></ul></li><li>express.static() <ul><li>托管静态资源文件</li></ul></li></ul></li></ul><h2 id="restful-接口规范" tabindex="-1">RESTful 接口规范 <a class="header-anchor" href="#restful-接口规范" aria-label="Permalink to &quot;RESTful 接口规范&quot;">​</a></h2><ul><li><p>HTTP动词</p><ul><li>GET(读取)：从服务器取出资源（一项或多项）</li><li>POST(创建)：在服务器新建一个资源</li><li>PUT(完成更新)：在服务器更新资源（客户端提供改变后的完整资源）</li><li>PATCH(部分更新)：在服务器更新资源（客户端提供改变的属性）</li><li>DELETE(删除)：从服务器删除资源</li><li>HEAD: 获取资源的元数据</li><li>OPTIONS: 预检</li></ul></li><li><p>过滤信息</p><ul><li>?limit = 10 指定返回记录的数量</li><li>?offset= 10 指定返回的开始记录</li></ul></li><li><p>状态码</p><ul><li>1**: 相关信息</li><li>2**:操作成功</li><li>3**:重定向</li><li>4**:客户端错误</li><li>5**:服务器错误</li></ul></li><li><p>身份认证</p><p>基于 JWT 的接口权限认证：</p><ul><li>字段名：Authorization</li><li>字段值：Bearer token 数据</li></ul></li><li><p>跨域处理</p><ul><li>可以在服务端设置 CORS 设置客户端跨域资源请求</li></ul></li></ul><h2 id="restful-案例" tabindex="-1">RESTful 案例 <a class="header-anchor" href="#restful-案例" aria-label="Permalink to &quot;RESTful 案例&quot;">​</a></h2><h2 id="目录结构" tabindex="-1">目录结构 <a class="header-anchor" href="#目录结构" aria-label="Permalink to &quot;目录结构&quot;">​</a></h2><ul><li>config 配置文件 <ul><li>config.default.js</li></ul></li><li>controller 用于解析用户的输入，处理后返回相应的结果</li><li>model 数据持久层</li><li>middleware 用于编写中间件</li><li>router 用于配置 url 路由</li><li>util 工具模块</li><li>app.js 用于自定义启动</li></ul><h2 id="中间件与依赖资源" tabindex="-1">中间件与依赖资源 <a class="header-anchor" href="#中间件与依赖资源" aria-label="Permalink to &quot;中间件与依赖资源&quot;">​</a></h2><ul><li><p>解析请求体</p><ul><li>express.json()</li><li>express.urlencoded()</li></ul></li><li><p>日志输出</p><ul><li>morgan()</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm i morgan</span></span></code></pre></div></li><li><p>为客户端提供跨域资源请求</p><ul><li>cors()</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm i cors</span></span></code></pre></div></li><li><p>加密</p><ul><li>crypto</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm i crypto</span></span></code></pre></div></li><li><p>身份验证</p><ul><li>jsonwebtoken</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm install jsonwebtoken</span></span></code></pre></div></li><li><p>校验</p><ul><li>express-validator</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm i express-validator</span></span></code></pre></div></li><li><p>数据库</p><ul><li>mongoose</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm i mongoose</span></span></code></pre></div></li></ul><h2 id="入口" tabindex="-1">入口 <a class="header-anchor" href="#入口" aria-label="Permalink to &quot;入口&quot;">​</a></h2><ul><li>引入了路由模块，实现了路由的嵌套与代码分离</li><li>挂载了统一处理服务端错误中间件</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const express = require(&#39;express&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 引入路由模块</span></span>
<span class="line"><span style="color:#A6ACCD;">const router = require(&#39;./router&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// cors 中间件</span></span>
<span class="line"><span style="color:#A6ACCD;">const cors = require(&#39;cors&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">// 自定义错误处理中间件</span></span>
<span class="line"><span style="color:#A6ACCD;">const errorHandler = require(&#39;./middleware/error-handler&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const app = new express()</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 解析请求体</span></span>
<span class="line"><span style="color:#A6ACCD;">app.use(express.json())</span></span>
<span class="line"><span style="color:#A6ACCD;">app.use(express.urlencoded())</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 为客户端提供跨域</span></span>
<span class="line"><span style="color:#A6ACCD;">app.use(cors())</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const PORT = p<wbr>rocess.env.PORT</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 挂载路由</span></span>
<span class="line"><span style="color:#A6ACCD;">app.use(&#39;/api&#39;, router)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 挂载统一处理服务端错误中间件</span></span>
<span class="line"><span style="color:#A6ACCD;">app.use(errorHandler())</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">app.listen(PORT, () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(\`Server is running at http://localhost:\${PORT}\`)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span></code></pre></div><h2 id="路由模块" tabindex="-1">路由模块 <a class="header-anchor" href="#路由模块" aria-label="Permalink to &quot;路由模块&quot;">​</a></h2><ul><li>把<code>user</code>相关路由抽离到另一个文件了</li><li>使用 <code>validator</code>进行校验</li><li>使用<code>auth</code>进行身份验证</li><li>路由的进一步处理封装在<code>controller/user</code>中</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// router/index.js</span></span>
<span class="line"><span style="color:#A6ACCD;">const express = require(&#39;express&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">const router = express.Router()</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 用户相关模块</span></span>
<span class="line"><span style="color:#A6ACCD;">router.use(require(&#39;./user&#39;))</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">module.exports = router</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// router/user.js</span></span>
<span class="line"><span style="color:#A6ACCD;">const express = require(&#39;express&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">const router = express.Router()</span></span>
<span class="line"><span style="color:#A6ACCD;">const userCtrl = require(&#39;../controller/user&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">const userValidator = require(&#39;../validator/user&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">const auth = require(&#39;../middleware/auth&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 用户登录</span></span>
<span class="line"><span style="color:#A6ACCD;">router.post(&#39;/users/login&#39;, userValidator.login, userCtrl.login)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 用户注册</span></span>
<span class="line"><span style="color:#A6ACCD;">router.post(&#39;/users&#39;, userValidator.register, userCtrl.register)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 获取当前登录用户</span></span>
<span class="line"><span style="color:#A6ACCD;">router.get(&#39;/user&#39;, auth, userCtrl.getCurrentUser)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 更新当前登录用户</span></span>
<span class="line"><span style="color:#A6ACCD;">router.put(&#39;/user&#39;, auth, userCtrl.updateCurrentUser)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">module.exports = router</span></span></code></pre></div><h2 id="validator-模块" tabindex="-1">validator 模块 <a class="header-anchor" href="#validator-模块" aria-label="Permalink to &quot;validator 模块&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const validate = require(&#39;../middleware/validate&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">const { body } = require(&#39;express-validator&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">const { User } = require(&#39;../model&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">const md5 = require(&#39;../util/md5&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">exports.register = validate([</span></span>
<span class="line"><span style="color:#A6ACCD;">    body(&#39;user.username&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">        .notEmpty()</span></span>
<span class="line"><span style="color:#A6ACCD;">        .withMessage(&#39;用户名不能为空&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">        .custom(async username =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            const user = await User.findOne({ username })</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (user) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                return Promise.reject(&#39;用户名已存在&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        }),</span></span>
<span class="line"><span style="color:#A6ACCD;">    body(&#39;user.password&#39;).notEmpty().withMessage(&#39;密码不能为空&#39;),</span></span>
<span class="line"><span style="color:#A6ACCD;">    body(&#39;user.email&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">        .notEmpty()</span></span>
<span class="line"><span style="color:#A6ACCD;">        .withMessage(&#39;邮箱不能为空&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">        .isEmail()</span></span>
<span class="line"><span style="color:#A6ACCD;">        .withMessage(&#39;邮箱格式不正确&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">        .bail() // 前面两者都通过</span></span>
<span class="line"><span style="color:#A6ACCD;">        .custom(async email =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            const user = await User.findOne({ email })</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (user) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                return Promise.reject(&#39;邮箱已存在&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        })</span></span>
<span class="line"><span style="color:#A6ACCD;">])</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">exports.login = [</span></span>
<span class="line"><span style="color:#A6ACCD;">    validate([</span></span>
<span class="line"><span style="color:#A6ACCD;">        body(&#39;user.email&#39;).notEmpty().withMessage(&#39;邮箱不能为空&#39;),</span></span>
<span class="line"><span style="color:#A6ACCD;">        body(&#39;user.password&#39;).notEmpty().withMessage(&#39;密码不能为空&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    ]),</span></span>
<span class="line"><span style="color:#A6ACCD;">    validate([</span></span>
<span class="line"><span style="color:#A6ACCD;">        body(&#39;user.email&#39;).custom(async (email, { req }) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            const user = await User.findOne({ email }).select([&#39;email&#39;, &#39;username&#39;, &#39;bio&#39;, &#39;image&#39;, &#39;password&#39;])</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (!user) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                return Promise.reject(&#39;用户不存在&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">            // 将数据挂载到请求对象中，后续的中间件也可以使用了</span></span>
<span class="line"><span style="color:#A6ACCD;">            req.user = user</span></span>
<span class="line"><span style="color:#A6ACCD;">        })</span></span>
<span class="line"><span style="color:#A6ACCD;">    ]),</span></span>
<span class="line"><span style="color:#A6ACCD;">    validate([</span></span>
<span class="line"><span style="color:#A6ACCD;">        body(&#39;user.password&#39;).custom(async (password, { req }) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (md5(password) !== req.user.password) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                return Promise.reject(&#39;密码错误&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        })</span></span>
<span class="line"><span style="color:#A6ACCD;">    ])</span></span>
<span class="line"><span style="color:#A6ACCD;">]</span></span></code></pre></div><h2 id="controller-模块" tabindex="-1">controller 模块 <a class="header-anchor" href="#controller-模块" aria-label="Permalink to &quot;controller 模块&quot;">​</a></h2><ul><li>引用<code>model</code>层生成 Model构造函数，用于创建文档实例</li><li>引用<code>jwt</code>进行登录验证</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 引入 user model</span></span>
<span class="line"><span style="color:#A6ACCD;">const { User } = require(&#39;../model&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">const jwt = require(&#39;../util/jwt&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">const { jwtSecret } = require(&#39;../config/config.default&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">//  用户登录</span></span>
<span class="line"><span style="color:#A6ACCD;">exports.login = async (req, res, next) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    try {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 1.数据验证</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 2. 生成 token</span></span>
<span class="line"><span style="color:#A6ACCD;">        const user = req.user.toJSON()</span></span>
<span class="line"><span style="color:#A6ACCD;">        const token = await jwt.sign(</span></span>
<span class="line"><span style="color:#A6ACCD;">            {</span></span>
<span class="line"><span style="color:#A6ACCD;">                userId: user._id</span></span>
<span class="line"><span style="color:#A6ACCD;">            },</span></span>
<span class="line"><span style="color:#A6ACCD;">            jwtSecret,</span></span>
<span class="line"><span style="color:#A6ACCD;">            {</span></span>
<span class="line"><span style="color:#A6ACCD;">                expiresIn: &#39;24h&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        )</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 3. 发送成功响应（包含 token 的用户信息）</span></span>
<span class="line"><span style="color:#A6ACCD;">        delete user.password</span></span>
<span class="line"><span style="color:#A6ACCD;">        res.status(200).json({</span></span>
<span class="line"><span style="color:#A6ACCD;">            ...user,</span></span>
<span class="line"><span style="color:#A6ACCD;">            token</span></span>
<span class="line"><span style="color:#A6ACCD;">        })</span></span>
<span class="line"><span style="color:#A6ACCD;">    } catch (error) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        next(error)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">//  用户注册</span></span>
<span class="line"><span style="color:#A6ACCD;">exports.register = async (req, res, next) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    try {</span></span>
<span class="line"><span style="color:#A6ACCD;">        const user = new User(req.body.user)</span></span>
<span class="line"><span style="color:#A6ACCD;">        await user.save()</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 4.发送成功响应</span></span>
<span class="line"><span style="color:#A6ACCD;">        res.status(201).json({</span></span>
<span class="line"><span style="color:#A6ACCD;">            user</span></span>
<span class="line"><span style="color:#A6ACCD;">        })</span></span>
<span class="line"><span style="color:#A6ACCD;">    } catch (error) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        next(error)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 获取当前用户</span></span>
<span class="line"><span style="color:#A6ACCD;">exports.getCurrentUser = async (req, res, next) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    try {</span></span>
<span class="line"><span style="color:#A6ACCD;">        res.status(200).json({</span></span>
<span class="line"><span style="color:#A6ACCD;">            user: req.user</span></span>
<span class="line"><span style="color:#A6ACCD;">        })</span></span>
<span class="line"><span style="color:#A6ACCD;">    } catch (error) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        next(error)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 更新当前用户</span></span>
<span class="line"><span style="color:#A6ACCD;">exports.updateCurrentUser = async (req, res, next) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    try {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 处理请求</span></span>
<span class="line"><span style="color:#A6ACCD;">        res.send(&#39;updateCurrentUser&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    } catch (error) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        next(error)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h2 id="model-模块" tabindex="-1">model 模块 <a class="header-anchor" href="#model-模块" aria-label="Permalink to &quot;model 模块&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// model/index.js</span></span>
<span class="line"><span style="color:#A6ACCD;">const mongoose = require(&#39;mongoose&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">const { dbUri } = require(&#39;../config/config.default&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 连接 MongoDB 数据库</span></span>
<span class="line"><span style="color:#A6ACCD;">mongoose.connect(dbUri, {</span></span>
<span class="line"><span style="color:#A6ACCD;">    useNewUrlParser: true,</span></span>
<span class="line"><span style="color:#A6ACCD;">    useUnifiedTopology: true</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const db = mongoose.connection</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 当连接失败的时候</span></span>
<span class="line"><span style="color:#A6ACCD;">db.on(&#39;error&#39;, err =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;MongoDB 数据库连接失败&#39;, err)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 当连接成功的时候</span></span>
<span class="line"><span style="color:#A6ACCD;">db.once(&#39;open&#39;, function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;MongoDB 数据库连接成功&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 组织导出模型类</span></span>
<span class="line"><span style="color:#A6ACCD;">module.exports = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    User: mongoose.model(&#39;User&#39;, require(&#39;./user&#39;))</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// model/user.js</span></span>
<span class="line"><span style="color:#A6ACCD;">const mongoose = require(&#39;mongoose&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">const baseModel = require(&#39;./base-model&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">const md5 = require(&#39;../util/md5&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const userSchema = new mongoose.Schema({</span></span>
<span class="line"><span style="color:#A6ACCD;">    ...baseModel,</span></span>
<span class="line"><span style="color:#A6ACCD;">    username: {</span></span>
<span class="line"><span style="color:#A6ACCD;">        type: String,</span></span>
<span class="line"><span style="color:#A6ACCD;">        required: true</span></span>
<span class="line"><span style="color:#A6ACCD;">    },</span></span>
<span class="line"><span style="color:#A6ACCD;">    email: {</span></span>
<span class="line"><span style="color:#A6ACCD;">        type: String,</span></span>
<span class="line"><span style="color:#A6ACCD;">        required: true</span></span>
<span class="line"><span style="color:#A6ACCD;">    },</span></span>
<span class="line"><span style="color:#A6ACCD;">    password: {</span></span>
<span class="line"><span style="color:#A6ACCD;">        type: String,</span></span>
<span class="line"><span style="color:#A6ACCD;">        required: true,</span></span>
<span class="line"><span style="color:#A6ACCD;">        set: value =&gt; md5(value),</span></span>
<span class="line"><span style="color:#A6ACCD;">        select: false</span></span>
<span class="line"><span style="color:#A6ACCD;">    },</span></span>
<span class="line"><span style="color:#A6ACCD;">    bio: {</span></span>
<span class="line"><span style="color:#A6ACCD;">        type: String,</span></span>
<span class="line"><span style="color:#A6ACCD;">        default: null</span></span>
<span class="line"><span style="color:#A6ACCD;">    },</span></span>
<span class="line"><span style="color:#A6ACCD;">    image: {</span></span>
<span class="line"><span style="color:#A6ACCD;">        type: String,</span></span>
<span class="line"><span style="color:#A6ACCD;">        default: null</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">module.exports = userSchema</span></span></code></pre></div><h2 id="auth-模块与-jwt" tabindex="-1">auth 模块与 jwt <a class="header-anchor" href="#auth-模块与-jwt" aria-label="Permalink to &quot;auth 模块与 jwt&quot;">​</a></h2><ul><li>jwt 的原理是使用数字签名来验证和保护传输的信息</li><li>jwt的工作原理 <ul><li><strong>生成令牌（Token）</strong>：在用户身份验证成功后，服务器生成一个 JWT 令牌，并将其返回给客户端</li><li><strong>令牌结构</strong>：JWT 由三部分组成，即头部（Header）、载荷（Payload）和签名（Signature），它们通过点号分隔开。头部包含了关于令牌的元数据和签名算法信息，载荷包含了要传递的数据，签名用于验证令牌的完整性和真实性</li><li><strong>数字签名</strong>：服务器使用密钥对头部和载荷进行数字签名生成签名部分。签名通常使用 HMAC（Hash-based Message Authentication Code）或 RSA（Rivest-Shamir-Adleman）算法完成，以确保令牌的完整性和真实性</li><li><strong>传输令牌</strong>：服务器将生成的 JWT 令牌发送给客户端，通常通过在响应的 HTTP 头部中添加 &quot;Authorization&quot; 字段或放置在 Cookie 中</li><li><strong>请求验证</strong>：客户端在后续的请求中将 JWT 令牌作为授权凭证传递给服务器。通常，客户端会在请求的 HTTP 头部中添加 &quot;Authorization&quot; 字段，并将令牌以 Bearer 方式传递</li><li><strong>令牌验证</strong>：服务器接收到请求后，首先会解析 JWT 令牌，检查头部和载荷的完整性。然后，服务器使用相同的签名算法和密钥对头部和载荷进行验证，并与令牌中的签名部分进行比较。如果签名匹配，服务器可以确认令牌的真实性和完整性</li><li><strong>提取数据</strong>：一旦 JWT 令牌通过验证，服务器可以提取载荷中的数据，例如用户标识、权限等，并根据需要执行相应的操作</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// middleware/auth.js</span></span>
<span class="line"><span style="color:#A6ACCD;">const { verify } = require(&#39;../util/jwt&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">const { jwtSecret } = require(&#39;../config/config.default&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">const { User } = require(&#39;../model&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">module.exports = async (req, res, next) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 从请求头获取 token 数据</span></span>
<span class="line"><span style="color:#A6ACCD;">    let token = req.headers[&#39;authorization&#39;]</span></span>
<span class="line"><span style="color:#A6ACCD;">    token = token ? token.split(&#39;Bearer &#39;)[1] : null</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    if (!token) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        return res.status(401).end()</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    try {</span></span>
<span class="line"><span style="color:#A6ACCD;">        const decodedToken = await verify(token, jwtSecret)</span></span>
<span class="line"><span style="color:#A6ACCD;">        req.user = await User.findById(decodedToken.userId)</span></span>
<span class="line"><span style="color:#A6ACCD;">        next()</span></span>
<span class="line"><span style="color:#A6ACCD;">    } catch (err) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        return res.status(401).end()</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    // 验证 token 是否有效</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 无效 -&gt; 响应 401 状态码</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 有效 -&gt; 把用户信息读取出来挂载到 req 请求对象上</span></span>
<span class="line"><span style="color:#A6ACCD;">    //        继续往后执行</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h2 id="express-简单实现" tabindex="-1">express 简单实现 <a class="header-anchor" href="#express-简单实现" aria-label="Permalink to &quot;express 简单实现&quot;">​</a></h2><ul><li><code>createApplication</code> 是一个函数，具有<code>listen</code>、<code>use</code>、<code>all</code>及其他<code>method</code>上的方法</li><li><code>use</code>、<code>method</code>、<code>all</code> 收集<code>method</code>、<code>path</code>、<code>handler</code>在<code>app.routes</code>数组中</li><li><code>listen</code> 内部执行了<code>http.createServer</code>开启了一个服务端，其回调函数为<code>app</code>方法</li><li><code>app 方法原理</code><ul><li>实现一个<code>next</code>方法，每当匹配到对应的<code>method</code>和<code>path</code>时，就执行对应<code>handler</code></li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const http = require(&#39;http&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">const url = require(&#39;url&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">function createApplication() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // app 是 createServer 的回调函数</span></span>
<span class="line"><span style="color:#A6ACCD;">    let app = (req, res) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 获取请求的方法</span></span>
<span class="line"><span style="color:#A6ACCD;">        let methodName = req.method.toLowerCase()</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 获取请求的路径</span></span>
<span class="line"><span style="color:#A6ACCD;">        let { pathname } = url.parse(req.url, true)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">        // 通过next方法进行中间件调用</span></span>
<span class="line"><span style="color:#A6ACCD;">        let index = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">        function next(err) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (index === app.routes.length) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                return res.end(\`Cannot find \${methodName} \${pathname}\`)</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">            let { method, path, handler } = app.routes[index++]</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (err) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                // 如果有错误，去找错误中间件</span></span>
<span class="line"><span style="color:#A6ACCD;">                // 错误中间件有四个参数</span></span>
<span class="line"><span style="color:#A6ACCD;">                if (handler.length === 4) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                    handler(err, req, res, next)</span></span>
<span class="line"><span style="color:#A6ACCD;">                } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">                    next(err)</span></span>
<span class="line"><span style="color:#A6ACCD;">                }</span></span>
<span class="line"><span style="color:#A6ACCD;">            } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">                // next 就应该取下一个layer</span></span>
<span class="line"><span style="color:#A6ACCD;">                if (method === &#39;middle&#39;) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                    // 处理中间件</span></span>
<span class="line"><span style="color:#A6ACCD;">                    if (path === &#39;/&#39; || path === pathname || pathname.startsWith(path + &#39;/&#39;)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                        handler(req, res, next)</span></span>
<span class="line"><span style="color:#A6ACCD;">                    }</span></span>
<span class="line"><span style="color:#A6ACCD;">                } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">                    if ((method === methodName || method === &#39;all&#39;) &amp;&amp; (path === pathname || path === &#39;*&#39;)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                        return handler(req, res)</span></span>
<span class="line"><span style="color:#A6ACCD;">                    } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">                        next()</span></span>
<span class="line"><span style="color:#A6ACCD;">                    }</span></span>
<span class="line"><span style="color:#A6ACCD;">                }</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        next()</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    // 用于存放路由</span></span>
<span class="line"><span style="color:#A6ACCD;">    app.routes = []</span></span>
<span class="line"><span style="color:#A6ACCD;">    app.use = function (path, handler) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (typeof handler !== &#39;function&#39;) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            handler = path</span></span>
<span class="line"><span style="color:#A6ACCD;">            path = &#39;/&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        let layer = {</span></span>
<span class="line"><span style="color:#A6ACCD;">            method: &#39;middle&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">            path,</span></span>
<span class="line"><span style="color:#A6ACCD;">            handler</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 将中间件放到容器内</span></span>
<span class="line"><span style="color:#A6ACCD;">        app.routes.push(layer)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    // express 内置中间件</span></span>
<span class="line"><span style="color:#A6ACCD;">    app.use((req, res, next) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        let { pathname, query } = url.parse(req.url, true)</span></span>
<span class="line"><span style="color:#A6ACCD;">        let hostname = req.headers[&#39;host&#39;].split(&#39;:&#39;)[0]</span></span>
<span class="line"><span style="color:#A6ACCD;">        req.path = pathname</span></span>
<span class="line"><span style="color:#A6ACCD;">        req.hostname = hostname</span></span>
<span class="line"><span style="color:#A6ACCD;">        req.query = query</span></span>
<span class="line"><span style="color:#A6ACCD;">        next()</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 实现 all 路由方法</span></span>
<span class="line"><span style="color:#A6ACCD;">    app.all = function (path, handler) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        let layer = {</span></span>
<span class="line"><span style="color:#A6ACCD;">            method: &#39;all&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">            path,</span></span>
<span class="line"><span style="color:#A6ACCD;">            handler</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        app.routes.push(layer)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 实现路由方法</span></span>
<span class="line"><span style="color:#A6ACCD;">    http.METHODS.forEach(method =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        method = method.toLocaleLowerCase()</span></span>
<span class="line"><span style="color:#A6ACCD;">        app[method] = function (path, handler) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            // layer 记录 method+path =&gt; handler</span></span>
<span class="line"><span style="color:#A6ACCD;">            let layer = {</span></span>
<span class="line"><span style="color:#A6ACCD;">                method,</span></span>
<span class="line"><span style="color:#A6ACCD;">                path,</span></span>
<span class="line"><span style="color:#A6ACCD;">                handler</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">            app.routes.push(layer)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    // 生成一个服务端</span></span>
<span class="line"><span style="color:#A6ACCD;">    app.listen = function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">        const server = http.createServer(app)</span></span>
<span class="line"><span style="color:#A6ACCD;">        server.listen(...arguments)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return app</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">module.exports = createApplication</span></span></code></pre></div>`,37),o=[p];function c(r,t,i,C,A,y){return n(),a("div",null,o)}const D=s(e,[["render",c]]);export{d as __pageData,D as default};
