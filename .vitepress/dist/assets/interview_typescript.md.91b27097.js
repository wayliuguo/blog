import{_ as s,o as n,c as a,U as l}from"./chunks/framework.9adb0f96.js";const e="/blog/typescript/TypeScript.png",p="/blog/typescript/image-20221017235520904.png",o="/blog/typescript/image-20220712235632503-16660692515531.png",h=JSON.parse('{"title":"一、基础篇","description":"","frontmatter":{},"headers":[],"relativePath":"interview/typescript.md","filePath":"interview/typescript.md","lastUpdated":1690211463000}'),t={name:"interview/typescript.md"},c=l('<p><img src="'+e+`" alt="TypeScript"></p><h1 id="一、基础篇" tabindex="-1">一、基础篇 <a class="header-anchor" href="#一、基础篇" aria-label="Permalink to &quot;一、基础篇&quot;">​</a></h1><h2 id="_1-快速入门" tabindex="-1">1.快速入门 <a class="header-anchor" href="#_1-快速入门" aria-label="Permalink to &quot;1.快速入门&quot;">​</a></h2><h3 id="_1-代码初始化" tabindex="-1">1.代码初始化 <a class="header-anchor" href="#_1-代码初始化" aria-label="Permalink to &quot;1.代码初始化&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// npm</span></span>
<span class="line"><span style="color:#A6ACCD;">npm install -g typescriptl/ yarm</span></span>
<span class="line"><span style="color:#A6ACCD;">yarn global add typescript//查看版本</span></span>
<span class="line"><span style="color:#A6ACCD;">tsc -v</span></span></code></pre></div><h3 id="_2-ts-node" tabindex="-1">2. ts-node <a class="header-anchor" href="#_2-ts-node" aria-label="Permalink to &quot;2. ts-node&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm i -g ts-node</span></span></code></pre></div><h3 id="_3-初始化配置文件" tabindex="-1">3.初始化配置文件 <a class="header-anchor" href="#_3-初始化配置文件" aria-label="Permalink to &quot;3.初始化配置文件&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">tsc --init</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">{</span></span>
<span class="line"><span style="color:#A6ACCD;">	&quot;compileroptions&quot;: {&quot;target&quot; : &quot;es5&quot;, //指定ECMAScript目标版本: &#39;ES5&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">	&quot;module&quot; : &quot;commonjs &quot;, //指定使用模块: &#39;commonjs &#39;, &#39;amd &#39; , &#39;system &#39;, &quot;umd &#39; or &#39;es2015&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">	&quot;moduleResolution&quot; : &quot;node&quot; , //选择模块解析策略</span></span>
<span class="line"><span style="color:#A6ACCD;">	&quot;experimentalDecorators&quot; : true,//启用实验性的Es装饰器</span></span>
<span class="line"><span style="color:#A6ACCD;">	&quot;allowSyntheticDefaultImports&quot;: true，//允许从没有设置默认导出的模块中默认导入</span></span>
<span class="line"><span style="color:#A6ACCD;">	&quot;sourceMap&quot; : true, //把ts文件编译成js 文件的时候，同时生成对应的 map 文件</span></span>
<span class="line"><span style="color:#A6ACCD;">	&quot;strict&quot; : true, //启用所有严格类型检查选项</span></span>
<span class="line"><span style="color:#A6ACCD;">	&quot;noImplicitAny&quot; : true, //在表达式和声明上有隐含的any类型时报错</span></span>
<span class="line"><span style="color:#A6ACCD;">	&quot;alwaysstrict&quot; : true, //以严格模式检查模块，并在每个文件里加入&#39;use strict&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">	&quot;declaration&quot; : true, //生成相应的.d.ts文件</span></span>
<span class="line"><span style="color:#A6ACCD;">	&quot;removeComments&quot; : true, //删除编译后的所有的注释</span></span>
<span class="line"><span style="color:#A6ACCD;">	&quot;noImplicitReturns&quot; : true, //不是函数的所有返回路径都有返回值时报错</span></span>
<span class="line"><span style="color:#A6ACCD;">	&quot;importHelpers&quot; : true, //从tslib 导入辅助工具函数</span></span>
<span class="line"><span style="color:#A6ACCD;">	&quot;lib&quot;: [ &quot;es6&quot;, &quot;dom&quot; ], //指定要包含在编译中的库文件</span></span>
<span class="line"><span style="color:#A6ACCD;">	&quot;typeRoots&quot;: [ &quot;node_modules/@types&quot;],</span></span>
<span class="line"><span style="color:#A6ACCD;">	&quot;outDir&quot;: &quot;./dist&quot;,</span></span>
<span class="line"><span style="color:#A6ACCD;">	&quot;rootDir&quot;: &quot;./src&quot;},</span></span>
<span class="line"><span style="color:#A6ACCD;">	&quot;include&quot;: [ //需要编译的ts文件*表示文件匹配**表示忽略文件的深度问题</span></span>
<span class="line"><span style="color:#A6ACCD;">	&quot;./src/**/*.ts&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">	],</span></span>
<span class="line"><span style="color:#A6ACCD;">	&quot;exclude&quot; : [ //不需要编译的ts文件</span></span>
<span class="line"><span style="color:#A6ACCD;">	    &quot;node_modules&quot;,</span></span>
<span class="line"><span style="color:#A6ACCD;">	    &quot;dist&quot;,</span></span>
<span class="line"><span style="color:#A6ACCD;">	    &quot;**/*.test.ts&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">    ]</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h2 id="_2-数据类型" tabindex="-1">2.数据类型 <a class="header-anchor" href="#_2-数据类型" aria-label="Permalink to &quot;2.数据类型&quot;">​</a></h2><h3 id="_1-简单数据类型" tabindex="-1">1.简单数据类型 <a class="header-anchor" href="#_1-简单数据类型" aria-label="Permalink to &quot;1.简单数据类型&quot;">​</a></h3><p>在语法层面，缺省类型注解的TypeScript与JavaScript完全一致。</p><p>类型的注解主要通过类型后置语法来实现：&quot;<strong>变量:类型</strong>&quot;</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">let num = 996</span></span>
<span class="line"><span style="color:#A6ACCD;">let num: number = 996</span></span></code></pre></div><p>第一行为 隐式定义，第二行显示声明了类型，两行的代码都不能给num赋值为其他类型。</p><p>在JavaScript中，原始类型指的是<strong>非对象且没有方法的数据类型，包括：</strong></p><ul><li>number</li><li>boolean</li><li>string</li><li>null</li><li>undefined</li><li>symbol</li><li>bigInt</li></ul><p>他们对应的TypeScript 如下</p><table><thead><tr><th><strong>JavaScript原始基础类型</strong></th><th><strong>typescript类型</strong></th></tr></thead><tbody><tr><td>number</td><td>number</td></tr><tr><td>boolean</td><td>boolean</td></tr><tr><td>string</td><td>string</td></tr><tr><td>null</td><td>null</td></tr><tr><td>undefined</td><td>undefined</td></tr><tr><td>symbol</td><td>symbol</td></tr><tr><td>bigInt</td><td>bigInt</td></tr></tbody></table><h4 id="_1-number" tabindex="-1">1.number <a class="header-anchor" href="#_1-number" aria-label="Permalink to &quot;1.number&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">let num: number</span></span>
<span class="line"><span style="color:#A6ACCD;">num = 123</span></span>
<span class="line"><span style="color:#A6ACCD;">num = 0b1111011 // 二进制</span></span>
<span class="line"><span style="color:#A6ACCD;">num = 0o146 // 八进制</span></span>
<span class="line"><span style="color:#A6ACCD;">num = 0x7b // 十六进制</span></span></code></pre></div><h4 id="_2-string" tabindex="-1">2.string <a class="header-anchor" href="#_2-string" aria-label="Permalink to &quot;2.string&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// string</span></span>
<span class="line"><span style="color:#A6ACCD;">let str: string = &#39;hello world&#39;</span></span></code></pre></div><h4 id="_3-boolean" tabindex="-1">3.boolean <a class="header-anchor" href="#_3-boolean" aria-label="Permalink to &quot;3.boolean&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">let bol: boolean = false</span></span></code></pre></div><h4 id="_4-null-和-undefined" tabindex="-1">4.null 和 undefined <a class="header-anchor" href="#_4-null-和-undefined" aria-label="Permalink to &quot;4.null 和 undefined&quot;">​</a></h4><p>它们既是实际的值，也是类型。</p><p>undefined 和 null 是所有类型的子类型，如果“compilerOptions”里设置为&quot;strictNullChecks&quot;: false 时，则可以把他们赋值给其他类型，否则不可以。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">let u: undefined = undefined</span></span>
<span class="line"><span style="color:#A6ACCD;">let n: null = null</span></span></code></pre></div><h4 id="_5-bigint" tabindex="-1">5.bigInt <a class="header-anchor" href="#_5-bigint" aria-label="Permalink to &quot;5.bigInt&quot;">​</a></h4><p>使用BigInt 可以安全地存储和操作大整数。</p><p>BigInt 需要 &quot;target&quot;: &quot;es2020&quot;</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">/* const max = Number.MAX_SAFE_INTEGER</span></span>
<span class="line"><span style="color:#A6ACCD;">const max1 = max +1</span></span>
<span class="line"><span style="color:#A6ACCD;">const max2 = max +2</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(max1 === max2) // true */</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const max = BigInt(Number.MAX_SAFE_INTEGER)</span></span>
<span class="line"><span style="color:#A6ACCD;">const max1 = max +1n</span></span>
<span class="line"><span style="color:#A6ACCD;">const max2 = max +2n</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(max1 === max2) // false</span></span></code></pre></div><h4 id="_6-symbol" tabindex="-1">6.symbol <a class="header-anchor" href="#_6-symbol" aria-label="Permalink to &quot;6.symbol&quot;">​</a></h4><h5 id="_1-symbol-的基本使用" tabindex="-1">1.symbol 的基本使用 <a class="header-anchor" href="#_1-symbol-的基本使用" aria-label="Permalink to &quot;1.symbol 的基本使用&quot;">​</a></h5><ul><li>使用Symbol 构造函数生成</li><li>用来标表示独一无二的值</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const s1= Symbol(&#39;TypeScript&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">const s2 = Symbol(&#39;TypeScript&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(typeof s1)</span></span>
<span class="line"><span style="color:#A6ACCD;">// console.log(s1 === s2) // 报错，此条件始终返回false</span></span></code></pre></div><h5 id="_2-symbol-作为属性名" tabindex="-1">2.symbol 作为属性名 <a class="header-anchor" href="#_2-symbol-作为属性名" aria-label="Permalink to &quot;2.symbol 作为属性名&quot;">​</a></h5><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">let title = Symbol()</span></span>
<span class="line"><span style="color:#A6ACCD;">let obj = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    [title]: &#39;TypeScript&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(obj) // { [Symbol()]: &#39;TypeScript&#39; }</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(obj[title]) // TypeScript</span></span>
<span class="line"><span style="color:#A6ACCD;">// console.log(obj.title) // 报错，不存在属性title</span></span></code></pre></div><h5 id="_3-symbol-属性名遍历" tabindex="-1">3. symbol 属性名遍历 <a class="header-anchor" href="#_3-symbol-属性名遍历" aria-label="Permalink to &quot;3. symbol 属性名遍历&quot;">​</a></h5><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const myTitle = Symbol(&#39;TypeScript&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">const myObj = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    [myTitle]: &#39;TypeScript&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: 18</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">// for in 与 下面的方法都取不到</span></span>
<span class="line"><span style="color:#A6ACCD;">for (const key in myObj) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(key) // age</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(Object.keys(myObj)) // [ &#39;age&#39; ]</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(Object.getOwnPropertyNames(myObj)) // [ &#39;age&#39; ]</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(JSON.stringify(myObj)) // {&quot;age&quot;:18}</span></span>
<span class="line"><span style="color:#A6ACCD;">// 可以使用 Object.getOwnPropertySymbols</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(Object.getOwnPropertySymbols(myObj)) // [ Symbol(TypeScript) ] </span></span>
<span class="line"><span style="color:#A6ACCD;">// Reflect.ownKeys 可以获取所有类型的属性名</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(Reflect.ownKeys(myObj)) // [ &#39;age&#39;, Symbol(TypeScript) ]</span></span></code></pre></div><h5 id="_4-symbol-静态方法" tabindex="-1">4.symbol 静态方法 <a class="header-anchor" href="#_4-symbol-静态方法" aria-label="Permalink to &quot;4.symbol 静态方法&quot;">​</a></h5><ul><li>Symbol.for() <ul><li>使用Symbol.for()方法传入字符串会先检查有没有使用该字符串调用Symbol.for 方法创建的symbol值</li></ul></li><li>Symbol.keyFor() <ul><li>该方法传入一个symbol值，返回该值在全局注册的键名</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const tsSymbol = Symbol.for(&#39;TypeScript&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(tsSymbol === Symbol.for(&#39;TypeScript&#39;)) // true</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(Symbol.keyFor(tsSymbol)) // TypeScript</span></span></code></pre></div><h3 id="_2-复杂数据类型" tabindex="-1">2.复杂数据类型 <a class="header-anchor" href="#_2-复杂数据类型" aria-label="Permalink to &quot;2.复杂数据类型&quot;">​</a></h3><h4 id="_1-array" tabindex="-1">1.Array <a class="header-anchor" href="#_1-array" aria-label="Permalink to &quot;1.Array&quot;">​</a></h4><h5 id="两种定义方式" tabindex="-1">两种定义方式 <a class="header-anchor" href="#两种定义方式" aria-label="Permalink to &quot;两种定义方式&quot;">​</a></h5><ul><li>直接定义(推荐): <code>number[]</code></li><li>数组泛型：<code>Array&lt;number&gt;</code></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">let list1: number[] = [1,2,3]</span></span>
<span class="line"><span style="color:#A6ACCD;">let list2: Array&lt;number&gt; = [1,2,3]</span></span></code></pre></div><h5 id="定义联合类型数组" tabindex="-1">定义联合类型数组 <a class="header-anchor" href="#定义联合类型数组" aria-label="Permalink to &quot;定义联合类型数组&quot;">​</a></h5><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">let list3: (number | string | object)[] = [&#39;a&#39;, 1, {}]</span></span></code></pre></div><h4 id="_2-object" tabindex="-1">2.object <a class="header-anchor" href="#_2-object" aria-label="Permalink to &quot;2.object&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">let obj2: object</span></span>
<span class="line"><span style="color:#A6ACCD;">obj2 = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: &#39;TypeScript&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">function getKeys (obj: object) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return Object.keys(obj)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">getKeys({</span></span>
<span class="line"><span style="color:#A6ACCD;">    a: &#39;a&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;">// getKeys(123) // 运行会报错，Argument of type &#39;number&#39; is not assignable to parameter of type &#39;object&#39;</span></span></code></pre></div><h4 id="_3-元组" tabindex="-1">3.元组 <a class="header-anchor" href="#_3-元组" aria-label="Permalink to &quot;3.元组&quot;">​</a></h4><ul><li>已知元素数量</li><li>已知元素类型</li><li>各个位置上 的元素类型也要对应</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">let arr: [string, number, boolean]</span></span>
<span class="line"><span style="color:#A6ACCD;">arr = [&#39;a&#39;, 1, false]</span></span>
<span class="line"><span style="color:#A6ACCD;">// arr = [1, &#39;a&#39;, false] error</span></span>
<span class="line"><span style="color:#A6ACCD;">// arr = [&#39;a&#39;, 2] error</span></span></code></pre></div><p>新版本中，[string, number]元组类型的声明效果可以看作等同于下面声明</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">interface Tuple extends Array&lt;number | string&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    0: string;</span></span>
<span class="line"><span style="color:#A6ACCD;">    1: number;</span></span>
<span class="line"><span style="color:#A6ACCD;">    length: 2;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h4 id="_4-枚举" tabindex="-1">4.枚举 <a class="header-anchor" href="#_4-枚举" aria-label="Permalink to &quot;4.枚举&quot;">​</a></h4><ul><li><p><strong>作用：给一组数值赋予名字</strong></p></li><li><p><strong>默认从0开始，后一个是前一个的+1</strong></p></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">enum Roles {</span></span>
<span class="line"><span style="color:#A6ACCD;">    SUPER_ADMIN,</span></span>
<span class="line"><span style="color:#A6ACCD;">    ADMIN,</span></span>
<span class="line"><span style="color:#A6ACCD;">    USER</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(Roles.SUPER_ADMIN) // 0</span></span>
<span class="line"><span style="color:#A6ACCD;">enum Roles1 {</span></span>
<span class="line"><span style="color:#A6ACCD;">    SUPER_ADMIN = 5,</span></span>
<span class="line"><span style="color:#A6ACCD;">    ADMIN=4,</span></span>
<span class="line"><span style="color:#A6ACCD;">    USER</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(Roles1.SUPER_ADMIN) // 5</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(Roles1.USER) // 5</span></span></code></pre></div><h4 id="_5-any" tabindex="-1">5.any <a class="header-anchor" href="#_5-any" aria-label="Permalink to &quot;5.any&quot;">​</a></h4><p>它是一个任意类型，定义为any类型的变量就会绕过TypeScript的静态类型检测。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">let anyType: any = 1</span></span>
<span class="line"><span style="color:#A6ACCD;">anyType = false</span></span></code></pre></div><h4 id="_6-void" tabindex="-1">6.void <a class="header-anchor" href="#_6-void" aria-label="Permalink to &quot;6.void&quot;">​</a></h4><ul><li>表示没有类型，就是什么类型也不是</li><li>在定义函数，并且函数不返回任何内容（实际上返回undefined）</li><li>null 和 undefined 可以赋值给它</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const consoleText = (text: string): void =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(text)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let consoleVal = consoleText(&#39;123&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">consoleVal = null // 需要关闭strictNullChecks</span></span>
<span class="line"><span style="color:#A6ACCD;">consoleVal = undefined</span></span></code></pre></div><h4 id="_7-never" tabindex="-1">7.never <a class="header-anchor" href="#_7-never" aria-label="Permalink to &quot;7.never&quot;">​</a></h4><ul><li><p>unknown 的子类型</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">type isNever = never extends unknown ? true : false</span></span></code></pre></div></li><li><p>指永远不存在的类型</p></li><li><p>其值是<strong>总会抛出异常或根本不会有返回值的函数表达式的返回值</strong></p></li></ul><h5 id="never-的特点" tabindex="-1">never 的特点 <a class="header-anchor" href="#never-的特点" aria-label="Permalink to &quot;never 的特点&quot;">​</a></h5><ul><li>never 是任何类型的子类型，可以赋值给任务类型</li><li>任何类型都不可以赋值给never 类型</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const throwErrorFunc = () =&gt; { throw new Error()}</span></span>
<span class="line"><span style="color:#A6ACCD;">const add = (a:number,b:number):number =&gt; a + b</span></span>
<span class="line"><span style="color:#A6ACCD;">// let neverVal: never = add(1,2) // 不能将类型“number”分配给类型“never”</span></span>
<span class="line"><span style="color:#A6ACCD;">let neverVal: never = throwErrorFunc()</span></span>
<span class="line"><span style="color:#A6ACCD;">const myString = &#39;&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">// never 类型可以赋值给其他类型</span></span>
<span class="line"><span style="color:#A6ACCD;">const myInt: number = neverVal</span></span>
<span class="line"><span style="color:#A6ACCD;">// neverVal = myString // 其他类型不可以赋值给never类型</span></span>
<span class="line"><span style="color:#A6ACCD;">// 函数中的never</span></span></code></pre></div><h5 id="函数中的never" tabindex="-1">函数中的never <a class="header-anchor" href="#函数中的never" aria-label="Permalink to &quot;函数中的never&quot;">​</a></h5><p>TypeScript 使用 never 作为那些无法达到的终点的函数的返回值类型，主要有两种情况：</p><ul><li>函数抛出异常</li><li>函数不会有返回值（无限循环）</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// throwErrorFunc</span></span>
<span class="line"><span style="color:#A6ACCD;">const throwErrorFunc = () =&gt; { throw new Error()}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// const output: () =&gt; never</span></span>
<span class="line"><span style="color:#A6ACCD;">const output = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    while(true) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(&#39;循环&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h5 id="never-和-void-的区别" tabindex="-1">never 和 void 的区别？ <a class="header-anchor" href="#never-和-void-的区别" aria-label="Permalink to &quot;never 和 void 的区别？&quot;">​</a></h5><ul><li>类型赋值 <ul><li>void 类型值可以是 null、undefined</li><li>never 只能是never</li></ul></li><li>函数中 <ul><li>void：没有返回任何内容（undefined）</li><li>never：抛出异常或者无限循环</li></ul></li></ul><h4 id="_8-unknow" tabindex="-1">8.unknow <a class="header-anchor" href="#_8-unknow" aria-label="Permalink to &quot;8.unknow&quot;">​</a></h4><ul><li>其是any 的安全类型</li><li>unknown 与 any 一样，所有类型的值都可以赋值给它</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">let notSure: unknown = 4</span></span>
<span class="line"><span style="color:#A6ACCD;">notSure = &#39;string&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">notSure = [1, 2, 3]</span></span></code></pre></div><p>any 类型可以赋值给任何类型，unknown 类型只能赋值给 unknown 和 any</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">let nameString = &#39;well&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">// nameString = notSure // error</span></span>
<span class="line"><span style="color:#A6ACCD;">let notSureA: unknown = 2</span></span>
<span class="line"><span style="color:#A6ACCD;">notSure = notSureA</span></span>
<span class="line"><span style="color:#A6ACCD;">let anyA: any = 2</span></span>
<span class="line"><span style="color:#A6ACCD;">anyA = notSure</span></span></code></pre></div><p><strong>作用：缩小类型范围</strong></p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">let result: unknown</span></span>
<span class="line"><span style="color:#A6ACCD;">if (typeof result === &#39;number&#39;) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    result.toFixed()</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h4 id="_9-字面量类型与类型字面量" tabindex="-1">9.字面量类型与类型字面量 <a class="header-anchor" href="#_9-字面量类型与类型字面量" aria-label="Permalink to &quot;9.字面量类型与类型字面量&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 字面量类型</span></span>
<span class="line"><span style="color:#A6ACCD;">type Direction = &#39;Up&#39; | &#39;Down&#39; | &#39;Left&#39; | &#39;Riht&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">function move(direction: Direction) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(direction)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">move(&#39;Down&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 类型字面量</span></span>
<span class="line"><span style="color:#A6ACCD;">type Person1 = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string,</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: number</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let p1: Person1 = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: &#39;well&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: 18</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h2 id="_3-枚举类型" tabindex="-1">3.枚举类型 <a class="header-anchor" href="#_3-枚举类型" aria-label="Permalink to &quot;3.枚举类型&quot;">​</a></h2><ul><li>1.数字枚举 <ul><li>从0开始递增</li></ul></li><li>2.字符串枚举</li><li>3.反向枚举 <ul><li>只支持数字枚举</li></ul></li><li>4.异构枚举 <ul><li>既有数字又有字符串</li></ul></li><li>5.常量枚举</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 数字枚举</span></span>
<span class="line"><span style="color:#A6ACCD;">enum Day {</span></span>
<span class="line"><span style="color:#A6ACCD;">    SUNDAY,</span></span>
<span class="line"><span style="color:#A6ACCD;">    MONDAY,</span></span>
<span class="line"><span style="color:#A6ACCD;">    TUESDAY,</span></span>
<span class="line"><span style="color:#A6ACCD;">    WEDNESDAY,</span></span>
<span class="line"><span style="color:#A6ACCD;">    THURSDAY,</span></span>
<span class="line"><span style="color:#A6ACCD;">    FRIDAY,</span></span>
<span class="line"><span style="color:#A6ACCD;">    SATURDAY</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(Day.SUNDAY) // 0</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 字符串枚举</span></span>
<span class="line"><span style="color:#A6ACCD;">enum message {</span></span>
<span class="line"><span style="color:#A6ACCD;">    Error = &#39;error&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    SUCCESS = &#39;success&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 反向枚举(只支持数字枚举)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(Day[&#39;MONDAY&#39;]) // 1</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(Day[1]) // MONDAY</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 异构枚举</span></span>
<span class="line"><span style="color:#A6ACCD;">enum Result {</span></span>
<span class="line"><span style="color:#A6ACCD;">    Faild = 0,</span></span>
<span class="line"><span style="color:#A6ACCD;">    Success = &#39;success&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 常量枚举</span></span>
<span class="line"><span style="color:#A6ACCD;">const enum Animal {</span></span>
<span class="line"><span style="color:#A6ACCD;">    Dog,</span></span>
<span class="line"><span style="color:#A6ACCD;">    Cat</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h2 id="_4-函数类型" tabindex="-1">4.函数类型 <a class="header-anchor" href="#_4-函数类型" aria-label="Permalink to &quot;4.函数类型&quot;">​</a></h2><h3 id="_1-函数类型定义" tabindex="-1">1.函数类型定义 <a class="header-anchor" href="#_1-函数类型定义" aria-label="Permalink to &quot;1.函数类型定义&quot;">​</a></h3><h4 id="直接定义" tabindex="-1">直接定义 <a class="header-anchor" href="#直接定义" aria-label="Permalink to &quot;直接定义&quot;">​</a></h4><ul><li>参数</li><li>返回值</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function addFn (x: number, y: number):number {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return x + y</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const addFnArrow = (x: number, y: number): number =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return x + y</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">// 完整函数类型定义：指定参数、指定返回值</span></span>
<span class="line"><span style="color:#A6ACCD;">let addVal: (x: number, y: number) =&gt; number</span></span>
<span class="line"><span style="color:#A6ACCD;">addVal =  (x: number, y: number): number =&gt; x + y</span></span></code></pre></div><ul><li>如果省略参数类型，则默认参数 any 类型</li><li>如果省略返回值类型，如果没有返回内容，则未void，否则根据返回值推断出返回类型</li></ul><h4 id="接口定义" tabindex="-1">接口定义 <a class="header-anchor" href="#接口定义" aria-label="Permalink to &quot;接口定义&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">interface AddInt {</span></span>
<span class="line"><span style="color:#A6ACCD;">    (x: number, y: number): number</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let myAdd: AddInt = (x: number, y:number):number =&gt; x + y</span></span></code></pre></div><h4 id="类型别名定义" tabindex="-1">类型别名定义 <a class="header-anchor" href="#类型别名定义" aria-label="Permalink to &quot;类型别名定义&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">type AddType = (x: number, y: number) =&gt; number</span></span>
<span class="line"><span style="color:#A6ACCD;">let myAddType = (x: number, y:number):number =&gt; x + y</span></span></code></pre></div><h3 id="_2-函数参数定义" tabindex="-1">2.函数参数定义 <a class="header-anchor" href="#_2-函数参数定义" aria-label="Permalink to &quot;2.函数参数定义&quot;">​</a></h3><h4 id="可选参数" tabindex="-1">可选参数 <a class="header-anchor" href="#可选参数" aria-label="Permalink to &quot;可选参数&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">type AddMore = (x:number, y:number, z?:number) =&gt; number</span></span>
<span class="line"><span style="color:#A6ACCD;">let myAddMOre: AddMore = (x, y, z) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (z) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        return x + y + z</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return x + y</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(myAddMOre(1,2)) // 3</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(myAddMOre(1,2,3)) // 6</span></span></code></pre></div><h4 id="默认参数" tabindex="-1">默认参数 <a class="header-anchor" href="#默认参数" aria-label="Permalink to &quot;默认参数&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const AddDefault = (x: number, y: number = 2) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return x + y</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const AddDefaultMore = (x: number, y: number | string = 2) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return \`\${x}\${y}\`</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h4 id="剩余参数" tabindex="-1">剩余参数 <a class="header-anchor" href="#剩余参数" aria-label="Permalink to &quot;剩余参数&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const handleData = (x: number, ...args: number[]) =&gt; Array</span></span>
<span class="line"><span style="color:#A6ACCD;">const handleDataMore = (x: number, ...args: (number | string)[]) =&gt; Array</span></span></code></pre></div><h3 id="_3-函数重载" tabindex="-1">3.函数重载 <a class="header-anchor" href="#_3-函数重载" aria-label="Permalink to &quot;3.函数重载&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">let attrObj = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: &#39;&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: 0</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">// function attr():void</span></span>
<span class="line"><span style="color:#A6ACCD;">/* </span></span>
<span class="line"><span style="color:#A6ACCD;">  如果传入的val是一个字符串赋值给attrObj.name</span></span>
<span class="line"><span style="color:#A6ACCD;">  如果传入的val是一个数字赋值给attrObj.age</span></span>
<span class="line"><span style="color:#A6ACCD;">  @param val</span></span>
<span class="line"><span style="color:#A6ACCD;">*/</span></span>
<span class="line"><span style="color:#A6ACCD;">function attr(val: string):void</span></span>
<span class="line"><span style="color:#A6ACCD;">function attr(val: number):void</span></span>
<span class="line"><span style="color:#A6ACCD;">function attr (val:any):void {</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (typeof val === &#39;string&#39;) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        attrObj.name = val</span></span>
<span class="line"><span style="color:#A6ACCD;">    } else if (typeof val === &#39;number&#39;) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        attrObj.age  = val</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">attr(&#39;well&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">attr(18)</span></span>
<span class="line"><span style="color:#A6ACCD;">// attr(true) // 报错</span></span></code></pre></div><ul><li>重载的需要在上面，定义的需要跟着重载，不能被别的断开</li><li>如果重载了，则下面的attr(true)（没有boolean的重载）</li></ul><h2 id="_5-类类型" tabindex="-1">5.类类型 <a class="header-anchor" href="#_5-类类型" aria-label="Permalink to &quot;5.类类型&quot;">​</a></h2><h3 id="_1-类的概念" tabindex="-1">1.类的概念 <a class="header-anchor" href="#_1-类的概念" aria-label="Permalink to &quot;1.类的概念&quot;">​</a></h3><h4 id="类的使用" tabindex="-1">类的使用 <a class="header-anchor" href="#类的使用" aria-label="Permalink to &quot;类的使用&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 1.类的使用</span></span>
<span class="line"><span style="color:#A6ACCD;">class Point {</span></span>
<span class="line"><span style="color:#A6ACCD;">    x: number</span></span>
<span class="line"><span style="color:#A6ACCD;">    y: number</span></span>
<span class="line"><span style="color:#A6ACCD;">    constructor(x: number, y: number) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.x = x</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.y = y</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    getPosition():string {</span></span>
<span class="line"><span style="color:#A6ACCD;">        return \`\${this.x}\${this.y}\`</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const point = new Point(1,2)</span></span>
<span class="line"><span style="color:#A6ACCD;">point.getPosition()</span></span></code></pre></div><p>es6之前，通过函数+原型链形式模拟实现</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function Point(x, y){</span></span>
<span class="line"><span style="color:#A6ACCD;">	this.x = x;</span></span>
<span class="line"><span style="color:#A6ACCD;">	this.y = y;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">Point. prototype.getPosition = function() {</span></span>
<span class="line"><span style="color:#A6ACCD;">	return(\${this.x}，\${this.y});</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const point = new Point(1，2);</span></span>
<span class="line"><span style="color:#A6ACCD;">point.getPosition() // (1，2)</span></span></code></pre></div><h4 id="类的继承" tabindex="-1">类的继承 <a class="header-anchor" href="#类的继承" aria-label="Permalink to &quot;类的继承&quot;">​</a></h4><ul><li>super 函数会调用基类的构造函数</li><li>派生类如果包含一个构造函数constructor，则必须在构造函数中调用super方法</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">class A {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: number</span></span>
<span class="line"><span style="color:#A6ACCD;">    constructor(name: string, age: number) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.name = name</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.age = age</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    getName () {</span></span>
<span class="line"><span style="color:#A6ACCD;">        return this.name</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">class B extends A {</span></span>
<span class="line"><span style="color:#A6ACCD;">    job: string</span></span>
<span class="line"><span style="color:#A6ACCD;">    constructor(name: string, age: number) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        super(name, age)</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.job = &#39;IT&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    getJob() {</span></span>
<span class="line"><span style="color:#A6ACCD;">        return this.job</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    getNameAndJob() {</span></span>
<span class="line"><span style="color:#A6ACCD;">        return super.getName() + this.job</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const b = new B(&#39;Tom&#39;, 20)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(b.name) // Tom</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(b.age) // 20</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(b.getName()) // Tom</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(b.getJob()) // IT</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(b.getNameAndJob()) // TomIT</span></span></code></pre></div><h3 id="_2-存取器" tabindex="-1">2.存取器 <a class="header-anchor" href="#_2-存取器" aria-label="Permalink to &quot;2.存取器&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">export {}</span></span>
<span class="line"><span style="color:#A6ACCD;">class User {</span></span>
<span class="line"><span style="color:#A6ACCD;">    myName: String;</span></span>
<span class="line"><span style="color:#A6ACCD;">    constructor(myName: string) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.myName = myName</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    get name() {</span></span>
<span class="line"><span style="color:#A6ACCD;">        return this.myName</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    set name(value) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.myName = value</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">let user = new User(&#39;well&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">user.name = &#39;liuguowei&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(user.name)  // liuguowei</span></span></code></pre></div><p><strong>就是通过Object.defineProperty 定义 User 函数的name 属性的getter与setter</strong></p><h3 id="_3-类的修饰符" tabindex="-1">3.类的修饰符 <a class="header-anchor" href="#_3-类的修饰符" aria-label="Permalink to &quot;3.类的修饰符&quot;">​</a></h3><h4 id="访问修饰符" tabindex="-1">访问修饰符 <a class="header-anchor" href="#访问修饰符" aria-label="Permalink to &quot;访问修饰符&quot;">​</a></h4><ul><li>定义在实例的属性和方法会在创建实例后添加到实例上</li><li>如果是定义在类里没有定义在this上的方法，实例可以继承</li><li>如果使用static 修饰符定义的属性和方法，则是静态的，实例不可以访问与继承</li></ul><p><strong>TypeScript 中有三类访问修饰符</strong></p><ul><li>public(默认)：修饰的是 自己、自己的子类、其他类都能访问的属性或方法</li><li>protected: 修饰的是 自己、自己的子类能访问，其他类不可访问的属性或方法</li><li>private：修饰的是仅 自己能访问，子类和其他类不可访问的属性或方法</li><li>static: 静态属性， 子类可以调用父类的</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">class Father {</span></span>
<span class="line"><span style="color:#A6ACCD;">    static fatherName:string = &#39;father&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">    public name: string</span></span>
<span class="line"><span style="color:#A6ACCD;">    protected age: number</span></span>
<span class="line"><span style="color:#A6ACCD;">    private money: number</span></span>
<span class="line"><span style="color:#A6ACCD;">    constructor(name: string, age: number, money: number) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.name = name</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.age = age</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.money = money</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    getName():string {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // public 自己能访问</span></span>
<span class="line"><span style="color:#A6ACCD;">        return this.name</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">class Child extends Father {</span></span>
<span class="line"><span style="color:#A6ACCD;">    static childName:string = &#39;child&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">    constructor(name: string, age: number, money: number) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        super(name, age, money)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    desc() {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // public protected 子类能访问</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(this.name, this.age)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    showMoney() {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // console.log(this.money) // 属性“age”受保护，只能在类“Father”及其子类中访问。</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">let child = new Child(&#39;well&#39;, 18, 2000)</span></span>
<span class="line"><span style="color:#A6ACCD;">// public 其他类能访问</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(child.name)</span></span>
<span class="line"><span style="color:#A6ACCD;">// console.log(child.age) // 属性“age”受保护，只能在类“Father”及其子类中访问。</span></span>
<span class="line"><span style="color:#A6ACCD;">// console.log(child.money) // 属性“money”为私有属性，只能在类“Father”中访问</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 子类也可以调用父类的静态属性或方法</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(Child.fatherName, Child.childName)</span></span></code></pre></div><h4 id="只读修饰符" tabindex="-1">只读修饰符 <a class="header-anchor" href="#只读修饰符" aria-label="Permalink to &quot;只读修饰符&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">class UserInfo {</span></span>
<span class="line"><span style="color:#A6ACCD;">    readonly name: string</span></span>
<span class="line"><span style="color:#A6ACCD;">    constructor(name: string) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.name = name</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const user = new UserInfo(&#39;TypeScript&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">// user.name = &#39;haha&#39; // 无法分配到 &quot;name&quot; ，因为它是只读属性</span></span></code></pre></div><h3 id="_4-类装饰器" tabindex="-1">4.类装饰器 <a class="header-anchor" href="#_4-类装饰器" aria-label="Permalink to &quot;4.类装饰器&quot;">​</a></h3><p><strong>在类声明前声明，用来监视、修改、替换类定义</strong></p><h4 id="类装饰器与工厂装饰器" tabindex="-1">类装饰器与工厂装饰器 <a class="header-anchor" href="#类装饰器与工厂装饰器" aria-label="Permalink to &quot;类装饰器与工厂装饰器&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">export {}</span></span>
<span class="line"><span style="color:#A6ACCD;">/* function Person () {}</span></span>
<span class="line"><span style="color:#A6ACCD;">Object.defineProperty(Person.prototype,&#39;say&#39;, {</span></span>
<span class="line"><span style="color:#A6ACCD;">    value: function say() {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(&#39;hello&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;">let p1 = new(Person as any)()</span></span>
<span class="line"><span style="color:#A6ACCD;">p1.say() // hello */</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 普通装饰器</span></span>
<span class="line"><span style="color:#A6ACCD;">namespace a {</span></span>
<span class="line"><span style="color:#A6ACCD;">    function addNameEat(c: Function) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        c.prototype.name = &#39;well&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">        c.prototype.eat = function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">           console.log(this.name) // well</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    @addNameEat</span></span>
<span class="line"><span style="color:#A6ACCD;">    class Person {</span></span>
<span class="line"><span style="color:#A6ACCD;">        name!: string;</span></span>
<span class="line"><span style="color:#A6ACCD;">        eat!: Function;</span></span>
<span class="line"><span style="color:#A6ACCD;">        constructor(){</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    let p:Person = new Person()</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(p.name) // well</span></span>
<span class="line"><span style="color:#A6ACCD;">    p.eat()</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 工厂装饰器</span></span>
<span class="line"><span style="color:#A6ACCD;">namespace b {</span></span>
<span class="line"><span style="color:#A6ACCD;">    function addNameEatFactory(name: string) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        return function addNameEat(c: Function) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            c.prototype.name = name</span></span>
<span class="line"><span style="color:#A6ACCD;">            c.prototype.eat = function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">            console.log(this.name)  // liuguowei</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    @addNameEatFactory(&#39;liuguowei&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    class Person {</span></span>
<span class="line"><span style="color:#A6ACCD;">        name!: string;</span></span>
<span class="line"><span style="color:#A6ACCD;">        eat!: Function;</span></span>
<span class="line"><span style="color:#A6ACCD;">        constructor(){</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    let p:Person = new Person()</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(p.name) // liuguowei</span></span>
<span class="line"><span style="color:#A6ACCD;">    p.eat()</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">namespace c {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 类装饰器 属性只可以多不能少（类型安全）</span></span>
<span class="line"><span style="color:#A6ACCD;">    function replaceClass (c: Function) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        return class {</span></span>
<span class="line"><span style="color:#A6ACCD;">            name!: string</span></span>
<span class="line"><span style="color:#A6ACCD;">            eat!: Function</span></span>
<span class="line"><span style="color:#A6ACCD;">            age!: number</span></span>
<span class="line"><span style="color:#A6ACCD;">            constructor(){}</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    } </span></span>
<span class="line"><span style="color:#A6ACCD;">    @replaceClass</span></span>
<span class="line"><span style="color:#A6ACCD;">    class Person {</span></span>
<span class="line"><span style="color:#A6ACCD;">        name!: string;</span></span>
<span class="line"><span style="color:#A6ACCD;">        eat!: Function;</span></span>
<span class="line"><span style="color:#A6ACCD;">        constructor(){</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><ul><li>nameSpace：命名空间，在一个文件里可以声明重复的变量</li><li>tsconfig.json 需要experimentalDecorators: true</li></ul><h4 id="属性、方法装饰器" tabindex="-1">属性、方法装饰器 <a class="header-anchor" href="#属性、方法装饰器" aria-label="Permalink to &quot;属性、方法装饰器&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">export {}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">/**</span></span>
<span class="line"><span style="color:#A6ACCD;"> * @param target 如果装饰的是实例属性的话，target是构造函数的原型</span></span>
<span class="line"><span style="color:#A6ACCD;"> *               如果是静态属性，taget是静态属性本身</span></span>
<span class="line"><span style="color:#A6ACCD;"> * @param propertyKey </span></span>
<span class="line"><span style="color:#A6ACCD;"> */</span></span>
<span class="line"><span style="color:#A6ACCD;">function upperCase (target:any, propertyKey: string) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;upperCase&gt;&gt;&gt;&#39;,target, propertyKey) // {} name</span></span>
<span class="line"><span style="color:#A6ACCD;">    let value = target[propertyKey]</span></span>
<span class="line"><span style="color:#A6ACCD;">    const getter = () =&gt; value</span></span>
<span class="line"><span style="color:#A6ACCD;">    const setter = (newVal: string) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        value = newVal.toUpperCase()</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 把旧属性删除，重新定义属性</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (delete target[propertyKey]) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        Object.defineProperty(target, propertyKey, {</span></span>
<span class="line"><span style="color:#A6ACCD;">            get: getter,</span></span>
<span class="line"><span style="color:#A6ACCD;">            set: setter,</span></span>
<span class="line"><span style="color:#A6ACCD;">            enumerable: true,</span></span>
<span class="line"><span style="color:#A6ACCD;">            configurable: true</span></span>
<span class="line"><span style="color:#A6ACCD;">        })</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">function staticPropertyDecorator(target:any, propertyKey: string) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;staticPropertyDecorator&gt;&gt;&gt;&#39;, target, propertyKey) // [class Person] { age: 10 } age</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">function methodDescorator(target:any, propertyKey:string, descriptor:PropertyDescriptor) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let oldMethod = descriptor.value</span></span>
<span class="line"><span style="color:#A6ACCD;">    descriptor.value = function(...args: any[]) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        args = args.map(item =&gt; parseFloat(item))</span></span>
<span class="line"><span style="color:#A6ACCD;">        return oldMethod.apply(this, args)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">class Person {</span></span>
<span class="line"><span style="color:#A6ACCD;">    @upperCase</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string = &#39;well&#39; // 实例属性</span></span>
<span class="line"><span style="color:#A6ACCD;">    @staticPropertyDecorator</span></span>
<span class="line"><span style="color:#A6ACCD;">    public static age: number = 10 // 静态属性</span></span>
<span class="line"><span style="color:#A6ACCD;">    getName() { // 实例方法</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(this.name)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">     @methodDescorator</span></span>
<span class="line"><span style="color:#A6ACCD;">    sum(...args:any[]) { // 实例方法</span></span>
<span class="line"><span style="color:#A6ACCD;">        return args.reduce((acc: number, item: number) =&gt; acc+item, 0)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">let p = new Person()</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(p.name) // WELL</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(p.sum(&#39;1&#39;, &#39;2&#39;, &#39;3&#39;, &#39;4&#39;)) // 10</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">upperCase&gt;&gt;&gt; {} name</span></span>
<span class="line"><span style="color:#A6ACCD;">staticPropertyDecorator&gt;&gt;&gt; [class Person] { age: 10 } age</span></span>
<span class="line"><span style="color:#A6ACCD;">WELL</span></span>
<span class="line"><span style="color:#A6ACCD;">10</span></span></code></pre></div><ul><li>如果装饰的是实例属性的话，target是构造函数的原型;如果是静态属性，taget是静态属性本身</li><li>第三个 methodDescorator 重写了方法，使字符串的参数转为浮点数后再进行计算</li></ul><h4 id="参数装饰器" tabindex="-1">参数装饰器 <a class="header-anchor" href="#参数装饰器" aria-label="Permalink to &quot;参数装饰器&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">export {}</span></span>
<span class="line"><span style="color:#A6ACCD;">// target: 静态成员是构造函数， 非静态成员是构造函数原型</span></span>
<span class="line"><span style="color:#A6ACCD;">function addAge (target: any, methodName: string, paramIndex: number) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(target,methodName, paramIndex)</span></span>
<span class="line"><span style="color:#A6ACCD;">    target.age = 18</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">class Person {</span></span>
<span class="line"><span style="color:#A6ACCD;">    age!: number</span></span>
<span class="line"><span style="color:#A6ACCD;">    login(userName: string, @addAge password: string) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(this.age, userName, password) // 18 well password</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let p = new Person()</span></span>
<span class="line"><span style="color:#A6ACCD;">p.login(&#39;well&#39;, &#39;password&#39;)</span></span></code></pre></div><h4 id="装饰器执行顺序" tabindex="-1">装饰器执行顺序 <a class="header-anchor" href="#装饰器执行顺序" aria-label="Permalink to &quot;装饰器执行顺序&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">export {}</span></span>
<span class="line"><span style="color:#A6ACCD;">function classDecorator1() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return function (target: any) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(&#39;classDecorator1&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">function classDecorator2() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return function (target: any) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(&#39;classDecorator2&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">function propertyDecorator(key: string) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return function(target:any, propertyName: string) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(&#39;propertyDecorator&#39;, propertyName, key)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">function methodDecorator() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return function(target:any, propertyName: string) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(&#39;methodDecorator&#39;, propertyName)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">function parameterDecorator() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return function(target:any, methodName: string, index: number) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(&#39;parameterDecorator&#39;, methodName)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">@classDecorator1()</span></span>
<span class="line"><span style="color:#A6ACCD;">@classDecorator2()</span></span>
<span class="line"><span style="color:#A6ACCD;">class Person {</span></span>
<span class="line"><span style="color:#A6ACCD;">    @propertyDecorator(&#39;name&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string = &#39;&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">    @propertyDecorator(&#39;age&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: number = 18</span></span>
<span class="line"><span style="color:#A6ACCD;">    @methodDecorator()</span></span>
<span class="line"><span style="color:#A6ACCD;">    hello(@parameterDecorator() p1:string, @parameterDecorator() p2: string){}</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">propertyDecorator name name</span></span>
<span class="line"><span style="color:#A6ACCD;">propertyDecorator age age</span></span>
<span class="line"><span style="color:#A6ACCD;">parameterDecorator hello </span></span>
<span class="line"><span style="color:#A6ACCD;">parameterDecorator hello </span></span>
<span class="line"><span style="color:#A6ACCD;">methodDecorator hello    </span></span>
<span class="line"><span style="color:#A6ACCD;">classDecorator2</span></span>
<span class="line"><span style="color:#A6ACCD;">classDecorator1</span></span></code></pre></div><p><strong>执行顺序：</strong></p><ol><li>装饰器是最后执行的，后写的类装饰器先执行</li><li>一个方法，如果有方法装饰器又有参数装饰器，先执行参数装饰器</li><li>属性、方法装饰器谁在前先执行谁</li></ol><h3 id="_5-类的使用" tabindex="-1">5.类的使用 <a class="header-anchor" href="#_5-类的使用" aria-label="Permalink to &quot;5.类的使用&quot;">​</a></h3><h4 id="抽象类" tabindex="-1">抽象类 <a class="header-anchor" href="#抽象类" aria-label="Permalink to &quot;抽象类&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">abstract class People {</span></span>
<span class="line"><span style="color:#A6ACCD;">    constructor(public name: string) {}</span></span>
<span class="line"><span style="color:#A6ACCD;">    abstract printName(): void</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">class Man extends People {</span></span>
<span class="line"><span style="color:#A6ACCD;">    constructor(name: string) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        super(name)</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.name = name</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    printName(): void {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(this.name)   </span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">// const m = new Man() // 应有 1 个参数，但获得 0 个</span></span>
<span class="line"><span style="color:#A6ACCD;">const m = new Man(&#39;mike&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">m.printName()</span></span>
<span class="line"><span style="color:#A6ACCD;">// const pike = new People(&#39;pike&#39;) // 无法创建抽象类的实例</span></span></code></pre></div><ul><li>定义了一个抽象类People，在抽象类里定义contructor方法必须传入一个字符串类型参数</li><li>抽象方法只能出现在抽象类中</li><li>使用<strong>abstract</strong>关键字定义的方法，在继承时必须自身实现（重写）。</li><li>**多态：**同一个方法在不同子类中有不同的实现</li></ul><h4 id="作为类型" tabindex="-1">作为类型 <a class="header-anchor" href="#作为类型" aria-label="Permalink to &quot;作为类型&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">class Component {</span></span>
<span class="line"><span style="color:#A6ACCD;">    static myName: &#39;静态名称属性&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">    myName: string = &#39;实例名称属性&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">let c: Component = new Component()</span></span>
<span class="line"><span style="color:#A6ACCD;">let f: Component = Component</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(c) // Component { myName: &#39;实例名称属性&#39; }</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(f) // [class Component]</span></span></code></pre></div><h2 id="_6-接口类型" tabindex="-1">6.接口类型 <a class="header-anchor" href="#_6-接口类型" aria-label="Permalink to &quot;6.接口类型&quot;">​</a></h2><h3 id="_1-接口定义" tabindex="-1">1.接口定义 <a class="header-anchor" href="#_1-接口定义" aria-label="Permalink to &quot;1.接口定义&quot;">​</a></h3><ul><li>**TypeScript 的核心原则之一：对值所具有的结构进行类型检查,并且只要两个对象的结构一致，属性和方法的类型一致，则它们的类型是一致的 **</li><li><strong>接口的作用：为这些类型命名和为代码或第三方代码定义契约</strong></li><li><strong>同名的接口可以写多个，类型会自动合并</strong></li><li>接口一方面可以在面向对象编程中表示为<strong>行为的抽象</strong>，另外可以用来描述<strong>对象的形状</strong></li><li>接口就是把一些类中共有属性和方法抽象出来，用来约束实现此接口的类</li><li>一个类可以继承另一个类并实现多个接口</li><li>接口像插件一样用来增强类的，而抽象类是具体类的抽象概念</li><li>一个类可以实现多个接口，一个接口也可以被多个类实现，但一个类可以有多个子类，单只能有一个父类</li></ul><p>TypeScript 接口定义形式如下：</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">interface interface_name {}</span></span></code></pre></div><p><strong>例子：</strong></p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const getFullName = ({ firstName, lastName }) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return \`\${firstName}\${lastName}\`</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><p>默认 getFullName 的类型</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const getFullName: ({ firstName, lastName }: {</span></span>
<span class="line"><span style="color:#A6ACCD;">    firstName: any;</span></span>
<span class="line"><span style="color:#A6ACCD;">    lastName: any;</span></span>
<span class="line"><span style="color:#A6ACCD;">}) =&gt; string</span></span></code></pre></div><p><img src="`+p+`" alt="image-20221017235520904"></p><p>传入不想要的格式，则会导致错误</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">getFullName({firstName: &#39;hello&#39;, lastName: &#39;world&#39;}) // sucess</span></span>
<span class="line"><span style="color:#A6ACCD;">getFullName() // error</span></span>
<span class="line"><span style="color:#A6ACCD;">getFullName({firstName: &#39;hello&#39;}) // error</span></span></code></pre></div><p>完整类型定义</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const getFullName = ({ firstName, lastName }: {</span></span>
<span class="line"><span style="color:#A6ACCD;">    firstName: string;</span></span>
<span class="line"><span style="color:#A6ACCD;">    lastName: string;</span></span>
<span class="line"><span style="color:#A6ACCD;">}) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return \`\${firstName}\${lastName}\`</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><p><strong>使用interface定义接口</strong></p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 接口定义</span></span>
<span class="line"><span style="color:#A6ACCD;">interface Info {</span></span>
<span class="line"><span style="color:#A6ACCD;">    firstName: string</span></span>
<span class="line"><span style="color:#A6ACCD;">    lastName: string</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const getFullName = ({ firstName, lastName }: Info) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return \`\${firstName}\${lastName}\`</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><p><strong>{}包裹的是一个代码块，里面是声明语句，只不过声明的不是变量而是类型</strong></p><h3 id="_2-接口属性" tabindex="-1">2.接口属性 <a class="header-anchor" href="#_2-接口属性" aria-label="Permalink to &quot;2.接口属性&quot;">​</a></h3><h4 id="可选属性" tabindex="-1">可选属性 <a class="header-anchor" href="#可选属性" aria-label="Permalink to &quot;可选属性&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">interface Vegetables {</span></span>
<span class="line"><span style="color:#A6ACCD;">    color?: string</span></span>
<span class="line"><span style="color:#A6ACCD;">    type: string</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const getVegetables = ({ color, type }: Vegetables) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return \`\${color ? color + &#39; &#39; : &#39;&#39;}\${type}\`</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">getVegetables({color: &#39;red&#39;, type: &#39;long&#39;})</span></span></code></pre></div><h4 id="只读属性" tabindex="-1">只读属性 <a class="header-anchor" href="#只读属性" aria-label="Permalink to &quot;只读属性&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">interface Role {</span></span>
<span class="line"><span style="color:#A6ACCD;">    readonly 0: string</span></span>
<span class="line"><span style="color:#A6ACCD;">    readonly 1: string</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const role: Role = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    0: &#39;super_admin&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    1: &#39;admin&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(role[1]) // admin</span></span></code></pre></div><h4 id="多余属性检查" tabindex="-1">多余属性检查 <a class="header-anchor" href="#多余属性检查" aria-label="Permalink to &quot;多余属性检查&quot;">​</a></h4><h5 id="使用类型断言" tabindex="-1">使用类型断言 <a class="header-anchor" href="#使用类型断言" aria-label="Permalink to &quot;使用类型断言&quot;">​</a></h5><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">getVegetables({</span></span>
<span class="line"><span style="color:#A6ACCD;">    type: &#39;tomato&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    size: 12,</span></span>
<span class="line"><span style="color:#A6ACCD;">    price: 6</span></span>
<span class="line"><span style="color:#A6ACCD;">} as Vegetables)</span></span></code></pre></div><h5 id="添加索引签名" tabindex="-1">添加索引签名 <a class="header-anchor" href="#添加索引签名" aria-label="Permalink to &quot;添加索引签名&quot;">​</a></h5><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">interface VegetablesProps {</span></span>
<span class="line"><span style="color:#A6ACCD;">    color: string</span></span>
<span class="line"><span style="color:#A6ACCD;">    type: string</span></span>
<span class="line"><span style="color:#A6ACCD;">    [prop: string]: string | number</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const getVegetablesProps = ({ color, type }: VegetablesProps) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return \`\${color ? color + &#39; &#39; : &#39;&#39;}\${type}\`</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">getVegetablesProps({</span></span>
<span class="line"><span style="color:#A6ACCD;">    color: &#39;red&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    type: &#39;tomato&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    size: 12,</span></span>
<span class="line"><span style="color:#A6ACCD;">    price: 6</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span></code></pre></div><h3 id="_3-接口使用" tabindex="-1">3.接口使用 <a class="header-anchor" href="#_3-接口使用" aria-label="Permalink to &quot;3.接口使用&quot;">​</a></h3><h4 id="描述对象的形状" tabindex="-1">描述对象的形状 <a class="header-anchor" href="#描述对象的形状" aria-label="Permalink to &quot;描述对象的形状&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 对象的描述</span></span>
<span class="line"><span style="color:#A6ACCD;">interface Speakable {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string</span></span>
<span class="line"><span style="color:#A6ACCD;">    speak(): void</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">// 由于接口已经定义了name和speak,所以此接口类型的对象的属性必须对应</span></span>
<span class="line"><span style="color:#A6ACCD;">let speakMan: Speakable = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: &#39;well&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    speak() {}</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h4 id="行为的抽象" tabindex="-1">行为的抽象 <a class="header-anchor" href="#行为的抽象" aria-label="Permalink to &quot;行为的抽象&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">export {}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 对象的描述</span></span>
<span class="line"><span style="color:#A6ACCD;">// 行为的抽象</span></span>
<span class="line"><span style="color:#A6ACCD;">interface Speakable {</span></span>
<span class="line"><span style="color:#A6ACCD;">    speak():void</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">interface Eatable {</span></span>
<span class="line"><span style="color:#A6ACCD;">    eat():void</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">class Person implements Speakable, Eatable {</span></span>
<span class="line"><span style="color:#A6ACCD;">    speak(): void {</span></span>
<span class="line"><span style="color:#A6ACCD;">        throw new Error(&quot;Method not implemented.&quot;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    eat(): void {</span></span>
<span class="line"><span style="color:#A6ACCD;">        throw new Error(&quot;Method not implemented.&quot;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h4 id="接口继承" tabindex="-1">接口继承 <a class="header-anchor" href="#接口继承" aria-label="Permalink to &quot;接口继承&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">interface Books {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">interface Cateory {</span></span>
<span class="line"><span style="color:#A6ACCD;">    cateory: string</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">interface Money {</span></span>
<span class="line"><span style="color:#A6ACCD;">    price: string</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">interface MathBook extends Books, Cateory, Money {</span></span>
<span class="line"><span style="color:#A6ACCD;">    range: string</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const myMathBook: MathBook = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    range: &quot;上学期&quot;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: &quot;数学书&quot;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    cateory: &quot;教材&quot;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    price: &quot;55&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h4 id="定义构造函数类型" tabindex="-1">定义构造函数类型 <a class="header-anchor" href="#定义构造函数类型" aria-label="Permalink to &quot;定义构造函数类型&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">class Animal {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string</span></span>
<span class="line"><span style="color:#A6ACCD;">    constructor(name: string) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.name = name</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">// 加上 new 之后就是用来描述构造函数类型</span></span>
<span class="line"><span style="color:#A6ACCD;">interface WithNameClass {</span></span>
<span class="line"><span style="color:#A6ACCD;">    new(name: string): any</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">function createClass(clazz: WithNameClass, name: string) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return new clazz(name)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let c = createClass(Animal, &#39;well&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(c.name) // well</span></span></code></pre></div><h4 id="定义函数类型" tabindex="-1">定义函数类型 <a class="header-anchor" href="#定义函数类型" aria-label="Permalink to &quot;定义函数类型&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">export {}</span></span>
<span class="line"><span style="color:#A6ACCD;">interface Type1 {</span></span>
<span class="line"><span style="color:#A6ACCD;">    (name: string): string</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">interface Type2 {</span></span>
<span class="line"><span style="color:#A6ACCD;">    (name: string): string</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: number</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">interface Type3 {</span></span>
<span class="line"><span style="color:#A6ACCD;">    showName: (name: string) =&gt; string</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: number</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">let t1: Type1 = (name: string) =&gt; name</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(t1(&#39;well&#39;)) // well</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">let t2: any = (name: string) =&gt; name</span></span>
<span class="line"><span style="color:#A6ACCD;">t2.age = 18</span></span>
<span class="line"><span style="color:#A6ACCD;">let t: Type2 = t2</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(t) // [Function: t2] { age: 18 }</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(t.age) // 18</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(t(&#39;liuguowei&#39;)) // liuguowei</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">let t3: Type3 = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    showName: t1,</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: 18</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(t3) // { showName: [Function: t1], age: 18 }</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 类型别名</span></span>
<span class="line"><span style="color:#A6ACCD;">type AddFuncType = (x: number, y: number) =&gt; number</span></span></code></pre></div><p><strong>分别可以定义三种形式</strong></p><h4 id="定义索引类型" tabindex="-1">定义索引类型 <a class="header-anchor" href="#定义索引类型" aria-label="Permalink to &quot;定义索引类型&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">interface RoleDic {</span></span>
<span class="line"><span style="color:#A6ACCD;">    [id: string]: string</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const roleDic: RoleDic = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    0: &#39;super_admin&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    1: &#39;admin&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><p>0 或 &#39;0&#39; 索引对象时，这两者等价。</p><h3 id="_4-抽象类vs接口" tabindex="-1">4.抽象类vs接口 <a class="header-anchor" href="#_4-抽象类vs接口" aria-label="Permalink to &quot;4.抽象类vs接口&quot;">​</a></h3><ul><li>不同类之间公有的属性或方法，可以抽象成一个接口</li><li>而抽象类是供其他类继承的基类，抽象类不允许被实例化，抽象类中的抽象方法必须在子类中被实现</li><li>抽象类本质是一个无法被实例化的类，其中能够实现方法和初始化属性（抽象方法仅初始化，不可以在抽象类中实现，非抽象方法可以），而接口仅能够用于描述，既不提供方法的实现，也不为属性进行初始化</li><li>抽象类可以实现接口</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">export {}</span></span>
<span class="line"><span style="color:#A6ACCD;">abstract class Animal {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string = &#39;well&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">    constructor(name: string) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.name = name</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    abstract speak(): void</span></span>
<span class="line"><span style="color:#A6ACCD;">    sing() {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(&#39;abcdefg&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">interface Flying {</span></span>
<span class="line"><span style="color:#A6ACCD;">    fly(): void</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">class Duck extends Animal implements Flying {</span></span>
<span class="line"><span style="color:#A6ACCD;">    price: number</span></span>
<span class="line"><span style="color:#A6ACCD;">    constructor(name: string, price: number) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        super(name)</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.price = price</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    fly(): void {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(&#39;fly...&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    speak(): void {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(&#39;咕咕咕&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">let duck = new Duck(&#39;唐老鸭&#39;, 180)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(duck.name) // 唐老鸭</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(duck.price) // 180</span></span>
<span class="line"><span style="color:#A6ACCD;">duck.fly() // fly...</span></span>
<span class="line"><span style="color:#A6ACCD;">duck.speak() // 咕咕咕</span></span>
<span class="line"><span style="color:#A6ACCD;">duck.sing() // abcdefg</span></span></code></pre></div><h1 id="二、进阶篇" tabindex="-1">二、进阶篇 <a class="header-anchor" href="#二、进阶篇" aria-label="Permalink to &quot;二、进阶篇&quot;">​</a></h1><h2 id="_7-泛型" tabindex="-1">7.泛型 <a class="header-anchor" href="#_7-泛型" aria-label="Permalink to &quot;7.泛型&quot;">​</a></h2><h3 id="_1-泛型语法" tabindex="-1">1.泛型语法 <a class="header-anchor" href="#_1-泛型语法" aria-label="Permalink to &quot;1.泛型语法&quot;">​</a></h3><h4 id="泛型函数" tabindex="-1">泛型函数 <a class="header-anchor" href="#泛型函数" aria-label="Permalink to &quot;泛型函数&quot;">​</a></h4><p><img src="`+o+`" alt="image-20220712235632503"></p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function pickObjectKeys(obj, keys) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let result = {}</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (const key of keys) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (key in obj) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            result[key] = obj[key]</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return result</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h4 id="泛型类" tabindex="-1">泛型类 <a class="header-anchor" href="#泛型类" aria-label="Permalink to &quot;泛型类&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">class MyArray&lt;T&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    private list:T[] = []</span></span>
<span class="line"><span style="color:#A6ACCD;">    add(value: T) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.list.push(value)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    getMax():T {</span></span>
<span class="line"><span style="color:#A6ACCD;">        return this.list[0]</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let array = new MyArray&lt;number&gt;()</span></span>
<span class="line"><span style="color:#A6ACCD;">array.add(1)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(array.getMax()) // 1</span></span></code></pre></div><h4 id="泛型接口" tabindex="-1">泛型接口 <a class="header-anchor" href="#泛型接口" aria-label="Permalink to &quot;泛型接口&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">interface Calculate&lt;T&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    (a:T, b: T):T</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">let sum: Calculate&lt;number&gt; = function(a: number,b: number): number {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return a + b</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(sum(1,2)) // 3</span></span></code></pre></div><h4 id="泛型约束" tabindex="-1">泛型约束 <a class="header-anchor" href="#泛型约束" aria-label="Permalink to &quot;泛型约束&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">type Lihua = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">type xiaoming = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">type bool = Lihua extends xiaoming ? &#39;yes&#39; : &#39;no&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">// let flag: bool = &#39;no&#39; // 不能将类型“&quot;no&quot;”分配给类型“&quot;yes&quot;”</span></span>
<span class="line"><span style="color:#A6ACCD;">let flag: bool = &#39;yes&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">interface LengthWise {</span></span>
<span class="line"><span style="color:#A6ACCD;">    length: number</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">function logger&lt;T extends LengthWise&gt;(val: T) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(val.length)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">function reflectSpecified&lt;P extends number | string | boolean&gt;(param: P): P {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return param</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">reflectSpecified(1)</span></span>
<span class="line"><span style="color:#A6ACCD;">reflectSpecified(&#39;1&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">reflectSpecified(false)</span></span>
<span class="line"><span style="color:#A6ACCD;">// reflectSpecified({}) // 类型“{}”的参数不能赋给类型“string | number | boolean”的参数</span></span></code></pre></div><h4 id="泛型类型别名" tabindex="-1">泛型类型别名 <a class="header-anchor" href="#泛型类型别名" aria-label="Permalink to &quot;泛型类型别名&quot;">​</a></h4><ul><li>接口创建了一个新的名称，他可以在其他任意地方被调用，而类型别名并不是创建新的名字，例如报错信息就不会使用别名</li><li>类型别名不能被extends和implements，这</li><li>时我们应该尽量使用接口代替类型别名</li><li>当我们需要使用联合类型或者元组类型的时候，类型别名会更适合</li><li>一个原则：能用接口实现别用type</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">type Cart&lt;T&gt; = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    list: T[]</span></span>
<span class="line"><span style="color:#A6ACCD;">} | T []</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">let c1: Cart&lt;string&gt; = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    list: [&#39;1&#39;]</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let c2: Cart&lt;number&gt; = [1]</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">interface MyCart&lt;T=string&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    list: T[]</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let m1: MyCart&lt;number&gt; = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    list: [1]</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let m2: MyCart = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    list: [&#39;1&#39;]</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h3 id="_2-在函数中使用类型" tabindex="-1">2.在函数中使用类型 <a class="header-anchor" href="#_2-在函数中使用类型" aria-label="Permalink to &quot;2.在函数中使用类型&quot;">​</a></h3><h4 id="分配泛型参数" tabindex="-1">分配泛型参数 <a class="header-anchor" href="#分配泛型参数" aria-label="Permalink to &quot;分配泛型参数&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function identity&lt;T&gt;(value: T): T {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return value</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">// 显式指明与非显式指明</span></span>
<span class="line"><span style="color:#A6ACCD;">let myresult = identity&lt;number&gt;(123)</span></span>
<span class="line"><span style="color:#A6ACCD;">myresult = identity(123)</span></span></code></pre></div><h4 id="直接传递类型参数" tabindex="-1">直接传递类型参数 <a class="header-anchor" href="#直接传递类型参数" aria-label="Permalink to &quot;直接传递类型参数&quot;">​</a></h4><p>在使用自定义类型的时候，直接传递类型参数很有用</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">type ProgrammingLanguage = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const result2 = identity&lt;ProgrammingLanguage&gt;({name: &#39;ts&#39;})</span></span>
<span class="line"><span style="color:#A6ACCD;">async function fetchApi&lt;ResultType&gt;(path: string): Promise&lt;ResultType&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const response = await fetch(\`https://example.com/api\${path}\`)</span></span>
<span class="line"><span style="color:#A6ACCD;">    return response.json()</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h4 id="默认类型参数" tabindex="-1">默认类型参数 <a class="header-anchor" href="#默认类型参数" aria-label="Permalink to &quot;默认类型参数&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">async function myFetchApi&lt;ResultType = Record&lt;string, any&gt;&gt;(path: string): Promise&lt;ResultType&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const response = await fetch(\`https://example.com/api\${path}\`)</span></span>
<span class="line"><span style="color:#A6ACCD;">    return response.json()</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const fetchData = fetchApi(&#39;/users&#39;) // const myFetchData: Promise&lt;Record&lt;string, any&gt;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">const myFetchData = myFetchApi(&#39;/users&#39;) // const myFetchData: Promise&lt;Record&lt;string, any&gt;&gt;</span></span></code></pre></div><h4 id="类型参数约束" tabindex="-1">类型参数约束 <a class="header-anchor" href="#类型参数约束" aria-label="Permalink to &quot;类型参数约束&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">interface Sizeable {</span></span>
<span class="line"><span style="color:#A6ACCD;">    size: number</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">function trace &lt;T extends Sizeable&gt;(value: T): T {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return value</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">trace({size: 1})</span></span></code></pre></div><h3 id="_3-在接口、类和类型中使用泛型" tabindex="-1">3.在接口、类和类型中使用泛型 <a class="header-anchor" href="#_3-在接口、类和类型中使用泛型" aria-label="Permalink to &quot;3.在接口、类和类型中使用泛型&quot;">​</a></h3><h4 id="接口和类中的泛型" tabindex="-1">接口和类中的泛型 <a class="header-anchor" href="#接口和类中的泛型" aria-label="Permalink to &quot;接口和类中的泛型&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">interface MyInterface&lt;T&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    field: T</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">class MyClass&lt;T&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    field: T</span></span>
<span class="line"><span style="color:#A6ACCD;">    constructor(field: T) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.field = field</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h4 id="自定义类型中的泛型" tabindex="-1">自定义类型中的泛型 <a class="header-anchor" href="#自定义类型中的泛型" aria-label="Permalink to &quot;自定义类型中的泛型&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">type MyIdentityType&lt;T&gt; = T</span></span>
<span class="line"><span style="color:#A6ACCD;">type TN = MyIdentityType&lt;number&gt;</span></span></code></pre></div><h3 id="_4-使用泛型创建映射类型" tabindex="-1">4.使用泛型创建映射类型 <a class="header-anchor" href="#_4-使用泛型创建映射类型" aria-label="Permalink to &quot;4.使用泛型创建映射类型&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">type BooleanFields&lt;T&gt; = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    [k in keyof T]: boolean</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">type User = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    email: string</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">type UserFetchOptions = BooleanFields&lt;User&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">const userFetchOptions: UserFetchOptions = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    email: true,</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: false</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h3 id="_5-使用泛型创建条件类型" tabindex="-1">5.使用泛型创建条件类型 <a class="header-anchor" href="#_5-使用泛型创建条件类型" aria-label="Permalink to &quot;5.使用泛型创建条件类型&quot;">​</a></h3><h4 id="基础条件类型" tabindex="-1">基础条件类型 <a class="header-anchor" href="#基础条件类型" aria-label="Permalink to &quot;基础条件类型&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">type IsStringType&lt;T&gt; = T extends string ? true : false</span></span>
<span class="line"><span style="color:#A6ACCD;">type AType = &#39;abc&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">type BType = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">type ResultA = IsStringType&lt;AType&gt; // true</span></span>
<span class="line"><span style="color:#A6ACCD;">type ResultB = IsStringType&lt;BType&gt; // false</span></span></code></pre></div><h2 id="_8-结构类型系统" tabindex="-1">8.结构类型系统 <a class="header-anchor" href="#_8-结构类型系统" aria-label="Permalink to &quot;8.结构类型系统&quot;">​</a></h2><h3 id="接口的兼容性" tabindex="-1">接口的兼容性 <a class="header-anchor" href="#接口的兼容性" aria-label="Permalink to &quot;接口的兼容性&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">export {}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 接口的兼容性</span></span>
<span class="line"><span style="color:#A6ACCD;">interface Animal {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: number</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">interface Person {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: number</span></span>
<span class="line"><span style="color:#A6ACCD;">    gender: number</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">let a: Animal = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: &#39;狗子&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: 2</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let p: Person = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: &#39;well&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: 18,</span></span>
<span class="line"><span style="color:#A6ACCD;">    gender: 1</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">// 这里的入参Animal 有 name、age 两个属性</span></span>
<span class="line"><span style="color:#A6ACCD;">function getName(a: Animal): string {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return a.name</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">getName(a)</span></span>
<span class="line"><span style="color:#A6ACCD;">// Person 有 name、age、gender 三个属性，包含 Animal的两个属性</span></span>
<span class="line"><span style="color:#A6ACCD;">getName(p)</span></span></code></pre></div><ul><li>Animal两个属性：name、age</li><li>Person 三个属性：name、age、gender</li><li>p能作为入参是因为他的属性包含了需要的属性</li></ul><h3 id="基本类型的兼容性" tabindex="-1">基本类型的兼容性 <a class="header-anchor" href="#基本类型的兼容性" aria-label="Permalink to &quot;基本类型的兼容性&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">let num: string | number</span></span>
<span class="line"><span style="color:#A6ACCD;">let str: string = &#39;well&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">num = str</span></span></code></pre></div><ul><li>str 能赋值给 num 是因为他的属性包含了需要的属性</li></ul><h3 id="类的兼容性" tabindex="-1">类的兼容性 <a class="header-anchor" href="#类的兼容性" aria-label="Permalink to &quot;类的兼容性&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">class Animal {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name!: string</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">class Bird extends Animal {</span></span>
<span class="line"><span style="color:#A6ACCD;">    age!: number</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let b: Bird = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: &#39;&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: 0</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const a: Animal = b</span></span></code></pre></div><h3 id="函数的兼容性" tabindex="-1">函数的兼容性 <a class="header-anchor" href="#函数的兼容性" aria-label="Permalink to &quot;函数的兼容性&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">export {}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 比较参数: 参数不能比定义的多</span></span>
<span class="line"><span style="color:#A6ACCD;">type Func = (a: number, b: number) =&gt; void</span></span>
<span class="line"><span style="color:#A6ACCD;">let sum: Func</span></span>
<span class="line"><span style="color:#A6ACCD;">const f1 = (a: number, b:number):void =&gt; {}</span></span>
<span class="line"><span style="color:#A6ACCD;">function f2(a:number):void {}</span></span>
<span class="line"><span style="color:#A6ACCD;">// sum  有两个number类型参数，只要符合子集即可满足类型</span></span>
<span class="line"><span style="color:#A6ACCD;">sum = f1</span></span>
<span class="line"><span style="color:#A6ACCD;">sum = f2</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 比较返回值：返回值不能比定义的少</span></span>
<span class="line"><span style="color:#A6ACCD;">type GetPerson = () =&gt; {name: string, age: number}</span></span>
<span class="line"><span style="color:#A6ACCD;">let getPerson: GetPerson</span></span>
<span class="line"><span style="color:#A6ACCD;">function g1 () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return {</span></span>
<span class="line"><span style="color:#A6ACCD;">        name: &#39;well&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">        age: 18</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">function g2 () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return {</span></span>
<span class="line"><span style="color:#A6ACCD;">        name: &#39;well&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">function g3 () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return {</span></span>
<span class="line"><span style="color:#A6ACCD;">        name: &#39;well&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">        age: 18,</span></span>
<span class="line"><span style="color:#A6ACCD;">        sex: 1</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">getPerson = g1</span></span>
<span class="line"><span style="color:#A6ACCD;">// getPerson = g2 // 类型 &quot;{ name: string; }&quot; 中缺少属性 &quot;age&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">getPerson().age.toString() // 以这个来理解， g2没有age就会报错</span></span>
<span class="line"><span style="color:#A6ACCD;">getPerson = g3</span></span></code></pre></div><ul><li>比较参数: 参数不能比定义的多</li><li>比较返回值：返回值不能比定义的少</li></ul><h2 id="_9-类型保护" tabindex="-1">9.类型保护 <a class="header-anchor" href="#_9-类型保护" aria-label="Permalink to &quot;9.类型保护&quot;">​</a></h2><h3 id="typeof、instanceof-for-in-类型保护" tabindex="-1">typeof、instanceof for in 类型保护 <a class="header-anchor" href="#typeof、instanceof-for-in-类型保护" aria-label="Permalink to &quot;typeof、instanceof  for in 类型保护&quot;">​</a></h3><p><strong>通过一些关键字如 typeof instanceof for in 来缩小范围</strong></p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function double(input: string | number) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (typeof input === &#39;string&#39;) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    } else if (typeof input === &#39;number&#39;) {}</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">class Animal {}</span></span>
<span class="line"><span style="color:#A6ACCD;">class Bird extends Animal {}</span></span>
<span class="line"><span style="color:#A6ACCD;">class Dog extends Animal {}</span></span>
<span class="line"><span style="color:#A6ACCD;">function getName(animal: Animal) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (animal instanceof Bird) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(&#39;fly...&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    } else if(animal instanceof Dog) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(&#39;run...&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">interface Bird {</span></span>
<span class="line"><span style="color:#A6ACCD;">    swing: number</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">interface Dog {</span></span>
<span class="line"><span style="color:#A6ACCD;">    leg: number</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">function getNumber(x: Bird | Dog) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (&#39;swing&#39; in x) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(x)</span></span>
<span class="line"><span style="color:#A6ACCD;">    } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(x)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let bird: Bird = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    swing: 2</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h3 id="null-值类型保护" tabindex="-1">null 值类型保护 <a class="header-anchor" href="#null-值类型保护" aria-label="Permalink to &quot;null 值类型保护&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function getFirstLetter(s: string | null) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (s === null) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        return &#39;&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return s.charAt(0)</span></span>
<span class="line"><span style="color:#A6ACCD;">    // return s?.charAt(0)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h3 id="可辨识的联合类型" tabindex="-1">可辨识的联合类型 <a class="header-anchor" href="#可辨识的联合类型" aria-label="Permalink to &quot;可辨识的联合类型&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">interface WarningButton {</span></span>
<span class="line"><span style="color:#A6ACCD;">    class: &#39;waring&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    text1: &#39;修改&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">interface DangerButton {</span></span>
<span class="line"><span style="color:#A6ACCD;">    class: &#39;danger&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    text2: &#39;删除&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">type Button = WarningButton | DangerButton</span></span>
<span class="line"><span style="color:#A6ACCD;">function getButton(button: Button) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (button.class === &#39;waring&#39;) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(button)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (button.class === &#39;danger&#39;) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(button)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">interface User {</span></span>
<span class="line"><span style="color:#A6ACCD;">    username: string</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">type Action = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    type: &#39;add&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    payload: User</span></span>
<span class="line"><span style="color:#A6ACCD;">} | {</span></span>
<span class="line"><span style="color:#A6ACCD;">    type: &#39;delete&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    payload: number</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const reducer = (action: Action) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    switch (action.type) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        case &#39;add&#39;:</span></span>
<span class="line"><span style="color:#A6ACCD;">            action.payload.username</span></span>
<span class="line"><span style="color:#A6ACCD;">            break;</span></span>
<span class="line"><span style="color:#A6ACCD;">        case &#39;delete&#39;:</span></span>
<span class="line"><span style="color:#A6ACCD;">            const id: number = action.payload</span></span>
<span class="line"><span style="color:#A6ACCD;">            break</span></span>
<span class="line"><span style="color:#A6ACCD;">        default:</span></span>
<span class="line"><span style="color:#A6ACCD;">            break;</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h3 id="自定义类型保护" tabindex="-1">自定义类型保护 <a class="header-anchor" href="#自定义类型保护" aria-label="Permalink to &quot;自定义类型保护&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">interface Bird {</span></span>
<span class="line"><span style="color:#A6ACCD;">    swing: number // 2: 两个翅膀</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">interface Dog {</span></span>
<span class="line"><span style="color:#A6ACCD;">    leg: number // 4：四条腿</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">function isBird(x: Bird | Dog): x is Bird {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return (x as Bird).swing === 2</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">function getAnimal(x: Bird | Dog) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (isBird(x)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(x) // (parameter) x: Bird</span></span>
<span class="line"><span style="color:#A6ACCD;">    } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(x) // (parameter) x: Dog</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h2 id="_10-类型变换" tabindex="-1">10.类型变换 <a class="header-anchor" href="#_10-类型变换" aria-label="Permalink to &quot;10.类型变换&quot;">​</a></h2><h3 id="_1-类型推断" tabindex="-1">1.类型推断 <a class="header-anchor" href="#_1-类型推断" aria-label="Permalink to &quot;1.类型推断&quot;">​</a></h3><h4 id="从右到左" tabindex="-1">从右到左 <a class="header-anchor" href="#从右到左" aria-label="Permalink to &quot;从右到左&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 从赋的值中推断出来（从右到左）</span></span>
<span class="line"><span style="color:#A6ACCD;">let name = &#39;well&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">// name = 1 // 不能将类型“number”分配给类型“string”</span></span></code></pre></div><h4 id="底部流出" tabindex="-1">底部流出 <a class="header-anchor" href="#底部流出" aria-label="Permalink to &quot;底部流出&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 根据 return 推断返回类型（底部流出）</span></span>
<span class="line"><span style="color:#A6ACCD;">function add(a:number, b: number) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return a+b</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let c = add(1,2)</span></span>
<span class="line"><span style="color:#A6ACCD;">// c = &#39;3&#39; // 不能将类型“string”分配给类型“number”</span></span></code></pre></div><h4 id="从左到右" tabindex="-1">从左到右 <a class="header-anchor" href="#从左到右" aria-label="Permalink to &quot;从左到右&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 从左到右</span></span>
<span class="line"><span style="color:#A6ACCD;">type Sum = (a: number, b: number) =&gt; number</span></span>
<span class="line"><span style="color:#A6ACCD;">let sum: Sum = (a, b) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // a = &#39;1&#39; // 不能将类型“string”分配给类型“number”</span></span>
<span class="line"><span style="color:#A6ACCD;">    return a + b</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h4 id="结构化" tabindex="-1">结构化 <a class="header-anchor" href="#结构化" aria-label="Permalink to &quot;结构化&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 对象类型推断</span></span>
<span class="line"><span style="color:#A6ACCD;">let Person = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: 18</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let { age } = Person</span></span>
<span class="line"><span style="color:#A6ACCD;">// age = &#39;18&#39; // 不能将类型“string”分配给类型“number”</span></span></code></pre></div><h4 id="defaultprops" tabindex="-1">DefaultProps <a class="header-anchor" href="#defaultprops" aria-label="Permalink to &quot;DefaultProps&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 接口类型推断</span></span>
<span class="line"><span style="color:#A6ACCD;">interface DefaultProps {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name?: string</span></span>
<span class="line"><span style="color:#A6ACCD;">    age?: number</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let defaultProps: DefaultProps = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: &#39;well&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: 18</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let props = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    ...defaultProps,</span></span>
<span class="line"><span style="color:#A6ACCD;">    home: &#39;深圳&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">/**</span></span>
<span class="line"><span style="color:#A6ACCD;"> * let props: {</span></span>
<span class="line"><span style="color:#A6ACCD;">    home: string;</span></span>
<span class="line"><span style="color:#A6ACCD;">    name?: string | undefined;</span></span>
<span class="line"><span style="color:#A6ACCD;">    age?: number | undefined;</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;"> */</span></span></code></pre></div><h4 id="消息使用返回值" tabindex="-1">消息使用返回值 <a class="header-anchor" href="#消息使用返回值" aria-label="Permalink to &quot;消息使用返回值&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 小心使用返回值</span></span>
<span class="line"><span style="color:#A6ACCD;">function addOne (a: any) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return a+1</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">function total(a:number, b: number) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return a+addOne(b)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let k = total(1,2) // let k: any</span></span></code></pre></div><h3 id="_2-交叉类型-交集" tabindex="-1">2.交叉类型（交集） <a class="header-anchor" href="#_2-交叉类型-交集" aria-label="Permalink to &quot;2.交叉类型（交集）&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 交叉类型</span></span>
<span class="line"><span style="color:#A6ACCD;">interface A {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string</span></span>
<span class="line"><span style="color:#A6ACCD;">    c: number</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">interface B {</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: number</span></span>
<span class="line"><span style="color:#A6ACCD;">    c: number</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">let a: A</span></span>
<span class="line"><span style="color:#A6ACCD;">let b: B</span></span>
<span class="line"><span style="color:#A6ACCD;">type C = A&amp;B</span></span>
<span class="line"><span style="color:#A6ACCD;">let c: C = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: &#39;well&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: 18,</span></span>
<span class="line"><span style="color:#A6ACCD;">    c: 101</span></span>
<span class="line"><span style="color:#A6ACCD;">    // d: 333 // 对象字面量只能指定已知属性，并且“d”不在类型“C”中。</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">type AA = string | number</span></span>
<span class="line"><span style="color:#A6ACCD;">type BB = string | boolean</span></span>
<span class="line"><span style="color:#A6ACCD;">type CC = AA&amp;BB // type CC = string</span></span>
<span class="line"><span style="color:#A6ACCD;">// let cc: CC = false</span></span>
<span class="line"><span style="color:#A6ACCD;">let cc: CC = &#39;WELL&#39;</span></span></code></pre></div><h3 id="_3-联合类型-并集" tabindex="-1">3. 联合类型（并集） <a class="header-anchor" href="#_3-联合类型-并集" aria-label="Permalink to &quot;3. 联合类型（并集）&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">interface A {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string</span></span>
<span class="line"><span style="color:#A6ACCD;">    c: number</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">interface B {</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: number</span></span>
<span class="line"><span style="color:#A6ACCD;">    c: number</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">type C = A | B</span></span>
<span class="line"><span style="color:#A6ACCD;">let c1: C = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: &#39;well&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    c: 18</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let c2: C = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: 18,</span></span>
<span class="line"><span style="color:#A6ACCD;">    c: 110</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let c3: C = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: &#39;well&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: 18,</span></span>
<span class="line"><span style="color:#A6ACCD;">    c: 110</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let c4: C = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: &#39;well&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: 18,</span></span>
<span class="line"><span style="color:#A6ACCD;">    c: 110,</span></span>
<span class="line"><span style="color:#A6ACCD;">    // type: &#39;boom&#39; // error</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">type AA = string | number</span></span>
<span class="line"><span style="color:#A6ACCD;">type BB = string | boolean</span></span>
<span class="line"><span style="color:#A6ACCD;">type CC = AA | BB // type CC = string | number | boolean</span></span>
<span class="line"><span style="color:#A6ACCD;">let cc1: CC = &#39;WELL&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">let cc2: CC = 18</span></span>
<span class="line"><span style="color:#A6ACCD;">let cc3: CC = false</span></span></code></pre></div><h3 id="_4-mixin" tabindex="-1">4. mixin <a class="header-anchor" href="#_4-mixin" aria-label="Permalink to &quot;4. mixin&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function mixin&lt;T,U&gt;(one: T, two: U) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const result = &lt;(T &amp; U)&gt;{}</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let key in one) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        (&lt;T&gt;result)[key] = one[key]</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let key in two) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        (&lt;U&gt;result)[key] = two[key]</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return result</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const x = mixin({name: &#39;well&#39;}, {age: 18})</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(x.name)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(x.age)</span></span></code></pre></div><h3 id="_5-typeof" tabindex="-1">5.typeof <a class="header-anchor" href="#_5-typeof" aria-label="Permalink to &quot;5.typeof&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">type person = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let p: person = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: &#39;well&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">type doubleP = typeof p</span></span>
<span class="line"><span style="color:#A6ACCD;">let dp: doubleP = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: &#39;liuguowei&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h3 id="_6-索引访问操作符" tabindex="-1">6.索引访问操作符 <a class="header-anchor" href="#_6-索引访问操作符" aria-label="Permalink to &quot;6.索引访问操作符&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">export {}</span></span>
<span class="line"><span style="color:#A6ACCD;">interface Person {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: number</span></span>
<span class="line"><span style="color:#A6ACCD;">    job: {</span></span>
<span class="line"><span style="color:#A6ACCD;">        name: string</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let FrontEndJob:Person[&#39;job&#39;] = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: &#39;前端&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h3 id="_7-映射类型-partial" tabindex="-1">7.映射类型 Partial <a class="header-anchor" href="#_7-映射类型-partial" aria-label="Permalink to &quot;7.映射类型 Partial&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 映射类型</span></span>
<span class="line"><span style="color:#A6ACCD;">interface Person {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: number</span></span>
<span class="line"><span style="color:#A6ACCD;">    gender: &#39;male&#39; | &#39;female&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">// 批量把一个接口中的属性变成可选</span></span>
<span class="line"><span style="color:#A6ACCD;">type PartialPerson = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    [key in keyof Person]?: Person[key]</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">// 也可以用内置类型</span></span>
<span class="line"><span style="color:#A6ACCD;">type PPerson = Partial&lt;Person&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">let p1: PartialPerson = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: &#39;well&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let p2: PPerson = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: &#39;well&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h3 id="_8-条件类型" tabindex="-1">8.条件类型 <a class="header-anchor" href="#_8-条件类型" aria-label="Permalink to &quot;8.条件类型&quot;">​</a></h3><h4 id="条件类型与条件类型的分发" tabindex="-1">条件类型与条件类型的分发 <a class="header-anchor" href="#条件类型与条件类型的分发" aria-label="Permalink to &quot;条件类型与条件类型的分发&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 定义条件类型</span></span>
<span class="line"><span style="color:#A6ACCD;">interface Fish {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name1: string</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">interface Water {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name2: string</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">interface Bird {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name3: string</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">interface Sky {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name4: string</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">type Condition&lt;T&gt; = T extends Fish ? Water : Bird</span></span>
<span class="line"><span style="color:#A6ACCD;">// let con: Water</span></span>
<span class="line"><span style="color:#A6ACCD;">let con: Condition&lt;Fish&gt; = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name2: &#39;水&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 条件类型的分发</span></span>
<span class="line"><span style="color:#A6ACCD;">// let con1: Water | Bird</span></span>
<span class="line"><span style="color:#A6ACCD;">let con1: Condition&lt;Fish | Bird&gt; = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name2: &#39;水&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">// let con2: Water | Bird</span></span>
<span class="line"><span style="color:#A6ACCD;">let con2: Condition&lt;Fish | Bird&gt; = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name4: &#39;天空&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 找出T中不包含U的部分</span></span>
<span class="line"><span style="color:#A6ACCD;">type Diff&lt;T,U&gt; = T extends U ? never : T</span></span>
<span class="line"><span style="color:#A6ACCD;">// type R = &quot;d&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">type R = Diff&lt;&#39;a&#39; | &#39;b&#39; | &#39;c&#39; | &#39;d&#39;, &#39;a&#39; | &#39;b&#39; | &#39;c&#39;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">let r: R = &#39;d&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 找出TU共有部分</span></span>
<span class="line"><span style="color:#A6ACCD;">type Filter&lt;T, U&gt; = T extends U ? T : never</span></span>
<span class="line"><span style="color:#A6ACCD;">// type F = &quot;a&quot; | &quot;b&quot; | &quot;c&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">type F = Filter&lt;&#39;a&#39; | &#39;b&#39; | &#39;c&#39; | &#39;d&#39;, &#39;a&#39; | &#39;b&#39; | &#39;c&#39;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">let f: F = &#39;a&#39;</span></span></code></pre></div><h4 id="内置条件类型" tabindex="-1">内置条件类型 <a class="header-anchor" href="#内置条件类型" aria-label="Permalink to &quot;内置条件类型&quot;">​</a></h4><h5 id="exclude" tabindex="-1">Exclude <a class="header-anchor" href="#exclude" aria-label="Permalink to &quot;Exclude&quot;">​</a></h5><p><code>Exclude&lt;T, U&gt;</code> 的作用是将T中属于U的类型移除掉。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">type A = &#39;a&#39; | &#39;b&#39; | &#39;c&#39; | &#39;d&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">type B  = &#39;a&#39; | &#39;b&#39; | &#39;c&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">// Exclude 手写</span></span>
<span class="line"><span style="color:#A6ACCD;">type MyExclue&lt;T, U&gt; = T extends U ? never : T</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">type T0 = Exclude&lt;A, B&gt; // type T0 = &quot;d&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">type MT0 = MyExclue&lt;A, B&gt; // type T0 = &quot;d&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">let t0: T0 = &#39;d&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">let tt0: MT0 = &#39;d&#39;</span></span></code></pre></div><h5 id="extract" tabindex="-1">Extract <a class="header-anchor" href="#extract" aria-label="Permalink to &quot;Extract&quot;">​</a></h5><p><code>Extract&lt;T, U&gt;</code>的作用是返回T中属于U的类型</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">type A = &#39;a&#39; | &#39;b&#39; | &#39;c&#39; | &#39;d&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">type B  = &#39;a&#39; | &#39;b&#39; | &#39;c&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">type MyExtract&lt;T,U&gt; = T extends U ? T: never</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">type T0 = Extract&lt;A,B&gt; // type T0 = &quot;a&quot; | &quot;b&quot; | &quot;c&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">type MT0 = MyExtract&lt;A, B&gt; // type MT0 = &quot;a&quot; | &quot;b&quot; | &quot;c&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">let t0: T0 = &#39;a&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">let tt0: MT0 = &#39;b&#39;</span></span></code></pre></div><h5 id="nonnullable" tabindex="-1">NonNullable <a class="header-anchor" href="#nonnullable" aria-label="Permalink to &quot;NonNullable&quot;">​</a></h5><p><code>NonNullable&lt;T&gt;</code> 的作用是用来过滤类型中的 <code>null</code> 及 <code>undefined</code> 类型</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">type A = null | undefined | string</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">type MyNonNullable&lt;T&gt; = T extends null | undefined ? never : T</span></span>
<span class="line"><span style="color:#A6ACCD;">type T0 = NonNullable&lt;A&gt; // type T0 = string</span></span>
<span class="line"><span style="color:#A6ACCD;">type MT0 = NonNullable&lt;A&gt; // type MT0 = string</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">let t0: T0 = &#39;well&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">let tt0: MT0 = &#39;well&#39;</span></span></code></pre></div><h5 id="returntype" tabindex="-1">ReturnType <a class="header-anchor" href="#returntype" aria-label="Permalink to &quot;ReturnType&quot;">​</a></h5><p>用来得到一个函数的返回值类型</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">/**</span></span>
<span class="line"><span style="color:#A6ACCD;"> * 自定义实现</span></span>
<span class="line"><span style="color:#A6ACCD;"> * 1. infer 在这里用于提取函数类型的返回值</span></span>
<span class="line"><span style="color:#A6ACCD;"> * 2.ReturnType&lt;T&gt; 只是将 infer R 从参数位置移动到返回值位置，因此此时 R 即是表示待推断的返回值类型</span></span>
<span class="line"><span style="color:#A6ACCD;"> */</span></span>
<span class="line"><span style="color:#A6ACCD;">type MyReturnType&lt;T extends (...args: any[]) =&gt; any&gt; = T extends (</span></span>
<span class="line"><span style="color:#A6ACCD;">    ...args: any[]</span></span>
<span class="line"><span style="color:#A6ACCD;">) =&gt; infer R ? R : any</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">function getUser(name: string, age: number) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return {</span></span>
<span class="line"><span style="color:#A6ACCD;">        name,</span></span>
<span class="line"><span style="color:#A6ACCD;">        age</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">/**</span></span>
<span class="line"><span style="color:#A6ACCD;"> * type GetUserType = (name: string, age: number) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string;</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: number;</span></span>
<span class="line"><span style="color:#A6ACCD;">   }</span></span>
<span class="line"><span style="color:#A6ACCD;"> */</span></span>
<span class="line"><span style="color:#A6ACCD;">type GetUserType = typeof getUser</span></span>
<span class="line"><span style="color:#A6ACCD;">/**</span></span>
<span class="line"><span style="color:#A6ACCD;"> * type ReturnUser/MyReturnUser = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string;</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: number;</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;"> */</span></span>
<span class="line"><span style="color:#A6ACCD;">type ReturnUser = ReturnType&lt;GetUserType&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">type MyReturnUser = MyReturnType&lt;GetUserType&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">let u: ReturnUser = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: &#39;well&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: 18</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h5 id="parameters" tabindex="-1">Parameters <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;Parameters&quot;">​</a></h5><p><code>Parameters&lt;T&gt;</code> 的作用是用于获得函数的参数类型组成的元组类型。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function getUser(name: string, age: number) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return {</span></span>
<span class="line"><span style="color:#A6ACCD;">        name,</span></span>
<span class="line"><span style="color:#A6ACCD;">        age</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">type GetUserType = typeof getUser</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">type MyParameters&lt;T extends (...args: any) =&gt; any&gt; =</span></span>
<span class="line"><span style="color:#A6ACCD;">    T extends (...args: infer P) =&gt; any ? P : never</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// type parametersUser = [name: string, age: number]</span></span>
<span class="line"><span style="color:#A6ACCD;">type parametersUser = Parameters&lt;GetUserType&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">type MyParametersUser = MyParameters&lt;GetUserType&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">let u1:parametersUser= [&#39;123&#39;, 18]</span></span>
<span class="line"><span style="color:#A6ACCD;">let u2:MyParametersUser = [&#39;well&#39;, 18]</span></span></code></pre></div><h5 id="constructorparameters" tabindex="-1">ConstructorParameters <a class="header-anchor" href="#constructorparameters" aria-label="Permalink to &quot;ConstructorParameters&quot;">​</a></h5><p><code>ConstructorParameters&lt;T&gt;</code>的作用是用于获取类的构造函数的参数类型</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">class Person {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string</span></span>
<span class="line"><span style="color:#A6ACCD;">    constructor(name: string) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.name = name</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    getName() {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(this.name)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">type MyConstructorParameters&lt;T extends abstract new (...args: any) =&gt; any&gt; =</span></span>
<span class="line"><span style="color:#A6ACCD;">    T extends abstract new (...args: infer P) =&gt; any ? P : never</span></span>
<span class="line"><span style="color:#A6ACCD;">type params = ConstructorParameters&lt;typeof Person&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">// let p: [name: string]</span></span>
<span class="line"><span style="color:#A6ACCD;">let p: params = [&#39;well&#39;]</span></span></code></pre></div><h5 id="infer-应用" tabindex="-1">infer 应用 <a class="header-anchor" href="#infer-应用" aria-label="Permalink to &quot;infer 应用&quot;">​</a></h5><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// tuple(元组)转union(联合)</span></span>
<span class="line"><span style="color:#A6ACCD;">type Elements&lt;T&gt; = T extends Array&lt;infer E&gt; ? E : never</span></span>
<span class="line"><span style="color:#A6ACCD;">type Ttuple = [string, number]</span></span>
<span class="line"><span style="color:#A6ACCD;">// type TupleToUnion = string | number</span></span>
<span class="line"><span style="color:#A6ACCD;">type TupleToUnion = Elements&lt;Ttuple&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 联合类型转交叉类型</span></span>
<span class="line"><span style="color:#A6ACCD;">type T1 = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">type T2 = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: number</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">type ToIntersection&lt;T&gt; = T extends {</span></span>
<span class="line"><span style="color:#A6ACCD;">    a: (x: infer U) =&gt; void, b: (x: infer U) =&gt; void</span></span>
<span class="line"><span style="color:#A6ACCD;">} ? U : never</span></span>
<span class="line"><span style="color:#A6ACCD;">// type T3 = T1 &amp; T2</span></span>
<span class="line"><span style="color:#A6ACCD;">type T3 = ToIntersection&lt;{ a: (x: T1) =&gt; void, b: (x: T2) =&gt; void}&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">let tt3: T3 = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: &#39;well&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: 18</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h2 id="_11-工具类型" tabindex="-1">11.工具类型 <a class="header-anchor" href="#_11-工具类型" aria-label="Permalink to &quot;11.工具类型&quot;">​</a></h2><h3 id="partial" tabindex="-1">Partial <a class="header-anchor" href="#partial" aria-label="Permalink to &quot;Partial&quot;">​</a></h3><p><code>Partial&lt;T&gt;将类型的属性变成可选</code></p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">interface Company {</span></span>
<span class="line"><span style="color:#A6ACCD;">    id: number,</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">interface Person {</span></span>
<span class="line"><span style="color:#A6ACCD;">    id: number,</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string,</span></span>
<span class="line"><span style="color:#A6ACCD;">    company: Company</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">type DeepPartial&lt;T&gt; = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    [U in keyof T] ?: T[U] extends object ? DeepPartial&lt;T[U]&gt; : T[U]</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">type PartialPerson = Partial&lt;Person&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">/**</span></span>
<span class="line"><span style="color:#A6ACCD;"> * type PartialPerson = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    id?: number | undefined;</span></span>
<span class="line"><span style="color:#A6ACCD;">    name?: string | undefined;</span></span>
<span class="line"><span style="color:#A6ACCD;">    company?: Company | undefined;</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;"> */</span></span>
<span class="line"><span style="color:#A6ACCD;">let p: PartialPerson = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 类型“{}”缺少类型“Company”中的以下属性: id, name</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 这里如果属性是对象，如果写了此属性，其内层不是可选属性</span></span>
<span class="line"><span style="color:#A6ACCD;">    // company: {}</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">// 使用自定义深度遍历使深层属性也是可选属性</span></span>
<span class="line"><span style="color:#A6ACCD;">type DeepPartialPerson = DeepPartial&lt;Person&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">/* </span></span>
<span class="line"><span style="color:#A6ACCD;">  type DeepPartialPerson = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    id?: number | undefined;</span></span>
<span class="line"><span style="color:#A6ACCD;">    name?: string | undefined;</span></span>
<span class="line"><span style="color:#A6ACCD;">    company?: DeepPartial&lt;Company&gt; | undefined;</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">*/</span></span>
<span class="line"><span style="color:#A6ACCD;">let dp: DeepPartialPerson = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    company: {}</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h3 id="required" tabindex="-1">Required <a class="header-anchor" href="#required" aria-label="Permalink to &quot;Required&quot;">​</a></h3><p><code>Required&lt;T&gt;</code> 将类型的属性变成必选</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">interface Company {</span></span>
<span class="line"><span style="color:#A6ACCD;">    id: number,</span></span>
<span class="line"><span style="color:#A6ACCD;">    name?: string</span></span>
<span class="line"><span style="color:#A6ACCD;">    salary?: number</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">/* type RequiredCompany = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    id: number;</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string;</span></span>
<span class="line"><span style="color:#A6ACCD;">    salary: number;</span></span>
<span class="line"><span style="color:#A6ACCD;">} */</span></span>
<span class="line"><span style="color:#A6ACCD;">type RequiredCompany = Required&lt;Company&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 自定义实现</span></span>
<span class="line"><span style="color:#A6ACCD;">type MyRequired&lt;T&gt; = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    [P in keyof T]-?: T[P]</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">type MyRequiredCompany = MyRequired&lt;Company&gt;</span></span></code></pre></div><h3 id="readonly" tabindex="-1">ReadOnly <a class="header-anchor" href="#readonly" aria-label="Permalink to &quot;ReadOnly&quot;">​</a></h3><p><code>ReadOnly&lt;T&gt;</code>将类型的属性变成只读</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">interface Company {</span></span>
<span class="line"><span style="color:#A6ACCD;">    id: number,</span></span>
<span class="line"><span style="color:#A6ACCD;">    name?: string</span></span>
<span class="line"><span style="color:#A6ACCD;">    salary?: number</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">// 自定义实现</span></span>
<span class="line"><span style="color:#A6ACCD;">type MyReadonly&lt;T&gt; = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    readonly [P in keyof T]: T[P];</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">type ReadOnlyPerson = Readonly&lt;Company&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">/* </span></span>
<span class="line"><span style="color:#A6ACCD;">type ReadOnlyPerson = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    readonly id: number;</span></span>
<span class="line"><span style="color:#A6ACCD;">    readonly name?: string | undefined;</span></span>
<span class="line"><span style="color:#A6ACCD;">    readonly salary?: number | undefined;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">*/</span></span>
<span class="line"><span style="color:#A6ACCD;">let c: ReadOnlyPerson = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    id: 0</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">// c.id = 2 // Cannot assign to &#39;id&#39; because it is a read-only property</span></span></code></pre></div><h3 id="pick" tabindex="-1">Pick <a class="header-anchor" href="#pick" aria-label="Permalink to &quot;Pick&quot;">​</a></h3><p><code>Pick&lt;T, ...&gt;</code> 提取类型的属性</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">interface Person {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: number</span></span>
<span class="line"><span style="color:#A6ACCD;">    gender: number</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">// 自定义实现</span></span>
<span class="line"><span style="color:#A6ACCD;">type MyPick&lt;T, K extends keyof T&gt; = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    [P in K]: T[P]</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">/* </span></span>
<span class="line"><span style="color:#A6ACCD;">type PickPerson = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string;</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: number;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">*/</span></span>
<span class="line"><span style="color:#A6ACCD;">type PickPerson = Pick&lt;Person, &#39;name&#39; | &#39;age&#39;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">let person: PickPerson = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: &#39;well&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: 18</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h3 id="extract-1" tabindex="-1">Extract <a class="header-anchor" href="#extract-1" aria-label="Permalink to &quot;Extract&quot;">​</a></h3><p><code>Extract&lt;T, U&gt;</code>提取出T中属于U的类型属性</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 自定义实现</span></span>
<span class="line"><span style="color:#A6ACCD;">type MyExtract&lt;T, U&gt; = T extends U ? T : never</span></span>
<span class="line"><span style="color:#A6ACCD;">// type E = string | number</span></span>
<span class="line"><span style="color:#A6ACCD;">type E = Extract&lt;string | number | boolean, string | number&gt;</span></span></code></pre></div><h3 id="record" tabindex="-1">Record <a class="header-anchor" href="#record" aria-label="Permalink to &quot;Record&quot;">​</a></h3><p><code>Record&lt;K extends keyof any, T&gt;</code> 的作用是将 <code>K</code> 中所有的属性的值转化为 <code>T</code> 类型。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">type MyRecord&lt;K extends keyof any, T&gt; = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    [P in K]: T</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">interface PageInfo {</span></span>
<span class="line"><span style="color:#A6ACCD;">    title: string;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">type Page = &quot;home&quot; | &quot;about&quot; | &quot;contact&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">type pageRecord = Record&lt;Page, PageInfo&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">/* type pageRecord = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    home: PageInfo;</span></span>
<span class="line"><span style="color:#A6ACCD;">    about: PageInfo;</span></span>
<span class="line"><span style="color:#A6ACCD;">    contact: PageInfo;</span></span>
<span class="line"><span style="color:#A6ACCD;">} */</span></span>
<span class="line"><span style="color:#A6ACCD;">const x: Record&lt;Page, PageInfo&gt; = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    about: {</span></span>
<span class="line"><span style="color:#A6ACCD;">        title: &quot;about&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">    },</span></span>
<span class="line"><span style="color:#A6ACCD;">    home: {</span></span>
<span class="line"><span style="color:#A6ACCD;">        title: &quot;home&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">    },</span></span>
<span class="line"><span style="color:#A6ACCD;">    contact: {</span></span>
<span class="line"><span style="color:#A6ACCD;">        title: &quot;contact&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h3 id="omit" tabindex="-1">Omit <a class="header-anchor" href="#omit" aria-label="Permalink to &quot;Omit&quot;">​</a></h3><p><code>Omit&lt;T, K extends keyof any&gt;</code> 的作用是使用 <code>T</code> 类型中除了 <code>K</code> 类型的所有属性，来构造一个新的类型</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">type MyOmit&lt;T, K extends keyof any&gt; = Pick&lt;T, Exclude&lt;keyof T, K&gt;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">interface Jobs {</span></span>
<span class="line"><span style="color:#A6ACCD;">    title: string;</span></span>
<span class="line"><span style="color:#A6ACCD;">    desc: string;</span></span>
<span class="line"><span style="color:#A6ACCD;">    saray: number;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">type JobsOmit = Omit&lt;Jobs, &quot;desc&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">/* type JobsOmit = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    title: string;</span></span>
<span class="line"><span style="color:#A6ACCD;">    saray: number;</span></span>
<span class="line"><span style="color:#A6ACCD;">} */</span></span>
<span class="line"><span style="color:#A6ACCD;">const MyJob: JobsOmit = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    title: &#39;切图仔&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    saray: 200</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h2 id="_12-自定义类型" tabindex="-1">12.自定义类型 <a class="header-anchor" href="#_12-自定义类型" aria-label="Permalink to &quot;12.自定义类型&quot;">​</a></h2><h3 id="proxy" tabindex="-1">Proxy <a class="header-anchor" href="#proxy" aria-label="Permalink to &quot;Proxy&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">type Proxy&lt;T&gt; = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    get(): T,</span></span>
<span class="line"><span style="color:#A6ACCD;">    set(value: T): void</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">type Proxify&lt;T&gt; = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    [P in keyof T]: Proxy&lt;T[P]&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">function proxify&lt;T&gt;(obj: T):Proxify&lt;T&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let result = &lt;Proxify&lt;T&gt;&gt;{}</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (const key in obj) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        Object.defineProperty(result, key, {</span></span>
<span class="line"><span style="color:#A6ACCD;">            get: () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">                return obj[key]</span></span>
<span class="line"><span style="color:#A6ACCD;">            },</span></span>
<span class="line"><span style="color:#A6ACCD;">            set: (value) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">                console.log(&#39;set&#39;, key, value)</span></span>
<span class="line"><span style="color:#A6ACCD;">                obj[key] = value</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        })</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return result</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">interface Props {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string,</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: number</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let props: Props = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: &#39;well&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: 18</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let proxyProps: any = proxify&lt;Props&gt;(props)</span></span>
<span class="line"><span style="color:#A6ACCD;">proxyProps.name = &#39;liuguowei&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(proxyProps.name)</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">set name liuguowei</span></span>
<span class="line"><span style="color:#A6ACCD;">liuguowei</span></span></code></pre></div><h3 id="intersection-交集" tabindex="-1">InterSection(交集) <a class="header-anchor" href="#intersection-交集" aria-label="Permalink to &quot;InterSection(交集)&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 自定义交集</span></span>
<span class="line"><span style="color:#A6ACCD;">type InterSection&lt;T extends object, U extends object&gt; = Pick&lt;T, Extract&lt;keyof T, keyof U&gt; &amp; Extract&lt;keyof U, keyof T&gt;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">type Props = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: number</span></span>
<span class="line"><span style="color:#A6ACCD;">    visible: boolean</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">type DefaultProps = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: number</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">/**</span></span>
<span class="line"><span style="color:#A6ACCD;"> * type DuplicateProps = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: number;</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;"> */</span></span>
<span class="line"><span style="color:#A6ACCD;">type DuplicateProps = InterSection&lt;Props, DefaultProps&gt;</span></span></code></pre></div><h2 id="_13-模块-vs-命名空间" tabindex="-1">13.模块 VS 命名空间 <a class="header-anchor" href="#_13-模块-vs-命名空间" aria-label="Permalink to &quot;13.模块 VS 命名空间&quot;">​</a></h2><h3 id="模块" tabindex="-1">模块 <a class="header-anchor" href="#模块" aria-label="Permalink to &quot;模块&quot;">​</a></h3><h4 id="全局模块" tabindex="-1">全局模块 <a class="header-anchor" href="#全局模块" aria-label="Permalink to &quot;全局模块&quot;">​</a></h4><ul><li>默认情况下，处于全局命名空间中</li><li>全局空间是危险的，会与文件内的代码命名冲突</li></ul><h4 id="文件模块" tabindex="-1">文件模块 <a class="header-anchor" href="#文件模块" aria-label="Permalink to &quot;文件模块&quot;">​</a></h4><ul><li>文件模块也称为外部模块，如果在ts文件根级别位置含有import 或者 export，那么它会在这个文件中创建一个本地作用域</li><li>模块是TS中外部模块的简称，侧重于代码的复用</li><li>模块在其自身的作用域里执行，而不是全局作用域</li><li>一个模块里的变量、函数、类等在外部是不可见的，除非你把它导出</li><li>如果想要使用另一个模块的变量，则需要导入</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">export const name = &#39;well&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">export const age = 18</span></span></code></pre></div><h3 id="命名空间" tabindex="-1">命名空间 <a class="header-anchor" href="#命名空间" aria-label="Permalink to &quot;命名空间&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">export namespace zoo {</span></span>
<span class="line"><span style="color:#A6ACCD;">    export class Dog {</span></span>
<span class="line"><span style="color:#A6ACCD;">        log() {</span></span>
<span class="line"><span style="color:#A6ACCD;">            console.log(&#39;zoo dog&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">export namespace home {</span></span>
<span class="line"><span style="color:#A6ACCD;">    export class Dog {</span></span>
<span class="line"><span style="color:#A6ACCD;">        log() {</span></span>
<span class="line"><span style="color:#A6ACCD;">            console.log(&#39;home dog&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const zooDog = new zoo.Dog()</span></span>
<span class="line"><span style="color:#A6ACCD;">const homeDog = new home.Dog()</span></span>
<span class="line"><span style="color:#A6ACCD;">zooDog.log()</span></span>
<span class="line"><span style="color:#A6ACCD;">homeDog.log()</span></span></code></pre></div><ul><li>命名空间就是一个对象</li><li>命名空间内部需要export 来导出才可以被获取</li><li>在nameSpace 加 export 也可以导出命名空间</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">import { name, age } from &#39;./module&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">import { zoo, home } from &#39;./nameSpace&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(name, age) // well 18</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(zoo, home) // { Dog: [class Dog] } { Dog: [class Dog] }</span></span></code></pre></div><h2 id="_14-类型声明" tabindex="-1">14.类型声明 <a class="header-anchor" href="#_14-类型声明" aria-label="Permalink to &quot;14.类型声明&quot;">​</a></h2><ul><li>声明文件可以让我们不需要将JS重构为TS，只需要加上声明文件就可以使用</li><li>类型声明在编译的时候会被删除，不会影响真正的代码</li><li>关键字 declare 表示声明的意思，我们可以用它来做各种声明</li></ul><h3 id="普通声明" tabindex="-1">普通声明 <a class="header-anchor" href="#普通声明" aria-label="Permalink to &quot;普通声明&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 普通声明</span></span>
<span class="line"><span style="color:#A6ACCD;">declare let age: number</span></span>
<span class="line"><span style="color:#A6ACCD;">declare function getName(): string</span></span>
<span class="line"><span style="color:#A6ACCD;">declare class Animal{}</span></span></code></pre></div><h3 id="外部枚举" tabindex="-1">外部枚举 <a class="header-anchor" href="#外部枚举" aria-label="Permalink to &quot;外部枚举&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 外部枚举</span></span>
<span class="line"><span style="color:#A6ACCD;">declare enum Seasons {</span></span>
<span class="line"><span style="color:#A6ACCD;">    Spring,</span></span>
<span class="line"><span style="color:#A6ACCD;">    Summer,</span></span>
<span class="line"><span style="color:#A6ACCD;">    Autumn,</span></span>
<span class="line"><span style="color:#A6ACCD;">    Winter</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let seasons = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    spring: Seasons.Spring</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h3 id="命名空间-1" tabindex="-1">命名空间 <a class="header-anchor" href="#命名空间-1" aria-label="Permalink to &quot;命名空间&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">declare namespace $ {</span></span>
<span class="line"><span style="color:#A6ACCD;">    function ajax(url: string, settings: any): void</span></span>
<span class="line"><span style="color:#A6ACCD;">    let name: string</span></span>
<span class="line"><span style="color:#A6ACCD;">    namespace fn {</span></span>
<span class="line"><span style="color:#A6ACCD;">        function extend(obj: any): void</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">$.ajax(&#39;/get&#39;, {})</span></span>
<span class="line"><span style="color:#A6ACCD;">$.name</span></span>
<span class="line"><span style="color:#A6ACCD;">$.fn.extend({})</span></span></code></pre></div><ul><li>一个变量有很多子属性，就可以用namespace</li><li>声明文件里的namespace表示一个全局变量包含很多子属性</li><li>在命名空间内不需要再使用declare 了</li></ul><h3 id="声明文件引入" tabindex="-1">声明文件引入 <a class="header-anchor" href="#声明文件引入" aria-label="Permalink to &quot;声明文件引入&quot;">​</a></h3><ul><li><p>typings/jquery.d.ts</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">declare const $:(selector: string) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    click(): void</span></span>
<span class="line"><span style="color:#A6ACCD;">    width(length: number): void</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div></li><li><p>tsconfig.json</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&quot;include&quot;: [</span></span>
<span class="line"><span style="color:#A6ACCD;">    &quot;/typings/jquery&quot;,</span></span>
<span class="line"><span style="color:#A6ACCD;">  ]</span></span></code></pre></div></li></ul><h3 id="类型的扩展" tabindex="-1">类型的扩展 <a class="header-anchor" href="#类型的扩展" aria-label="Permalink to &quot;类型的扩展&quot;">​</a></h3><h4 id="全局扩展" tabindex="-1">全局扩展 <a class="header-anchor" href="#全局扩展" aria-label="Permalink to &quot;全局扩展&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 相同名称的interface会进行合并</span></span>
<span class="line"><span style="color:#A6ACCD;">interface String {</span></span>
<span class="line"><span style="color:#A6ACCD;">    double(): string</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">String.prototype.double = function() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return \`\${this}\${this}\`</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let result = new String(&#39;hello&#39;).double()</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(result)</span></span></code></pre></div><h4 id="局部扩展" tabindex="-1">局部扩展 <a class="header-anchor" href="#局部扩展" aria-label="Permalink to &quot;局部扩展&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 模块中类型扩展</span></span>
<span class="line"><span style="color:#A6ACCD;">export default {}</span></span>
<span class="line"><span style="color:#A6ACCD;">declare global {</span></span>
<span class="line"><span style="color:#A6ACCD;">    interface String {</span></span>
<span class="line"><span style="color:#A6ACCD;">        double(): string</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">String.prototype.double = function() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return \`\${this}\${this}\`</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let result = new String(&#39;hello&#39;).double()</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(result)</span></span></code></pre></div><h3 id="合并声明" tabindex="-1">合并声明 <a class="header-anchor" href="#合并声明" aria-label="Permalink to &quot;合并声明&quot;">​</a></h3><ul><li>同一名称的两个独立声明会被合并成一个单一声明</li><li>合并后的声明拥有原先两个声明的特性</li></ul><table><thead><tr><th>关键字</th><th>作为类型使用</th><th>作为值使用</th></tr></thead><tbody><tr><td>class</td><td>yes</td><td>yse</td></tr><tr><td>enum</td><td>yes</td><td>yes</td></tr><tr><td>interface</td><td>yes</td><td>no</td></tr><tr><td>type</td><td>yes</td><td>no</td></tr><tr><td>funcion</td><td>no</td><td>yes</td></tr><tr><td>var let const</td><td>no</td><td>yes</td></tr></tbody></table><h4 id="使用命名空间进行扩展" tabindex="-1">使用命名空间进行扩展 <a class="header-anchor" href="#使用命名空间进行扩展" aria-label="Permalink to &quot;使用命名空间进行扩展&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 命名空间扩展类</span></span>
<span class="line"><span style="color:#A6ACCD;">class Form {</span></span>
<span class="line"><span style="color:#A6ACCD;">    username: Form.Item = &#39;&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">    password: Form.Item = &#39;&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">namespace Form {</span></span>
<span class="line"><span style="color:#A6ACCD;">    export class Item{}</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let item: Form.Item = new Form.Item()</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 命名空间扩展方法</span></span>
<span class="line"><span style="color:#A6ACCD;">function hello() {}</span></span>
<span class="line"><span style="color:#A6ACCD;">namespace hello {</span></span>
<span class="line"><span style="color:#A6ACCD;">    export let words = &#39;words&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(hello.words) // words</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 命名空间扩展枚举类型</span></span>
<span class="line"><span style="color:#A6ACCD;">enum Color {</span></span>
<span class="line"><span style="color:#A6ACCD;">    red = 1,</span></span>
<span class="line"><span style="color:#A6ACCD;">    yellow = 2</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">namespace Color {</span></span>
<span class="line"><span style="color:#A6ACCD;">    export const green = 3</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(Color.green) // 3</span></span></code></pre></div><h4 id="自动生成d-ts-声明文件" tabindex="-1">自动生成d.ts 声明文件 <a class="header-anchor" href="#自动生成d-ts-声明文件" aria-label="Permalink to &quot;自动生成d.ts 声明文件&quot;">​</a></h4><ul><li><p>tsconfig.json</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&quot;declaration&quot;: true</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">tsc</span></span></code></pre></div></li></ul>`,367),r=[c];function i(C,A,y,D,d,u){return n(),a("div",null,r)}const m=s(t,[["render",i]]);export{h as __pageData,m as default};