import{_ as s,o as a,c as n,U as e}from"./chunks/framework.9adb0f96.js";const A=JSON.parse('{"title":"eslint","description":"","frontmatter":{},"headers":[],"relativePath":"article/project/normalizeConfig.md","filePath":"article/project/normalizeConfig.md","lastUpdated":1690211463000}'),l={name:"article/project/normalizeConfig.md"},t=e(`<h1 id="eslint" tabindex="-1">eslint <a class="header-anchor" href="#eslint" aria-label="Permalink to &quot;eslint&quot;">​</a></h1><p>eslint 是一个代码检测工具，用于检测代码中潜在的问题和错误，作用提高代码质量和规范</p><h2 id="安装" tabindex="-1">安装 <a class="header-anchor" href="#安装" aria-label="Permalink to &quot;安装&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm install eslint</span></span></code></pre></div><h2 id="构建配置文件" tabindex="-1">构建配置文件 <a class="header-anchor" href="#构建配置文件" aria-label="Permalink to &quot;构建配置文件&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm init @eslint/config</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 解决与eslint冲突</span></span>
<span class="line"><span style="color:#A6ACCD;">npm i  eslint-config-prettier eslint-plugin-prettier -D</span></span></code></pre></div><h2 id="eslintrc-js" tabindex="-1">.eslintrc.js <a class="header-anchor" href="#eslintrc-js" aria-label="Permalink to &quot;.eslintrc.js&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">module.exports = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    env: {</span></span>
<span class="line"><span style="color:#A6ACCD;">        browser: true,</span></span>
<span class="line"><span style="color:#A6ACCD;">        es2021: true,</span></span>
<span class="line"><span style="color:#A6ACCD;">        node: true</span></span>
<span class="line"><span style="color:#A6ACCD;">    },</span></span>
<span class="line"><span style="color:#A6ACCD;">    extends: [&#39;eslint:recommended&#39;, &#39;prettier&#39;],</span></span>
<span class="line"><span style="color:#A6ACCD;">    overrides: [</span></span>
<span class="line"><span style="color:#A6ACCD;">        {</span></span>
<span class="line"><span style="color:#A6ACCD;">            env: {</span></span>
<span class="line"><span style="color:#A6ACCD;">                node: true</span></span>
<span class="line"><span style="color:#A6ACCD;">            },</span></span>
<span class="line"><span style="color:#A6ACCD;">            files: [&#39;.eslintrc.{js,cjs}&#39;],</span></span>
<span class="line"><span style="color:#A6ACCD;">            parserOptions: {</span></span>
<span class="line"><span style="color:#A6ACCD;">                sourceType: &#39;script&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    ],</span></span>
<span class="line"><span style="color:#A6ACCD;">    plugins: [&#39;prettier&#39;],</span></span>
<span class="line"><span style="color:#A6ACCD;">    parserOptions: {</span></span>
<span class="line"><span style="color:#A6ACCD;">        ecmaVersion: &#39;latest&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">        sourceType: &#39;module&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">    },</span></span>
<span class="line"><span style="color:#A6ACCD;">    rules: {</span></span>
<span class="line"><span style="color:#A6ACCD;">        indent: [&#39;error&#39;, 4] // 用于指定代码缩进的方式，这里配置为使用四个空格进行缩进</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><p>关于 rules 可以按照<a href="https://github.com/eslint/eslint" target="_blank" rel="noreferrer">文档</a>进行配置</p><p>在配置中extends 与 plugins 增加了 <code>prettier</code>用于解决冲突</p><h1 id="prettier" tabindex="-1">prettier <a class="header-anchor" href="#prettier" aria-label="Permalink to &quot;prettier&quot;">​</a></h1><p>用于代码的格式化</p><h2 id="安装-1" tabindex="-1">安装 <a class="header-anchor" href="#安装-1" aria-label="Permalink to &quot;安装&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm install prettier --save-dev</span></span></code></pre></div><h2 id="配置" tabindex="-1">配置 <a class="header-anchor" href="#配置" aria-label="Permalink to &quot;配置&quot;">​</a></h2><ul><li><p>.prettierrc.js</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">module.exports = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    semi: false, //强制在语句末尾不使用分号。</span></span>
<span class="line"><span style="color:#A6ACCD;">    trailingComma: &#39;none&#39;, //不允许在多行结构的最后一个元素或属性后添加逗号。</span></span>
<span class="line"><span style="color:#A6ACCD;">    singleQuote: true, //使用单引号而不是双引号来定义字符串。</span></span>
<span class="line"><span style="color:#A6ACCD;">    printWidth: 120, //指定每行代码的最大字符宽度，超过这个宽度的代码将被换行</span></span>
<span class="line"><span style="color:#A6ACCD;">    tabWidth: 4, //指定一个制表符（Tab）等于多少个空格。</span></span>
<span class="line"><span style="color:#A6ACCD;">    singleQuote: true, //使用单引号</span></span>
<span class="line"><span style="color:#A6ACCD;">    arrowParens: &#39;avoid&#39;, //  箭头函数括号</span></span>
<span class="line"><span style="color:#A6ACCD;">    endOfLine: &#39;auto&#39;, // 结尾换行自动</span></span>
<span class="line"><span style="color:#A6ACCD;">    jsxBracketSameLine: true</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div></li><li><p>.prettierignore</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">node_modules</span></span>
<span class="line"><span style="color:#A6ACCD;">dist</span></span>
<span class="line"><span style="color:#A6ACCD;">package.json</span></span></code></pre></div></li></ul><h1 id="husky" tabindex="-1">husky <a class="header-anchor" href="#husky" aria-label="Permalink to &quot;husky&quot;">​</a></h1><p>husky 是一个 Git 钩子（Git hooks）工具，它可以让你在 Git 事件发生时执行脚本，进行代码格式化、测试等操作。</p><p>常见的钩子：</p><ul><li><code>pre-commit</code>：在执行 Git <code>commit</code> 命令之前触发，用于在提交代码前进行代码检查、格式化、测试等操作。</li><li><code>commit-msg</code>：在提交消息（commit message）被创建后，但提交操作尚未完成之前触发，用于校验提交消息的格式和内容。</li><li><code>pre-push</code>：在执行 Git <code>push</code> 命令之前触发，用于在推送代码前进行额外检查、测试等操作。</li></ul><h2 id="安装-2" tabindex="-1">安装 <a class="header-anchor" href="#安装-2" aria-label="Permalink to &quot;安装&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm install husky --save-dev</span></span></code></pre></div><h2 id="启用-git-钩子配置" tabindex="-1">启用 git 钩子配置 <a class="header-anchor" href="#启用-git-钩子配置" aria-label="Permalink to &quot;启用 git 钩子配置&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm pkg set scripts.prepare=&quot;husky install&quot;</span></span></code></pre></div><p>安装成功后 package.json 中 script 生成命令，且自动生成hasky目录</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&quot;prepare&quot;: &quot;husky install&quot;</span></span></code></pre></div><h2 id="创建-git-挂钩" tabindex="-1">创建 git 挂钩 <a class="header-anchor" href="#创建-git-挂钩" aria-label="Permalink to &quot;创建 git 挂钩&quot;">​</a></h2><p>用于在 git 提交之前做 eslint 语法校验。</p><h3 id="创建钩子文件" tabindex="-1">创建钩子文件 <a class="header-anchor" href="#创建钩子文件" aria-label="Permalink to &quot;创建钩子文件&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npx husky add .husky/pre-commit &quot;npm run lint&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">npx husky add .husky/commit-msg</span></span></code></pre></div><p>执行成功，.husky 目录多出一个 pre-commit 和 commit-msg 文件。</p><h3 id="对暂存区检测" tabindex="-1">对暂存区检测 <a class="header-anchor" href="#对暂存区检测" aria-label="Permalink to &quot;对暂存区检测&quot;">​</a></h3><p>下方代码添加到 pre-commit 文件中。<code>lint-staged</code>模块， 用于对 git 暂存区检测</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npx --no-install lint-staged</span></span></code></pre></div><p><code>npx --no-install lint-staged</code> 是一个命令，用于在不安装 lint-staged 的情况下运行该工具。<code>npx --no-install</code> 命令用于从远程下载并执行指定的命令。</p><h1 id="lint-staged" tabindex="-1">lint-staged <a class="header-anchor" href="#lint-staged" aria-label="Permalink to &quot;lint-staged&quot;">​</a></h1><p>作用：lint-staged 可以让你在 Git 暂存（staged）区域中的文件上运行脚本，通常用于在提交前对代码进行格式化、静态检查等操作。</p><p>使用方式：你可以在项目中使用 lint-staged 配合 husky 钩子来执行针对暂存文件的脚本。具体的使用步骤如下：</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm install lint-staged --save-dev</span></span></code></pre></div><p>在 <code>package.json</code> 文件中添加以下配置：</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&quot;lint-staged&quot;: {</span></span>
<span class="line"><span style="color:#A6ACCD;">	&quot;src/**/*.{js,jsx,ts,tsx}&quot;: [</span></span>
<span class="line"><span style="color:#A6ACCD;">		&quot;prettier --write&quot;,</span></span>
<span class="line"><span style="color:#A6ACCD;">		&quot;eslint --fix&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">	]</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><ul><li><code>&quot;src/**/*.{js,jsx,ts,tsx}&quot;</code> 是指定要针对的暂存文件模式，你可以根据自己的项目需求来配置。</li><li><code>[&quot;prettier --write&quot;,&quot;eslint --fix&quot;]</code>为校验命令，可执行 eslint 、prettier 等规则</li><li>配置后，在commit 前就会进行 prettier 和 eslint 的命令执行</li></ul><h1 id="commitizen" tabindex="-1">Commitizen <a class="header-anchor" href="#commitizen" aria-label="Permalink to &quot;Commitizen&quot;">​</a></h1><p>是一个命令行工具，用于以一致的方式编写规范的提交消息。在使用Commitizen之前，你需要安装Commitizen及其适配器。</p><h2 id="cz-conventional-changelog" tabindex="-1">cz-conventional-changelog <a class="header-anchor" href="#cz-conventional-changelog" aria-label="Permalink to &quot;cz-conventional-changelog&quot;">​</a></h2><p>是Commitizen的一个适配器，它实现了符合约定式提交（Conventional Commits）规范的提交消息。该规范定义了提交消息的格式和结构，并推荐了一些常用的提交类型和范围。</p><h2 id="安装和使用步骤" tabindex="-1">安装和使用步骤 <a class="header-anchor" href="#安装和使用步骤" aria-label="Permalink to &quot;安装和使用步骤&quot;">​</a></h2><ol><li>安装</li></ol><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm install --save-dev commitizen cz-conventional-changelog</span></span></code></pre></div><ol start="2"><li>package.json 添加 config</li></ol><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&quot;config&quot;: {</span></span>
<span class="line"><span style="color:#A6ACCD;">  &quot;commitizen&quot;: {</span></span>
<span class="line"><span style="color:#A6ACCD;">    &quot;path&quot;: &quot;cz-conventional-changelog&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><ol start="3"><li>packge.json 添加 scripts 下 commit</li></ol><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&quot;commit&quot;: &quot;git-cz&quot;</span></span></code></pre></div><ol start="4"><li><p>使用</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">git add .</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm run commit</span></span></code></pre></div><p>选择提交类型</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">? Select the type of change that you&#39;re committing: (Use arrow keys)</span></span>
<span class="line"><span style="color:#A6ACCD;">&gt; feat:     A new feature //新功能</span></span>
<span class="line"><span style="color:#A6ACCD;">  fix:      A bug fix //错误修复</span></span>
<span class="line"><span style="color:#A6ACCD;">  docs:     Documentation only changes //仅文档更改</span></span>
<span class="line"><span style="color:#A6ACCD;">  style:    [样式]Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)</span></span>
<span class="line"><span style="color:#A6ACCD;">  refactor: [重构] A code change that neither fixes a bug nor adds a feature</span></span>
<span class="line"><span style="color:#A6ACCD;">  perf:     A code change that improves performance</span></span>
<span class="line"><span style="color:#A6ACCD;">  test:     Adding missing tests or correcting existing tests</span></span></code></pre></div><p>根据提示填写提交内容</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">? What is the scope of this change // 此更改的范围是什么</span></span>
<span class="line"><span style="color:#A6ACCD;">? Write a short, imperative tense description of the change//【必填】 简短的描述这个变化</span></span>
<span class="line"><span style="color:#A6ACCD;">? Provide a longer description of the change//提供变更的详细说明：</span></span>
<span class="line"><span style="color:#A6ACCD;">? Are there any breaking changes? //有什么突破性的变化吗？【y/n】</span></span>
<span class="line"><span style="color:#A6ACCD;">? Does this change affect any open issues? (y/N) //此更改是否会影响任何悬而未决的问题（是/否）</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 完成提交，输出打印日志：</span></span>
<span class="line"><span style="color:#A6ACCD;">[master 2cf55e0] docs: 修改commitzen文档</span></span>
<span class="line"><span style="color:#A6ACCD;"> 1 file changed, 2 insertions(+), 2 deletions(-)</span></span></code></pre></div></li></ol>`,54),p=[t];function o(i,c,r,d,C,h){return a(),n("div",null,p)}const g=s(l,[["render",o]]);export{A as __pageData,g as default};