import{_ as s,o as a,c as n,U as l}from"./chunks/framework.9adb0f96.js";const m=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"article/react/reactUseCss.md","filePath":"article/react/reactUseCss.md","lastUpdated":1695223401000}'),e={name:"article/react/reactUseCss.md"},p=l(`<h2 id="普通方式使用" tabindex="-1">普通方式使用 <a class="header-anchor" href="#普通方式使用" aria-label="Permalink to &quot;普通方式使用&quot;">​</a></h2><ul><li>引入</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">import &#39;../style/QuestionCard.css&#39;</span></span></code></pre></div><ul><li>动态样式处理</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const QuestionCard: FC&lt;PropsType&gt; = props =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const { isPublished } = props</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    let itemClassName = &#39;list-item&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (isPublished) itemClassName += &#39; published&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    return &lt;div className={itemClassName}&gt;...&lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><ul><li>使用<a href="https://www.npmjs.com/package/classnames" target="_blank" rel="noreferrer">classnames</a>处理</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm i classnames</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const itemClassName = classNames(&#39;list-item&#39;, { published: isPublished })</span></span></code></pre></div><h2 id="css-module" tabindex="-1">css module <a class="header-anchor" href="#css-module" aria-label="Permalink to &quot;css module&quot;">​</a></h2><ul><li>每个css文件都当作单独的模块，命名：xxx.module.css</li><li>Create-React-App 已经支持CSS Module</li><li>其原理是会自动为 className 增加后缀名，不让他们重复</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">import styles from &#39;../style/QuestionCard.module.css&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;div className={styles[&#39;list-item&#39;]}&gt;&lt;/div&gt;</span></span></code></pre></div><ul><li>结合 modules <ul><li>原理就是对象合并的时候使用中括号取属性的值作为对象的key</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const name = &#39;a&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">const obj = {</span></span>
<span class="line"><span style="color:#A6ACCD;">  [name]: 1</span></span>
<span class="line"><span style="color:#A6ACCD;">} // {a: 1}</span></span></code></pre></div></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const listItemClass = styles[&#39;list-item&#39;]</span></span>
<span class="line"><span style="color:#A6ACCD;">const publishedClass = styles[&#39;published&#39;]</span></span>
<span class="line"><span style="color:#A6ACCD;">const itemClassName = classNames({</span></span>
<span class="line"><span style="color:#A6ACCD;">    [listItemClass]: true,</span></span>
<span class="line"><span style="color:#A6ACCD;">    [publishedClass]: isPublished</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;div className={itemClassName}&gt;...&lt;/div&gt;</span></span></code></pre></div><h2 id="css-in-js" tabindex="-1">CSS-in-JS <a class="header-anchor" href="#css-in-js" aria-label="Permalink to &quot;CSS-in-JS&quot;">​</a></h2><ul><li><p>一种解决方案，有好几个工具</p></li><li><p>在js中写css，带来极大的灵活性</p></li><li><p>和内联 style 完全不一样，不会有内联style的问题</p></li><li><p>工具</p><ul><li><a href="https://styled-components.com/docs/basics#getting-started" target="_blank" rel="noreferrer">styled-components</a></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 安装</span></span>
<span class="line"><span style="color:#A6ACCD;">npm install styled-components</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">import { FC } from &#39;react&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">import styled, { css } from &#39;styled-components&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 定义 Button 组件</span></span>
<span class="line"><span style="color:#A6ACCD;">type ButtonPropsTypes = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    primary?: boolean</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const Button = styled.button&lt;ButtonPropsTypes&gt;\`</span></span>
<span class="line"><span style="color:#A6ACCD;">    background: transparent;</span></span>
<span class="line"><span style="color:#A6ACCD;">    border-radius: 3px;</span></span>
<span class="line"><span style="color:#A6ACCD;">    border: 2px solid palevioletred;</span></span>
<span class="line"><span style="color:#A6ACCD;">    color: palevioletred;</span></span>
<span class="line"><span style="color:#A6ACCD;">    margin: 0 1em;</span></span>
<span class="line"><span style="color:#A6ACCD;">    padding: 0.25em 1em;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    \${props =&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        props.primary &amp;&amp;</span></span>
<span class="line"><span style="color:#A6ACCD;">        css\`</span></span>
<span class="line"><span style="color:#A6ACCD;">            background: palevioletred;</span></span>
<span class="line"><span style="color:#A6ACCD;">            color: white;</span></span>
<span class="line"><span style="color:#A6ACCD;">        \`}</span></span>
<span class="line"><span style="color:#A6ACCD;">\`</span></span>
<span class="line"><span style="color:#A6ACCD;">const Container = styled.div\`</span></span>
<span class="line"><span style="color:#A6ACCD;">    text-align: center;</span></span>
<span class="line"><span style="color:#A6ACCD;">\`</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const StyledComponentsDemo: FC = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return (</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            &lt;p&gt;styled-components demo&lt;/p&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            &lt;Container&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                &lt;Button&gt;按钮&lt;/Button&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                &lt;Button primary&gt;按钮&lt;/Button&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            &lt;/Container&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    )</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">export default StyledComponentsDemo</span></span></code></pre></div></li></ul>`,15),t=[p];function o(c,i,r,C,A,d){return a(),n("div",null,t)}const u=s(e,[["render",o]]);export{m as __pageData,u as default};
