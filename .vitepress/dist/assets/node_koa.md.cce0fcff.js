import{_ as s,o as n,c as a,U as e}from"./chunks/framework.9adb0f96.js";const D=JSON.parse('{"title":"koa 实现","description":"","frontmatter":{},"headers":[],"relativePath":"node/koa.md","filePath":"node/koa.md","lastUpdated":1692633113000}'),l={name:"node/koa.md"},p=e(`<h1 id="koa-实现" tabindex="-1">koa 实现 <a class="header-anchor" href="#koa-实现" aria-label="Permalink to &quot;koa 实现&quot;">​</a></h1><h2 id="简单使用" tabindex="-1">简单使用 <a class="header-anchor" href="#简单使用" aria-label="Permalink to &quot;简单使用&quot;">​</a></h2><ul><li>1 -&gt; 3 -&gt; sleep -&gt; 5 -&gt; 6 -&gt; 4 -&gt;2</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const Koa = require(&#39;./koa&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">const app = new Koa()</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">function sleep() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return new Promise(resolve =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        setTimeout(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            console.log(&#39;sleep&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">            resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">        }, 2000)</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">app.use(async (ctx, next) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;1&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    ctx.body = &#39;1&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">    await next()</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;2&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    ctx.body = &#39;2&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;">app.use(async (ctx, next) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;3&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    ctx.body = &#39;3&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">    await sleep()</span></span>
<span class="line"><span style="color:#A6ACCD;">    next()</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;4&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    ctx.body = &#39;4&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;">app.use((ctx, next) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;5&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    ctx.body = &#39;5&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">    next()</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;6&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    ctx.body = &#39;6&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">app.on(&#39;error&#39;, err =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(err)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">app.listen(8080, () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;server start&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span></code></pre></div><h2 id="application" tabindex="-1">application <a class="header-anchor" href="#application" aria-label="Permalink to &quot;application&quot;">​</a></h2><ul><li>导出的<code>Application</code>即是我们的<code>Koa</code></li><li>构造函数通过<code>Object.create</code>往实例上添加了<code>request</code>、<code>response</code>、<code>context</code>属性</li><li>其提供了<code>use</code>方法收集<code>middlewares</code></li><li>其提供了<code>listen</code>方法内部进行创建服务器，服务器处理回调处理函数为<code>handleRequest</code><ul><li><code>handleRequest</code> 中调用<code>createContext</code> 方法生成了对象，实现ctx、request、response的扩展</li><li>通过 <code>compose</code> 方法实现洋葱模型，其原理是： <ul><li>默认执行下标为0即第一个中间件，并返回<code>Promise.resolve(middleware(ctx, () =&gt; dispatch(i + 1)))</code>，这里<code>() =&gt; dispatch(i + 1)</code>作为<code>next</code>返回给了当前中间件，当调用<code>next</code>时就是调用了下一个中间件，实现控制流转</li><li>当调用下一个中间件的时候，就进入了下一个中间件函数，此时上一个中间件的<code>next</code>后面的就实现了等待</li></ul></li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const http = require(&#39;http&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">const context = require(&#39;./context&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">const request = require(&#39;./request&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">const response = require(&#39;./response&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">const EventEmitter = require(&#39;events&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">class Application extends EventEmitter {</span></span>
<span class="line"><span style="color:#A6ACCD;">    constructor() {</span></span>
<span class="line"><span style="color:#A6ACCD;">        super()</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.context = Object.create(context)</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.request = Object.create(request)</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.response = Object.create(response)</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.middlewares = []</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    use(middleware) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.middlewares.push(middleware)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    createContext(req, res) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        let ctx = Object.create(this.context)</span></span>
<span class="line"><span style="color:#A6ACCD;">        let request = Object.create(this.request)</span></span>
<span class="line"><span style="color:#A6ACCD;">        let response = Object.create(this.response)</span></span>
<span class="line"><span style="color:#A6ACCD;">        ctx.request = request</span></span>
<span class="line"><span style="color:#A6ACCD;">        ctx.request.req = ctx.req = req</span></span>
<span class="line"><span style="color:#A6ACCD;">        ctx.response = response</span></span>
<span class="line"><span style="color:#A6ACCD;">        ctx.response.res = ctx.res = res</span></span>
<span class="line"><span style="color:#A6ACCD;">        return ctx</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    compose(ctx) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        let index = -1</span></span>
<span class="line"><span style="color:#A6ACCD;">        const dispatch = i =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (i &lt;= index) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                return Promise.reject(&#39;next() call mutiples&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">            index = i</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (this.middlewares.length === i) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                return Promise.resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">            } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">                let middleware = this.middlewares[i]</span></span>
<span class="line"><span style="color:#A6ACCD;">                try {</span></span>
<span class="line"><span style="color:#A6ACCD;">                    return Promise.resolve(middleware(ctx, () =&gt; dispatch(i + 1)))</span></span>
<span class="line"><span style="color:#A6ACCD;">                } catch (error) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                    return Promise.reject(error)</span></span>
<span class="line"><span style="color:#A6ACCD;">                }</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        return dispatch(0)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    handleRequest = (req, res) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        let ctx = this.createContext(req, res)</span></span>
<span class="line"><span style="color:#A6ACCD;">        res.statusCode = 404</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.compose(ctx)</span></span>
<span class="line"><span style="color:#A6ACCD;">            .then(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">                if (ctx.body) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                    res.end(ctx.body)</span></span>
<span class="line"><span style="color:#A6ACCD;">                } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">                    res.end(&#39;not found&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">                }</span></span>
<span class="line"><span style="color:#A6ACCD;">            })</span></span>
<span class="line"><span style="color:#A6ACCD;">            .catch(e =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">                this.emit(&#39;error&#39;, e)</span></span>
<span class="line"><span style="color:#A6ACCD;">            })</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    listen() {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 默认采用箭头函数回调中的this指向我们http创建的服务</span></span>
<span class="line"><span style="color:#A6ACCD;">        let server = http.createServer(this.handleRequest)</span></span>
<span class="line"><span style="color:#A6ACCD;">        server.listen(...arguments)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">module.exports = Application</span></span></code></pre></div><h2 id="context" tabindex="-1">context <a class="header-anchor" href="#context" aria-label="Permalink to &quot;context&quot;">​</a></h2><ul><li>利用代理实现 context 的扩展</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const contxt = {}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">function defineGetter(target, key) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    contxt.__defineGetter__(key, function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">        return this[target][key]</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">function defineSetter(target, key) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    contxt.__defineSetter__(key, function (value) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        this[target][key] = value</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">defineGetter(&#39;request&#39;, &#39;path&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">defineGetter(&#39;request&#39;, &#39;url&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">defineGetter(&#39;request&#39;, &#39;query&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">defineGetter(&#39;response&#39;, &#39;body&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">defineSetter(&#39;response&#39;, &#39;body&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">module.exports = contxt</span></span></code></pre></div><h2 id="request" tabindex="-1">request <a class="header-anchor" href="#request" aria-label="Permalink to &quot;request&quot;">​</a></h2><ul><li>利用 getter 实现对 ctx.request 的代理</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const url = require(&#39;url&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">const request = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    get url() {</span></span>
<span class="line"><span style="color:#A6ACCD;">        return this.req.url</span></span>
<span class="line"><span style="color:#A6ACCD;">    },</span></span>
<span class="line"><span style="color:#A6ACCD;">    get path() {</span></span>
<span class="line"><span style="color:#A6ACCD;">        let { pathname } = url.parse(this.req.url)</span></span>
<span class="line"><span style="color:#A6ACCD;">        return pathname</span></span>
<span class="line"><span style="color:#A6ACCD;">    },</span></span>
<span class="line"><span style="color:#A6ACCD;">    get query() {</span></span>
<span class="line"><span style="color:#A6ACCD;">        let { pathname, query } = url.parse(this.req.url, true)</span></span>
<span class="line"><span style="color:#A6ACCD;">        return query</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">module.exports = request</span></span></code></pre></div><h2 id="response" tabindex="-1">response <a class="header-anchor" href="#response" aria-label="Permalink to &quot;response&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const response = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    _body: undefined,</span></span>
<span class="line"><span style="color:#A6ACCD;">    get body() {</span></span>
<span class="line"><span style="color:#A6ACCD;">        return this._body</span></span>
<span class="line"><span style="color:#A6ACCD;">    },</span></span>
<span class="line"><span style="color:#A6ACCD;">    set body(content) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        this._body = content</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">module.exports = response</span></span></code></pre></div>`,15),o=[p];function t(c,r,i,C,A,y){return n(),a("div",null,o)}const u=s(l,[["render",t]]);export{D as __pageData,u as default};
