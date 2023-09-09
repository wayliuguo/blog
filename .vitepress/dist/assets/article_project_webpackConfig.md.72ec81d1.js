import{_ as s,o as a,c as n,U as l}from"./chunks/framework.9adb0f96.js";const u=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"article/project/webpackConfig.md","filePath":"article/project/webpackConfig.md","lastUpdated":1691335292000}'),p={name:"article/project/webpackConfig.md"},e=l(`<h2 id="基本配置" tabindex="-1"><a href="https://webpack.docschina.org/concepts/" target="_blank" rel="noreferrer">基本配置</a> <a class="header-anchor" href="#基本配置" aria-label="Permalink to &quot;[基本配置](https://webpack.docschina.org/concepts/)&quot;">​</a></h2><ul><li>entry：必须项，文件入口</li><li>mode: 模式，默认 production，可选 development</li><li>module：非必须，loader 编写的地方</li><li>output：必须项，最终产出js配置</li><li>plugins：非必须，插件</li><li>mode：webpack4后必填</li><li>optimization：非必须，优化相关</li><li>devServer：非必须，开发模式配置</li><li>resolve：非必须，提供一些简化功能</li></ul><h2 id="安装" tabindex="-1">安装 <a class="header-anchor" href="#安装" aria-label="Permalink to &quot;安装&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm install webpack webpack-cli --save-dev</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">npm install webpack webpack-cli -g</span></span>
<span class="line"><span style="color:#A6ACCD;">webpack -v</span></span></code></pre></div><h2 id="体验" tabindex="-1">体验 <a class="header-anchor" href="#体验" aria-label="Permalink to &quot;体验&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const path = require(&#39;path&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">module.exports = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    mode: &#39;development&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    entry: &#39;./index.js&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    output: {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 输出文件</span></span>
<span class="line"><span style="color:#A6ACCD;">        path: path.resolve(__dirname, &#39;dist&#39;),</span></span>
<span class="line"><span style="color:#A6ACCD;">        filename: &#39;[name].[hash:4].bundle.js&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h2 id="babel-loader" tabindex="-1">babel-loader <a class="header-anchor" href="#babel-loader" aria-label="Permalink to &quot;babel-loader&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm i babel-loader @babel/core @babel/preset-env</span></span></code></pre></div><ul><li>babel-loader 处理js，其内部依赖 @babel/core</li><li>@babel/preset-env: 转译的规范</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">module: {</span></span>
<span class="line"><span style="color:#A6ACCD;">        rules: [</span></span>
<span class="line"><span style="color:#A6ACCD;">            {</span></span>
<span class="line"><span style="color:#A6ACCD;">                test: /\\.js$/,</span></span>
<span class="line"><span style="color:#A6ACCD;">                // use: &#39;babel-loader&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">                use: {</span></span>
<span class="line"><span style="color:#A6ACCD;">                    loader: &#39;babel-loader&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">                    options: {</span></span>
<span class="line"><span style="color:#A6ACCD;">                        /* presets: [</span></span>
<span class="line"><span style="color:#A6ACCD;">                            [</span></span>
<span class="line"><span style="color:#A6ACCD;">                                &#39;@babel/preset-env&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">                                {</span></span>
<span class="line"><span style="color:#A6ACCD;">                                    targets: {</span></span>
<span class="line"><span style="color:#A6ACCD;">                                        browsers: [&#39;&gt;1%&#39;, &#39;last 2 versions&#39;, &#39;not ie&lt;=8&#39;]</span></span>
<span class="line"><span style="color:#A6ACCD;">                                    }</span></span>
<span class="line"><span style="color:#A6ACCD;">                                }</span></span>
<span class="line"><span style="color:#A6ACCD;">                            ]</span></span>
<span class="line"><span style="color:#A6ACCD;">                        ] */</span></span>
<span class="line"><span style="color:#A6ACCD;">                    }</span></span>
<span class="line"><span style="color:#A6ACCD;">                }</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        ]</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span></code></pre></div><ul><li>.babelrc 可以替代上面注释调的 presets</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">{</span></span>
<span class="line"><span style="color:#A6ACCD;">    &quot;presets&quot;: [</span></span>
<span class="line"><span style="color:#A6ACCD;">        [</span></span>
<span class="line"><span style="color:#A6ACCD;">            &quot;@babel/preset-env&quot;,</span></span>
<span class="line"><span style="color:#A6ACCD;">            {</span></span>
<span class="line"><span style="color:#A6ACCD;">                &quot;targets&quot;: {</span></span>
<span class="line"><span style="color:#A6ACCD;">                    &quot;browsers&quot;: [&quot;&gt;1%&quot;, &quot;last 2 versions&quot;, &quot;not ie&lt;=8&quot;]</span></span>
<span class="line"><span style="color:#A6ACCD;">                }</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        ]</span></span>
<span class="line"><span style="color:#A6ACCD;">    ]</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h2 id="样式处理" tabindex="-1">样式处理 <a class="header-anchor" href="#样式处理" aria-label="Permalink to &quot;样式处理&quot;">​</a></h2><p>css 处理路径，webpack只能处理js</p><ol><li>js中引入css =》css loader =》style loader(把 css 写入 js，执行后作为 style 标签插入html)</li><li>js中引入css =》css loader =》mini-css-extract-plugin (提取css为独立文件)</li></ol><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm install css-loader style-loader mini-css-extract-plugin -D</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const minicss = require(&#39;mini-css-extract-plugin&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">rules: [</span></span>
<span class="line"><span style="color:#A6ACCD;">	{</span></span>
<span class="line"><span style="color:#A6ACCD;">		test: /\\.css$/i,</span></span>
<span class="line"><span style="color:#A6ACCD;">        // use: [&#39;style-loader&#39;, &#39;css-loader&#39;]</span></span>
<span class="line"><span style="color:#A6ACCD;">        use: [minicss.loader, &#39;css-loader&#39;]</span></span>
<span class="line"><span style="color:#A6ACCD;">	}</span></span>
<span class="line"><span style="color:#A6ACCD;">]</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 用于提取为独立文件</span></span>
<span class="line"><span style="color:#A6ACCD;">plugins: [</span></span>
<span class="line"><span style="color:#A6ACCD;">	new minicss({</span></span>
<span class="line"><span style="color:#A6ACCD;">		filename: &#39;test.bundle.css&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">	})</span></span>
<span class="line"><span style="color:#A6ACCD;">]</span></span></code></pre></div><ol start="3"><li>预处理语言</li></ol><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm i less less-loader -D</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">{</span></span>
<span class="line"><span style="color:#A6ACCD;">	test: /\\.less/,</span></span>
<span class="line"><span style="color:#A6ACCD;">	use: [minicss.loader, &#39;css-loader&#39;, &#39;less-loader&#39;]</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><ol start="4"><li>压缩</li></ol><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm i css-minimizer-webpack-plugin -D</span></span></code></pre></div><h2 id="资源文件" tabindex="-1">资源文件 <a class="header-anchor" href="#资源文件" aria-label="Permalink to &quot;资源文件&quot;">​</a></h2><ul><li>css 文件中引入 =》file-loader| url-loader(webpack5自带支持) =》一些优化操作（hash、转base64等）</li><li>如果需要自定义配置，需要安装 file-loader url-loader</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm i file-loader url-loader -D</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">{</span></span>
<span class="line"><span style="color:#A6ACCD;">	test: /\\.(png|svg|jpg|jpeg|gif)$/i,</span></span>
<span class="line"><span style="color:#A6ACCD;">	type: &#39;asset&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">		parser: {</span></span>
<span class="line"><span style="color:#A6ACCD;">			dataUrlCondition: {</span></span>
<span class="line"><span style="color:#A6ACCD;">			maxSize: 4 * 1024 // 4kb</span></span>
<span class="line"><span style="color:#A6ACCD;">		}</span></span>
<span class="line"><span style="color:#A6ACCD;">	},</span></span>
<span class="line"><span style="color:#A6ACCD;">	generator: {</span></span>
<span class="line"><span style="color:#A6ACCD;">		filename: &#39;[name].[hash][ext]&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">	}</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">/* {</span></span>
<span class="line"><span style="color:#A6ACCD;">test: /\\.(png|svg|jpg|jpeg|gif)$/i,</span></span>
<span class="line"><span style="color:#A6ACCD;">loader: &#39;url-loader&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">options: {</span></span>
<span class="line"><span style="color:#A6ACCD;">	// 小于 5 kb</span></span>
<span class="line"><span style="color:#A6ACCD;">	limit: 5 * 1024,</span></span>
<span class="line"><span style="color:#A6ACCD;">	name: &#39;[name].[hash:4].[ext]&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">} */</span></span></code></pre></div><ul><li>webpack 对资源文件的处理更推荐 type 的处理</li><li><code>asset/resource</code> 发送一个单独的文件并导出 URL。之前通过使用 <code>file-loader</code> 实现。</li><li><code>asset/inline</code> 导出一个资源的 data URI。之前通过使用 <code>url-loader</code> 实现。</li><li><code>asset/source</code> 导出资源的源代码。之前通过使用 <code>raw-loader</code> 实现。</li><li><code>asset</code> 在导出一个 data URI 和发送一个单独的文件之间自动选择。之前通过使用 <code>url-loader</code>，并且配置资源体积限制实现。</li></ul><h2 id="loader-原理" tabindex="-1">loader 原理 <a class="header-anchor" href="#loader-原理" aria-label="Permalink to &quot;loader 原理&quot;">​</a></h2><ul><li>接收内容，对内容进行处理并返回</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// mycss-loader/index.js</span></span>
<span class="line"><span style="color:#A6ACCD;">module.exports = function (cssContent) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    cssContent = cssContent.replace(&#39;0&#39;, &#39;1px&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    return cssContent</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">{</span></span>
<span class="line"><span style="color:#A6ACCD;">	test: /\\.css$/i,</span></span>
<span class="line"><span style="color:#A6ACCD;">    // use: [&#39;style-loader&#39;, &#39;css-loader&#39;]</span></span>
<span class="line"><span style="color:#A6ACCD;">    use: [minicss.loader, &#39;css-loader&#39;, &#39;./mycss-loader&#39;]</span></span>
<span class="line"><span style="color:#A6ACCD;">},</span></span></code></pre></div><h2 id="html-处理" tabindex="-1">html 处理 <a class="header-anchor" href="#html-处理" aria-label="Permalink to &quot;html 处理&quot;">​</a></h2><p><strong>期望</strong></p><ol><li>提供一个html模板，复用固定功能</li><li>打包的时候生成一个html</li><li>打包出来的html自动引入js</li></ol><p><strong>安装</strong></p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm i html-webpack-plugin -D</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// index.html</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;!DOCTYPE html&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;html lang=&quot;en&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;head&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;meta charset=&quot;UTF-8&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;meta name=&quot;viewport&quot; content=&quot;width=device-width, initial-scale=1.0&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;title&gt;webpack&lt;/title&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/head&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;body&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;div id=&quot;app&quot;&gt;&lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/body&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/html&gt;</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">new htmlwebpackplugin({</span></span>
<span class="line"><span style="color:#A6ACCD;">	template: &#39;./index.html&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">	filename: &#39;index.html&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">	// 生产默认开启了压缩等功能</span></span>
<span class="line"><span style="color:#A6ACCD;">	minify: {</span></span>
<span class="line"><span style="color:#A6ACCD;">        collapseWhitespace: true,</span></span>
<span class="line"><span style="color:#A6ACCD;">        removeComments: true,</span></span>
<span class="line"><span style="color:#A6ACCD;">        removeAttributeQuotes: true</span></span>
<span class="line"><span style="color:#A6ACCD;">	}</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span></code></pre></div><h2 id="代码分割" tabindex="-1">代码分割 <a class="header-anchor" href="#代码分割" aria-label="Permalink to &quot;代码分割&quot;">​</a></h2><ul><li>如果文件全打包在一个文件里，会导致文件过大，首屏加载慢</li><li>如果分割过多会导致http请求数量过多</li><li>需要分割的应该是文件特别大而且首屏不需要的</li><li>splitChunks <ul><li>async：异步代码</li><li>initial：同步代码</li><li>all：两者</li></ul></li><li>minChunks: 1 :被引用次数大于多少才分隔</li><li>minSize: 0 ：多大的才分隔</li><li>maxSize: 超过多大继续分</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">optimization: {</span></span>
<span class="line"><span style="color:#A6ACCD;">	splitChunks: {</span></span>
<span class="line"><span style="color:#A6ACCD;">        chunks: &#39;all&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">        minChunks: 1,</span></span>
<span class="line"><span style="color:#A6ACCD;">        minSize: 0,</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 单独定义分隔规则（单独打包第三方库）</span></span>
<span class="line"><span style="color:#A6ACCD;">    	cacheGroups: {</span></span>
<span class="line"><span style="color:#A6ACCD;">            vendor: {</span></span>
<span class="line"><span style="color:#A6ACCD;">                test: /[\\\\/]node_modules[\\\\/]/,</span></span>
<span class="line"><span style="color:#A6ACCD;">                filename: &#39;vendor.js&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">                chunks: &#39;all&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">                minChunks: 1</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">		}</span></span>
<span class="line"><span style="color:#A6ACCD;">	},</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 运行时的代码打包成一个文件</span></span>
<span class="line"><span style="color:#A6ACCD;">    runtimeChunk: {</span></span>
<span class="line"><span style="color:#A6ACCD;">        name: &#39;runtime&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h2 id="技巧性配置" tabindex="-1">技巧性配置 <a class="header-anchor" href="#技巧性配置" aria-label="Permalink to &quot;技巧性配置&quot;">​</a></h2><ul><li><p>hash 值的意义</p><ul><li>避免浏览器缓存没有变更</li></ul></li><li><p>resolve</p><ul><li><p>alias: 别名，提供路由简写</p></li><li><p>Extensions: 扩展省略，定义可省略的扩展名</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">resolve: {</span></span>
<span class="line"><span style="color:#A6ACCD;">	alias: {</span></span>
<span class="line"><span style="color:#A6ACCD;">		&#39;@&#39;: path.resolve(__dirname)</span></span>
<span class="line"><span style="color:#A6ACCD;">	},</span></span>
<span class="line"><span style="color:#A6ACCD;">	extensions: [&#39;.js&#39;, &#39;.css&#39;, &#39;.json&#39;]</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div></li></ul></li><li><p>require.context</p><ul><li><p>批量引入指定文件夹下的所有文件</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// index.js</span></span>
<span class="line"><span style="color:#A6ACCD;">// 批量引入 (路径,是否引入子文件,匹配规则)</span></span>
<span class="line"><span style="color:#A6ACCD;">let _all = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">const r = require.context(&#39;@/total&#39;, false, /.js/)</span></span>
<span class="line"><span style="color:#A6ACCD;">r.keys().forEach(item =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(r(item).default)</span></span>
<span class="line"><span style="color:#A6ACCD;">    _all += r(item).default</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(_all)</span></span></code></pre></div></li></ul></li><li><p>filename</p><ul><li><p>可以指定输出的文件夹， 有filename这个选项的都可以</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">new minicss({</span></span>
<span class="line"><span style="color:#A6ACCD;">   filename: &#39;./css/test.bundle.css&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 添加路径 &#39;./css&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">new minicss({</span></span>
<span class="line"><span style="color:#A6ACCD;">   filename: &#39;./css/test.bundle.css&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}),</span></span></code></pre></div></li></ul></li><li><p>publicPath</p><ul><li><p>用于在html引入的时候作为前缀，一般作为cdn使用</p></li><li><p>其打包出来的html引用会加上</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">output: {</span></span>
<span class="line"><span style="color:#A6ACCD;">    publicPath: &#39;www.baidu.com&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div></li></ul></li></ul><h2 id="开发模式" tabindex="-1">开发模式 <a class="header-anchor" href="#开发模式" aria-label="Permalink to &quot;开发模式&quot;">​</a></h2><ul><li>mode</li><li>devServer</li><li>source-map</li></ul><p><strong>配置</strong></p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">devServer: {</span></span>
<span class="line"><span style="color:#A6ACCD;">	port: 1000,</span></span>
<span class="line"><span style="color:#A6ACCD;">	hot: true,</span></span>
<span class="line"><span style="color:#A6ACCD;">	proxy: {</span></span>
<span class="line"><span style="color:#A6ACCD;">		&#39;/&#39;: {</span></span>
<span class="line"><span style="color:#A6ACCD;">			target: &#39;http://localhost:3000&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">		}</span></span>
<span class="line"><span style="color:#A6ACCD;">	}</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><p><strong>服务器</strong></p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// express.js</span></span>
<span class="line"><span style="color:#A6ACCD;">const express = require(&#39;express&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">const app = new express()</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">app.get(&#39;/api/getNum&#39;, (req, res) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    res.status(200).end(&#39;hello world&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">app.listen(3000)</span></span></code></pre></div><p><strong>请求</strong></p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">import axios from &#39;axios&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">axios.get(&#39;/api/getNum&#39;).then(res =&gt; console.log(res))</span></span></code></pre></div><h2 id="实战技巧" tabindex="-1">实战技巧 <a class="header-anchor" href="#实战技巧" aria-label="Permalink to &quot;实战技巧&quot;">​</a></h2><ul><li><p>配置拆分</p><ul><li>cross-env</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm i cross-env -D</span></span></code></pre></div><ul><li>package.json</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&quot;start&quot;: &quot;cross-env NODE_ENV=development webpack-dev-server --config ./webpack.dev.js&quot;,</span></span>
<span class="line"><span style="color:#A6ACCD;">        &quot;build&quot;: &quot;cross-env NODE_ENV=production webpack --config ./webpack.pro.js&quot;</span></span></code></pre></div><ul><li>编程式配置</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">let pluginArr = [</span></span>
<span class="line"><span style="color:#A6ACCD;">    new htmlwebpackplugin({</span></span>
<span class="line"><span style="color:#A6ACCD;">        template: &#39;./index.html&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">        filename: &#39;index.html&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">        minify: {</span></span>
<span class="line"><span style="color:#A6ACCD;">            // collapseWhitespace: true,</span></span>
<span class="line"><span style="color:#A6ACCD;">            // removeComments: true,</span></span>
<span class="line"><span style="color:#A6ACCD;">            // removeAttributeQuotes: true</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">]</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">function hasMiniCss() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (p<wbr>rocess.env.NODE_ENV === &#39;production&#39;) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        pluginArr.push(new minimizer())</span></span>
<span class="line"><span style="color:#A6ACCD;">        pluginArr.push(</span></span>
<span class="line"><span style="color:#A6ACCD;">            new minicss({</span></span>
<span class="line"><span style="color:#A6ACCD;">                filename: &#39;./css/test.bundle.css&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">            })</span></span>
<span class="line"><span style="color:#A6ACCD;">        )</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">hasMiniCss()</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">module.exports = {</span></span>
<span class="line"><span style="color:#A6ACCD;">	plugins: pluginArr</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div></li><li><p>打包分析</p><ul><li>官方方案：--json 输出打包结果分析</li><li>webpack-bundle-analyzer</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const bundleanlyzer = require(&#39;webpack-bundle-analyzer&#39;).BundleAnalyzerPlugin</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">plugins: [</span></span>
<span class="line"><span style="color:#A6ACCD;">	new bundleanlyzer()</span></span>
<span class="line"><span style="color:#A6ACCD;">]</span></span></code></pre></div></li><li><p>提升打包速度</p><ul><li>提前打包不变的包（如库）=》通知到正式打包=》Dll 处理过的不再处理</li><li>webpack.dll.js</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const webpack = require(&#39;webpack&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">module.exports = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    mode: &#39;production&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    entry: {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 把axios单独打包</span></span>
<span class="line"><span style="color:#A6ACCD;">        vendor: [&#39;axios&#39;]</span></span>
<span class="line"><span style="color:#A6ACCD;">    },</span></span>
<span class="line"><span style="color:#A6ACCD;">    output: {</span></span>
<span class="line"><span style="color:#A6ACCD;">        path: __dirname + &#39;/dist&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">        filename: &#39;[name].dll.js&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">        library: &#39;[name]_library&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">    },</span></span>
<span class="line"><span style="color:#A6ACCD;">    plugins: [</span></span>
<span class="line"><span style="color:#A6ACCD;">        new webpack.DllPlugin({</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 这里会输出一个json文件</span></span>
<span class="line"><span style="color:#A6ACCD;">            path: __dirname + &#39;/[name]-manifest.json&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">            name: &#39;[name]_library&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">            context: __dirname</span></span>
<span class="line"><span style="color:#A6ACCD;">        })</span></span>
<span class="line"><span style="color:#A6ACCD;">    ]</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><ul><li>package.json</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&quot;dll&quot;: &quot;webpack --config ./webpack.dll.js&quot;</span></span></code></pre></div><ul><li>webpack.pro.js</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">plugins: [</span></span>
<span class="line"><span style="color:#A6ACCD;">	new webpack.DllReferencePlugin({</span></span>
<span class="line"><span style="color:#A6ACCD;">		manifest: require(__dirname + &#39;/vendor-manifest.json&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">	})</span></span>
<span class="line"><span style="color:#A6ACCD;">]</span></span></code></pre></div><ul><li>模板index.html</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;script src=&quot;vendor.dll.js&quot;&gt;&lt;/script&gt;</span></span></code></pre></div></li><li><p>tree-sharking</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">optimization: {</span></span>
<span class="line"><span style="color:#A6ACCD;">    usedExports: true</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div></li></ul><h2 id="优化打包总结" tabindex="-1">优化打包总结 <a class="header-anchor" href="#优化打包总结" aria-label="Permalink to &quot;优化打包总结&quot;">​</a></h2><ul><li>js 代码压缩</li><li>css 代码压缩</li><li>Html 文件代码压缩</li><li>文件大小压缩</li><li>图片压缩</li><li>Tree Shaking</li><li>split Chunks</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">optimization: {</span></span>
<span class="line"><span style="color:#A6ACCD;">    ...</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><ul><li>prefetch、preload <ul><li>Preload 是一种强制立即获取关键资源的机制，适用于当前页面加载所必需的资源。</li><li>Prefetch 是一种在空闲时间异步获取非关键资源的机制，适用于提前获取可能在未来导航中使用的资源。</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;link rel=&quot;prefetch&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;link rel=&quot;preload&quot;&gt;</span></span></code></pre></div></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const PreloadWebpackPlugin = require(&quot;@vue/preload-webpack-plugin&quot;)</span></span>
<span class="line"><span style="color:#A6ACCD;"> new PreloadWebpackPlugin({</span></span>
<span class="line"><span style="color:#A6ACCD;">    rel: &quot;preload&quot;, // preload兼容性更好</span></span>
<span class="line"><span style="color:#A6ACCD;">    as: &quot;script&quot;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    // rel: &#39;prefetch&#39; // prefetch兼容性更差</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span></code></pre></div>`,58),o=[e];function t(c,i,r,C,A,d){return a(),n("div",null,o)}const D=s(p,[["render",t]]);export{u as __pageData,D as default};
