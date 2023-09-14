import{_ as s,o as a,c as n,U as e}from"./chunks/framework.9adb0f96.js";const u=JSON.parse('{"title":"快手一面","description":"","frontmatter":{},"headers":[],"relativePath":"interview/experience.md","filePath":"interview/experience.md","lastUpdated":1694661640000}'),l={name:"interview/experience.md"},o=e(`<h1 id="快手一面" tabindex="-1">快手一面 <a class="header-anchor" href="#快手一面" aria-label="Permalink to &quot;快手一面&quot;">​</a></h1><h2 id="http-与-https-区别" tabindex="-1">http 与 https 区别 <a class="header-anchor" href="#http-与-https-区别" aria-label="Permalink to &quot;http 与 https 区别&quot;">​</a></h2><h2 id="闭包、闭包应用、debounce实现" tabindex="-1">闭包、闭包应用、debounce实现 <a class="header-anchor" href="#闭包、闭包应用、debounce实现" aria-label="Permalink to &quot;闭包、闭包应用、debounce实现&quot;">​</a></h2><ul><li>闭包：有权访问另一个函数作用域中变量的函数</li><li>闭包应用 <ul><li>模仿块级作用域<div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">for (var i = 0; i &lt; 10; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    (function (j) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        setTimeout(function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">            console.log(j);</span></span>
<span class="line"><span style="color:#A6ACCD;">        }, 1000 * j)</span></span>
<span class="line"><span style="color:#A6ACCD;">    })(i)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div></li><li>debounce、throttle、柯里化等</li></ul></li></ul><h2 id="事件循环输出题" tabindex="-1">事件循环输出题 <a class="header-anchor" href="#事件循环输出题" aria-label="Permalink to &quot;事件循环输出题&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">setTimeout(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(1)</span></span>
<span class="line"><span style="color:#A6ACCD;">}, 0)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(2)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">new Promise(resolve =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(3)</span></span>
<span class="line"><span style="color:#A6ACCD;">    resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">}).then(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(4)</span></span>
<span class="line"><span style="color:#A6ACCD;">}).then(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(6)</span></span>
<span class="line"><span style="color:#A6ACCD;">}).then(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(7)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(5)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 2 =&gt;3 =&gt;5 =&gt;4 =&gt;6 =&gt;7 =&gt;1</span></span></code></pre></div><h2 id="实现一个eventbus-具备on、off、emit" tabindex="-1">实现一个eventBus，具备on、off、emit <a class="header-anchor" href="#实现一个eventbus-具备on、off、emit" aria-label="Permalink to &quot;实现一个eventBus，具备on、off、emit&quot;">​</a></h2><h2 id="洋葱模型" tabindex="-1">洋葱模型 <a class="header-anchor" href="#洋葱模型" aria-label="Permalink to &quot;洋葱模型&quot;">​</a></h2><h2 id="不含重复字符的最长子字符串" tabindex="-1">不含重复字符的最长子字符串 <a class="header-anchor" href="#不含重复字符的最长子字符串" aria-label="Permalink to &quot;不含重复字符的最长子字符串&quot;">​</a></h2><h2 id="从浏览器输入url到显示页面的步骤" tabindex="-1">从浏览器输入url到显示页面的步骤？ <a class="header-anchor" href="#从浏览器输入url到显示页面的步骤" aria-label="Permalink to &quot;从浏览器输入url到显示页面的步骤？&quot;">​</a></h2>`,10),t=[o];function p(c,i,r,h,C,A){return a(),n("div",null,t)}const y=s(l,[["render",p]]);export{u as __pageData,y as default};
