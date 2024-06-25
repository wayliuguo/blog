import{_ as s,o as n,c as a,U as l}from"./chunks/framework.9adb0f96.js";const p="/blog/assets/image-20231215235603959.22fe29b5.png",e="/blog/assets/image-20231216150220843.2c06ca83.png",D=JSON.parse('{"title":"脚手架开发流程","description":"","frontmatter":{},"headers":[],"relativePath":"node/cliBasic.md","filePath":"node/cliBasic.md","lastUpdated":1708354703000}'),o={name:"node/cliBasic.md"},i=l(`<h1 id="脚手架开发流程" tabindex="-1">脚手架开发流程 <a class="header-anchor" href="#脚手架开发流程" aria-label="Permalink to &quot;脚手架开发流程&quot;">​</a></h1><h2 id="开发流程" tabindex="-1">开发流程 <a class="header-anchor" href="#开发流程" aria-label="Permalink to &quot;开发流程&quot;">​</a></h2><ul><li><p>创建<code>npm</code>项目</p></li><li><p>创建脚手架入口文件，最上方添加：</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">#!/usr/bin/env node</span></span></code></pre></div></li><li><p>配置<code>package.json</code>，添加<code>bin</code>属性</p><ul><li>通过<code>bin</code>属性及对应的入口文件地址</li></ul></li><li><p>编写脚手架代码</p></li><li><p>将脚手架发布到<code>npm</code></p></li></ul><h2 id="难点解析" tabindex="-1">难点解析 <a class="header-anchor" href="#难点解析" aria-label="Permalink to &quot;难点解析&quot;">​</a></h2><ul><li>分包：将复杂的系统拆分成若干个模块</li><li>命令注册,如：</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">vue create</span></span>
<span class="line"><span style="color:#A6ACCD;">vue add</span></span>
<span class="line"><span style="color:#A6ACCD;">vue invoke</span></span></code></pre></div><ul><li>参数解析：</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">vue command [options] &lt;params&gt;</span></span></code></pre></div><ul><li><p>options全称：<code>--version</code>、<code>--help</code></p></li><li><p>options简写：<code>-v</code>、<code>-h</code></p></li><li><p>带 params 的options：<code>--path /Users/well/xxx</code></p></li><li><p>帮助文档</p><ul><li>global help <ul><li>Usage</li><li>Options</li><li>Commands</li></ul></li></ul></li><li><p>示例：<code>vue</code>的帮助信息</p><ul><li>脚手架帮助信息</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">Usage: vue &lt;command&gt; [options]</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">Options:</span></span>
<span class="line"><span style="color:#A6ACCD;">  -V, --version                              output the version number</span></span>
<span class="line"><span style="color:#A6ACCD;">  -h, --help                                 display help for command</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">Commands:</span></span>
<span class="line"><span style="color:#A6ACCD;">  create [options] &lt;app-name&gt;                create a new project powered by vue-cli-service</span></span>
<span class="line"><span style="color:#A6ACCD;">  add [options] &lt;plugin&gt; [pluginOptions]     install a plugin and invoke its generator in an already created project</span></span>
<span class="line"><span style="color:#A6ACCD;">  invoke [options] &lt;plugin&gt; [pluginOptions]  invoke the generator of a plugin in an already created project</span></span>
<span class="line"><span style="color:#A6ACCD;">  inspect [options] [paths...]               inspect the webpack config in a project with vue-cli-service</span></span>
<span class="line"><span style="color:#A6ACCD;">  serve                                      alias of &quot;npm run serve&quot; in the current project</span></span>
<span class="line"><span style="color:#A6ACCD;">  build                                      alias of &quot;npm run build&quot; in the current project</span></span>
<span class="line"><span style="color:#A6ACCD;">  ui [options]                               start and open the vue-cli ui</span></span>
<span class="line"><span style="color:#A6ACCD;">  init [options] &lt;template&gt; &lt;app-name&gt;       generate a project from a remote template (legacy API, requires @vue/cli-init)  </span></span>
<span class="line"><span style="color:#A6ACCD;">  config [options] [value]                   inspect and modify the config</span></span>
<span class="line"><span style="color:#A6ACCD;">  outdated [options]                         (experimental) check for outdated vue cli service / plugins</span></span>
<span class="line"><span style="color:#A6ACCD;">  upgrade [options] [plugin-name]            (experimental) upgrade vue cli service / plugins</span></span>
<span class="line"><span style="color:#A6ACCD;">  migrate [options] [plugin-name]            (experimental) run migrator for an already-installed cli plugin</span></span>
<span class="line"><span style="color:#A6ACCD;">  info                                       print debugging information about your environment</span></span>
<span class="line"><span style="color:#A6ACCD;">  help [command]                             display help for command</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">  Run vue &lt;command&gt; --help for detailed usage of given command.</span></span></code></pre></div><ul><li>脚手架帮助信息：<code>vue &lt;command&gt; --help</code>，如 <code>vue create --help</code></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">Usage: vue create [options] &lt;app-name&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">create a new project powered by vue-cli-service</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">Options:</span></span>
<span class="line"><span style="color:#A6ACCD;">  -p, --preset &lt;presetName&gt;       Skip prompts and use saved or remote preset</span></span>
<span class="line"><span style="color:#A6ACCD;">  -d, --default                   Skip prompts and use default preset</span></span>
<span class="line"><span style="color:#A6ACCD;">  -i, --inlinePreset &lt;json&gt;       Skip prompts and use inline JSON string as preset</span></span>
<span class="line"><span style="color:#A6ACCD;">  -m, --packageManager &lt;command&gt;  Use specified npm client when installing dependencies</span></span>
<span class="line"><span style="color:#A6ACCD;">  -r, --registry &lt;url&gt;            Use specified npm registry when installing dependencies (only for npm)</span></span>
<span class="line"><span style="color:#A6ACCD;">  -g, --git [message]             Force git initialization with initial commit message</span></span>
<span class="line"><span style="color:#A6ACCD;">  -n, --no-git                    Skip git initialization</span></span>
<span class="line"><span style="color:#A6ACCD;">  -f, --force                     Overwrite target directory if it exists</span></span>
<span class="line"><span style="color:#A6ACCD;">  --merge                         Merge target directory if it exists</span></span>
<span class="line"><span style="color:#A6ACCD;">  -c, --clone                     Use git clone when fetching remote preset</span></span>
<span class="line"><span style="color:#A6ACCD;">  -x, --proxy &lt;proxyUrl&gt;          Use specified proxy when creating project</span></span>
<span class="line"><span style="color:#A6ACCD;">  -b, --bare                      Scaffold project without beginner instructions</span></span>
<span class="line"><span style="color:#A6ACCD;">  --skipGetStarted                Skip displaying &quot;Get started&quot; instructions</span></span>
<span class="line"><span style="color:#A6ACCD;">  -h, --help                      display help for command</span></span></code></pre></div></li><li><p>其他</p><ul><li>命令行交互</li><li>日志打印</li><li>命令行文字变色</li><li>网络通信：HTTP/WebSocket</li><li>文件处理</li></ul></li></ul><h1 id="第一个脚手架" tabindex="-1">第一个脚手架 <a class="header-anchor" href="#第一个脚手架" aria-label="Permalink to &quot;第一个脚手架&quot;">​</a></h1><h2 id="快速发布第一个脚手架" tabindex="-1">快速发布第一个脚手架 <a class="header-anchor" href="#快速发布第一个脚手架" aria-label="Permalink to &quot;快速发布第一个脚手架&quot;">​</a></h2><ol><li><p>文件路径</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">weicli</span></span>
<span class="line"><span style="color:#A6ACCD;">	- bin</span></span>
<span class="line"><span style="color:#A6ACCD;">		- index.js</span></span>
<span class="line"><span style="color:#A6ACCD;">package.json</span></span></code></pre></div></li><li><p><code>package.json</code></p></li></ol><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&quot;name&quot;: &quot;@well_haha/weicli&quot;,</span></span>
<span class="line"><span style="color:#A6ACCD;">&quot;bin&quot;: {</span></span>
<span class="line"><span style="color:#A6ACCD;">    &quot;weicli&quot;: &quot;bin/index.js&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><ol start="3"><li><code>bin/index.js</code></li></ol><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">#!/usr/bin/env node</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(&#39;一个最简单的脚手架！&#39;)</span></span></code></pre></div><ol start="4"><li><code>npm login</code>，<code>npm publish</code></li></ol><p>登录的过程中遇到高版本<code>node</code>无法登录的情况，在切换<code>node</code>版本后登录上再切换回来</p><ol start="5"><li>使用</li></ol><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm i @well_haha/weicli -g</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">weicli</span></span></code></pre></div><h2 id="如何调试本地脚手架" tabindex="-1">如何调试本地脚手架 <a class="header-anchor" href="#如何调试本地脚手架" aria-label="Permalink to &quot;如何调试本地脚手架&quot;">​</a></h2><ol><li>在文件目录执行 npm link</li></ol><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// weicli 目录</span></span>
<span class="line"><span style="color:#A6ACCD;">npm link</span></span></code></pre></div><p>此时，我们的npm 全局模块上就会增加生成软链</p><p><img src="`+p+`" alt="image-20231215235603959"></p><ol start="2"><li>解除本地链接</li></ol><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm unlink weicli</span></span></code></pre></div><p>试了不行，就直接到全局模块上删掉软链入口就好了</p><h2 id="调试库文件" tabindex="-1">调试库文件 <a class="header-anchor" href="#调试库文件" aria-label="Permalink to &quot;调试库文件&quot;">​</a></h2><ol><li>文件目录</li></ol><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">weiclilib</span></span>
<span class="line"><span style="color:#A6ACCD;">  - lib</span></span>
<span class="line"><span style="color:#A6ACCD;">    - index.js</span></span>
<span class="line"><span style="color:#A6ACCD;">package.json</span></span></code></pre></div><ol start="2"><li>lib/index.js</li></ol><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">module.exports = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    sum(a, b) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        return a + b</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><ol start="3"><li>package.json</li></ol><p><code>main</code>的作用，是该文件作为库时的入口</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&quot;name&quot;: &quot;weiclilib&quot;,</span></span>
<span class="line"><span style="color:#A6ACCD;">&quot;version&quot;: &quot;1.0.0&quot;,</span></span>
<span class="line"><span style="color:#A6ACCD;">&quot;main&quot;: &quot;lib/index.js&quot;</span></span></code></pre></div><ol start="4"><li><p>使用</p><ol><li>手动添加依赖</li></ol><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// weicli/package.json</span></span>
<span class="line"><span style="color:#A6ACCD;">&quot;dependencies&quot;: {</span></span>
<span class="line"><span style="color:#A6ACCD;">    &quot;weiclilib&quot;: &quot;^1.0.0&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><ol start="2"><li>weicli 目录下执行-添加软链</li></ol><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// weicli 目录下执行-添加软链</span></span>
<span class="line"><span style="color:#A6ACCD;">npm link weiclilib</span></span></code></pre></div><p>测试weicli 下会增加一个node_modules 文件夹</p><p><img src="`+e+`" alt="image-20231216150220843"></p><ol start="3"><li>执行，在脚手架中调用库文件即可</li></ol><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// weicli/bin/index.js</span></span>
<span class="line"><span style="color:#A6ACCD;">#!/usr/bin/env node</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const lib = require(&#39;weiclilib&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(lib.sum(1, 2))</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(&#39;一个最简单的脚手架！&#39;)</span></span></code></pre></div></li></ol><h2 id="脚手架命令注册和参数解释" tabindex="-1">脚手架命令注册和参数解释 <a class="header-anchor" href="#脚手架命令注册和参数解释" aria-label="Permalink to &quot;脚手架命令注册和参数解释&quot;">​</a></h2><h3 id="参数解释" tabindex="-1">参数解释 <a class="header-anchor" href="#参数解释" aria-label="Permalink to &quot;参数解释&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// weicli/bin/index.js</span></span>
<span class="line"><span style="color:#A6ACCD;">#!/usr/bin/env node</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(require(&#39;process&#39;).argv)</span></span></code></pre></div><p>执行 <code>weicli init </code></p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">[</span></span>
<span class="line"><span style="color:#A6ACCD;">  &#39;C:\\\\Program Files\\\\nodejs\\\\node.exe&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">  &#39;C:\\\\Program Files\\\\nodejs\\\\node_modules\\\\@well_haha\\\\weicli\\\\bin\\\\index.js&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">  &#39;init&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">]</span></span></code></pre></div><p>可以通过 argv[2]来获取参数</p><h3 id="简单demo" tabindex="-1">简单demo <a class="header-anchor" href="#简单demo" aria-label="Permalink to &quot;简单demo&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// weiclilib/lib/index.js</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">module.exports = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    init({ option, param }) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(&#39;执行init流程&#39;, option, param)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">#!/usr/bin/env node</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const lib = require(&#39;weiclilib&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">const argv = require(&#39;process&#39;).argv</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 脚手架第一个参数</span></span>
<span class="line"><span style="color:#A6ACCD;">const command = argv[2]</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 脚手架第一个参数后的参数</span></span>
<span class="line"><span style="color:#A6ACCD;">const options = argv.slice(3)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">if (options.length) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let [option, param] = options</span></span>
<span class="line"><span style="color:#A6ACCD;">    option = option.replace(&#39;--&#39;, &#39;&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    if (command) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (lib[command]) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            lib[command]({ option, param })</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">            console.log(&#39;请输入正确命令&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(&#39;请输入命令&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 实现全局参数解释 --version -V</span></span>
<span class="line"><span style="color:#A6ACCD;">if (command.startsWith(&#39;--&#39;) || command.startsWith(&#39;-&#39;)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const globalOption = command.replace(/--|-/g, &#39;&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (globalOption === &#39;V&#39; || globalOption === &#39;version&#39;) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(&#39;1.0.0&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><ol><li>解析命令并调用库文件的方法</li></ol><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">weicli init --name well </span></span>
<span class="line"><span style="color:#A6ACCD;">// 执行init流程 name well</span></span></code></pre></div><ol start="2"><li>测试全局函数</li></ol><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">weicli -version</span></span>
<span class="line"><span style="color:#A6ACCD;">// 1.0.0</span></span></code></pre></div><h2 id="发布上线" tabindex="-1">发布上线 <a class="header-anchor" href="#发布上线" aria-label="Permalink to &quot;发布上线&quot;">​</a></h2><ol><li><p>先发布库文件</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm publish</span></span></code></pre></div></li><li><p>解除脚手架与库文件的软链接，直接安装线上包</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm unlink weiclilib</span></span>
<span class="line"><span style="color:#A6ACCD;">npm i weiclilib</span></span></code></pre></div></li><li><p>发布脚手架包即可</p></li></ol><h1 id="脚手架yargs框架" tabindex="-1">脚手架yargs框架 <a class="header-anchor" href="#脚手架yargs框架" aria-label="Permalink to &quot;脚手架yargs框架&quot;">​</a></h1><h2 id="入门" tabindex="-1">入门 <a class="header-anchor" href="#入门" aria-label="Permalink to &quot;入门&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">#!/usr/bin/env node</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const yargs = require(&#39;yargs/yargs&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">const { hideBin } = require(&#39;yargs/helpers&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const arg = hideBin(process.argv)</span></span>
<span class="line"><span style="color:#A6ACCD;">const cli = yargs(arg)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">yargs(arg)</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 用法介绍</span></span>
<span class="line"><span style="color:#A6ACCD;">    .usage(&#39;Usage: weicli [command] &lt;options&gt;&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 提示</span></span>
<span class="line"><span style="color:#A6ACCD;">    .demandCommand(1, &#39;A command is required. Pass --help to see all avaliable commands and options.&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 严格模式</span></span>
<span class="line"><span style="color:#A6ACCD;">    .strict()</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 别名</span></span>
<span class="line"><span style="color:#A6ACCD;">    .alias(&#39;h&#39;, &#39;help&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    .alias(&#39;v&#39;, &#39;version&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 设置文本宽度为terminal宽度</span></span>
<span class="line"><span style="color:#A6ACCD;">    .wrap(cli.terminalWidth())</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 结尾文案</span></span>
<span class="line"><span style="color:#A6ACCD;">    .epilogue(&#39;Your own footer description&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    .options({</span></span>
<span class="line"><span style="color:#A6ACCD;">        debug: {</span></span>
<span class="line"><span style="color:#A6ACCD;">            type: &#39;boolean&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">            description: &#39;Boostrap debug mode&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">            alias: &#39;d&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">    .options(&#39;registery&#39;, {</span></span>
<span class="line"><span style="color:#A6ACCD;">        type: &#39;string&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">        describe: &#39;Define global registry&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">        alias: &#39;r&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 分组</span></span>
<span class="line"><span style="color:#A6ACCD;">    .group([&#39;debug&#39;], &#39;Dev Options:&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    .group([&#39;registry&#39;], &#39;Extra Options&#39;).argv</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">PS E:\\working\\blog&gt; weicli   </span></span>
<span class="line"><span style="color:#A6ACCD;">Usage: weicli [command] &lt;options&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">Dev Options:</span></span>
<span class="line"><span style="color:#A6ACCD;">  -d, --debug  Boostrap debug mode                                                        [boolean]</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">Extra Options</span></span>
<span class="line"><span style="color:#A6ACCD;">      --registry</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">Options:</span></span>
<span class="line"><span style="color:#A6ACCD;">  -r, --registery  Define global registry                                                  [string]  -h, --help       Show help                                                              [boolean]  -v, --version    Show version number                                                    [boolean]</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">Your own footer description</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">A command is required. Pass --help to see all avaliable commands and options.</span></span></code></pre></div><h2 id="高级用法" tabindex="-1">高级用法 <a class="header-anchor" href="#高级用法" aria-label="Permalink to &quot;高级用法&quot;">​</a></h2><p>一下代码主要通过 command 注册了两个命令</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">#!/usr/bin/env node</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const yargs = require(&#39;yargs/yargs&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">const { hideBin } = require(&#39;yargs/helpers&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">const { argv } = require(&#39;yargs&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const arg = hideBin(process.argv)</span></span>
<span class="line"><span style="color:#A6ACCD;">const cli = yargs(arg)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">yargs(arg)</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 用法介绍</span></span>
<span class="line"><span style="color:#A6ACCD;">    .usage(&#39;Usage: weicli [command] &lt;options&gt;&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 提示</span></span>
<span class="line"><span style="color:#A6ACCD;">    .demandCommand(1, &#39;A command is required. Pass --help to see all avaliable commands and options.&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 严格模式</span></span>
<span class="line"><span style="color:#A6ACCD;">    .strict()</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 未识别时推荐</span></span>
<span class="line"><span style="color:#A6ACCD;">    .recommendCommands()</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 别名</span></span>
<span class="line"><span style="color:#A6ACCD;">    .alias(&#39;h&#39;, &#39;help&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    .alias(&#39;v&#39;, &#39;version&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 设置文本宽度为terminal宽度</span></span>
<span class="line"><span style="color:#A6ACCD;">    .wrap(cli.terminalWidth())</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 结尾文案</span></span>
<span class="line"><span style="color:#A6ACCD;">    .epilogue(&#39;Your own footer description&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    .options({</span></span>
<span class="line"><span style="color:#A6ACCD;">        debug: {</span></span>
<span class="line"><span style="color:#A6ACCD;">            type: &#39;boolean&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">            description: &#39;Boostrap debug mode&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">            alias: &#39;d&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">    .options(&#39;registery&#39;, {</span></span>
<span class="line"><span style="color:#A6ACCD;">        type: &#39;string&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">        describe: &#39;Define global registry&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">        alias: &#39;r&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 分组</span></span>
<span class="line"><span style="color:#A6ACCD;">    .group([&#39;debug&#39;], &#39;Dev Options:&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 命令</span></span>
<span class="line"><span style="color:#A6ACCD;">    .command(</span></span>
<span class="line"><span style="color:#A6ACCD;">        &#39;init [name]&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">        &#39;Do init a project&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">        yargs =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            yargs.options(&#39;name&#39;, {</span></span>
<span class="line"><span style="color:#A6ACCD;">                type: &#39;string&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">                describe: &#39;Name of a project&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">            })</span></span>
<span class="line"><span style="color:#A6ACCD;">        },</span></span>
<span class="line"><span style="color:#A6ACCD;">        argv =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            console.log(argv)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    )</span></span>
<span class="line"><span style="color:#A6ACCD;">    .command({</span></span>
<span class="line"><span style="color:#A6ACCD;">        command: &#39;list&#39;, // 命令</span></span>
<span class="line"><span style="color:#A6ACCD;">        aliases: [&#39;ls&#39;, &#39;la&#39;, &#39;ll&#39;], // 别名</span></span>
<span class="line"><span style="color:#A6ACCD;">        describe: &#39;List Local packages&#39;, // 描述</span></span>
<span class="line"><span style="color:#A6ACCD;">        builder: yargs =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            // options 参数 （--list xxx）</span></span>
<span class="line"><span style="color:#A6ACCD;">            yargs.options(&#39;list&#39;, {</span></span>
<span class="line"><span style="color:#A6ACCD;">                type: &#39;string&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">                describe: &#39;List Local packages&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">            })</span></span>
<span class="line"><span style="color:#A6ACCD;">        },</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 处理函数</span></span>
<span class="line"><span style="color:#A6ACCD;">        handler: argv =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            console.log(argv)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">    .group([&#39;registry&#39;], &#39;Extra Options&#39;).argv</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">PS E:\\working\\blog\\code\\node\\weicli&gt; weicli init --name abc</span></span>
<span class="line"><span style="color:#A6ACCD;">{</span></span>
<span class="line"><span style="color:#A6ACCD;">  _: [ &#39;init&#39; ],</span></span>
<span class="line"><span style="color:#A6ACCD;">  name: &#39;abc&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">  &#39;$0&#39;: &#39;C:\\\\Program Files\\\\nodejs\\\\node_modules\\\\@well_haha\\\\weicli\\\\bin\\\\index.js&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">PS E:\\working\\blog\\code\\node\\weicli&gt; weicli list --list  abc</span></span>
<span class="line"><span style="color:#A6ACCD;">{</span></span>
<span class="line"><span style="color:#A6ACCD;">  _: [ &#39;list&#39; ],</span></span>
<span class="line"><span style="color:#A6ACCD;">  list: &#39;abc&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">  &#39;$0&#39;: &#39;C:\\\\Program Files\\\\nodejs\\\\node_modules\\\\@well_haha\\\\weicli\\\\bin\\\\index.js&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h1 id="脚手架command" tabindex="-1">脚手架command <a class="header-anchor" href="#脚手架command" aria-label="Permalink to &quot;脚手架command&quot;">​</a></h1>`,60),c=[i];function t(r,C,A,d,y,g){return n(),a("div",null,c)}const m=s(o,[["render",t]]);export{D as __pageData,m as default};
