import{_ as s,o as n,c as a,U as e}from"./chunks/framework.9adb0f96.js";const d=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"article/vueComponent/bem.md","filePath":"article/vueComponent/bem.md","lastUpdated":1692963486000}'),l={name:"article/vueComponent/bem.md"},p=e(`<h2 id="什么是-bem-规范" tabindex="-1">什么是 BEM 规范 <a class="header-anchor" href="#什么是-bem-规范" aria-label="Permalink to &quot;什么是 BEM 规范&quot;">​</a></h2><ol><li>Block（块）：一个独立的、可重用的组件或模块，它是页面上的一个高级元素</li><li>Element（元素）：块的组成部分，不能独立存在。元素位于块的内部，用双下划线(&quot;__&quot;)连接块和元素的名称</li><li>Modifier（修饰符）：用于修改块或元素的外观、状态或行为。修饰符使用单个连字符(&quot;-&quot;)连接块或元素的名称和修饰符的名称</li></ol><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">.header__logo--hidden</span></span></code></pre></div><h2 id="推荐css样式顺序" tabindex="-1">推荐css样式顺序 <a class="header-anchor" href="#推荐css样式顺序" aria-label="Permalink to &quot;推荐css样式顺序&quot;">​</a></h2><ol><li>定位属性：positon display float left top right bottom overflow clear z-index</li><li>自身属性：width height margin padding border background</li><li>文字样式：font-family font-size font-style font-weight font-varient</li><li>文本属性：text-align vertical-align text-wrap text-transform text-indent text-decoration letter-spacing word-spacing white-space text-overflow</li><li>css3中新增属性：content box-shadow border-radius transform</li></ol><h2 id="使用-js-实现-bem-规范" tabindex="-1">使用 js 实现 BEM 规范 <a class="header-anchor" href="#使用-js-实现-bem-规范" aria-label="Permalink to &quot;使用 js 实现 BEM 规范&quot;">​</a></h2><ul><li>实现 _bem 用于字符串拼接</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function _bem(</span></span>
<span class="line"><span style="color:#A6ACCD;">  prefixName: string,</span></span>
<span class="line"><span style="color:#A6ACCD;">  blockSuffix: string,</span></span>
<span class="line"><span style="color:#A6ACCD;">  element: string,</span></span>
<span class="line"><span style="color:#A6ACCD;">  modifier: string | number</span></span>
<span class="line"><span style="color:#A6ACCD;">) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  if (blockSuffix) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    prefixName += \`-\${blockSuffix}\`</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">  if (element) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    prefixName += \`__\${element}\`</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">  if (modifier) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    prefixName += \`--\${modifier}\`</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">  return prefixName</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><ul><li>实现 bem 方法 <ul><li>通过 createNamespace 指定类名的前缀</li><li>导出b、e、m、be、bm、em、bem 等函数</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function createBEM(prefixName: string) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  const b = (blockSuffix = &#39;&#39;) =&gt; _bem(prefixName, blockSuffix, &#39;&#39;, &#39;&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">  const e = (element = &#39;&#39;) =&gt; (element ? _bem(prefixName, &#39;&#39;, element, &#39;&#39;) : &#39;&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">  const m = (modifier = &#39;&#39;) =&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    modifier ? _bem(prefixName, &#39;&#39;, &#39;&#39;, modifier) : &#39;&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">  const be = (blockSuffix = &#39;&#39;, element = &#39;&#39;) =&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    blockSuffix &amp;&amp; element ? _bem(prefixName, blockSuffix, element, &#39;&#39;) : &#39;&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">  const bm = (blockSuffix = &#39;&#39;, modifier = &#39;&#39;) =&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    blockSuffix &amp;&amp; modifier ? _bem(prefixName, blockSuffix, &#39;&#39;, modifier) : &#39;&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">  const em = (element = &#39;&#39;, modifier: string | number = &#39;&#39;) =&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    element &amp;&amp; modifier ? _bem(prefixName, &#39;&#39;, element, modifier) : &#39;&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">  const bem = (blockSuffix = &#39;&#39;, element = &#39;&#39;, modifier = &#39;&#39;) =&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    blockSuffix &amp;&amp; element &amp;&amp; modifier</span></span>
<span class="line"><span style="color:#A6ACCD;">      ? _bem(prefixName, blockSuffix, element, modifier)</span></span>
<span class="line"><span style="color:#A6ACCD;">      : &#39;&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">  const is = (name: string, state: string | boolean) =&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    state ? \`is-\${name}\` : &#39;&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">  return {</span></span>
<span class="line"><span style="color:#A6ACCD;">    b,</span></span>
<span class="line"><span style="color:#A6ACCD;">    e,</span></span>
<span class="line"><span style="color:#A6ACCD;">    m,</span></span>
<span class="line"><span style="color:#A6ACCD;">    be,</span></span>
<span class="line"><span style="color:#A6ACCD;">    bm,</span></span>
<span class="line"><span style="color:#A6ACCD;">    em,</span></span>
<span class="line"><span style="color:#A6ACCD;">    bem,</span></span>
<span class="line"><span style="color:#A6ACCD;">    is</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">export function createNamespace(name: string) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  const prefixName = \`van-\${name}\`</span></span>
<span class="line"><span style="color:#A6ACCD;">  return createBEM(prefixName)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div>`,10),o=[p];function t(i,c,r,m,C,A){return n(),a("div",null,o)}const b=s(l,[["render",t]]);export{d as __pageData,b as default};
