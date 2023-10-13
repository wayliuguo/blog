import{_ as s,o as n,c as a,U as l}from"./chunks/framework.9adb0f96.js";const d=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"article/react/reactStateMan.md","filePath":"article/react/reactStateMan.md","lastUpdated":1697038840000}'),e={name:"article/react/reactStateMan.md"},t=l(`<h2 id="context" tabindex="-1">Context <a class="header-anchor" href="#context" aria-label="Permalink to &quot;Context&quot;">​</a></h2><ul><li>可跨层级传递，而不像 props 层层传递</li><li>类似于 Vue 的 provide/inject</li><li>例如：切换主题，切换语言</li></ul><h3 id="createcontext-与注入" tabindex="-1">createContext 与注入 <a class="header-anchor" href="#createcontext-与注入" aria-label="Permalink to &quot;createContext 与注入&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// contextDemo/index.tsx</span></span>
<span class="line"><span style="color:#A6ACCD;">import { FC, createContext, useState } from &#39;react&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">import Toolbar from &#39;./Toolbar&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const themes = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    light: {</span></span>
<span class="line"><span style="color:#A6ACCD;">        fore: &#39;#000&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">        background: &#39;#eee&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">    },</span></span>
<span class="line"><span style="color:#A6ACCD;">    dark: {</span></span>
<span class="line"><span style="color:#A6ACCD;">        fore: &#39;#fff&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">        background: &#39;#222&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 通过 createContext 来创建 context</span></span>
<span class="line"><span style="color:#A6ACCD;">export const ThemeContext = createContext(themes.light)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const ContextDemo: FC = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const [theme, setTheme] = useState(themes.light)</span></span>
<span class="line"><span style="color:#A6ACCD;">    const toDark = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        setTheme(themes.dark)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return (</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 在组件上方使用 Context.Provider 指定context 的值</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;ThemeContext.Provider value={theme}&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            &lt;div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                &lt;div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                    &lt;span&gt;Context Demo&lt;/span&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                    &lt;button onClick={toDark}&gt;dark&lt;/button&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                &lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            &lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            &lt;Toolbar /&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;/ThemeContext.Provider&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    )</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">export default ContextDemo</span></span></code></pre></div><ul><li>通过 createContext 来创建 context</li><li>在组件上方使用 Context.Provider 指定context 的值</li><li>提供了一个<code>toDark</code>方法用于改变注入的context的值</li><li>在<code>Context.Provider</code>包裹下调用Toolbar 组件</li></ul><h3 id="跨层级" tabindex="-1">跨层级 <a class="header-anchor" href="#跨层级" aria-label="Permalink to &quot;跨层级&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// contextDemo/Toolbar.tsx</span></span>
<span class="line"><span style="color:#A6ACCD;">import { FC } from &#39;react&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">import ThemeButton from &#39;./ThemeButton&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const Toolbar: FC = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return (</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            &lt;button&gt;Toolbar&lt;/button&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            &lt;div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">                &lt;ThemeButton /&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            &lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;/&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    )</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">export default Toolbar</span></span></code></pre></div><h3 id="usecontext-获取值" tabindex="-1">useContext 获取值 <a class="header-anchor" href="#usecontext-获取值" aria-label="Permalink to &quot;useContext 获取值&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// contextDemo/ThemeButton.tsx</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">import { FC, useContext } from &#39;react&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">import { ThemeContext } from &#39;./index&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const ThemeButton: FC = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 通过 useContext 获取 context 提供的值</span></span>
<span class="line"><span style="color:#A6ACCD;">    const theme = useContext(ThemeContext)</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 根据 theme 设置 button 样式</span></span>
<span class="line"><span style="color:#A6ACCD;">    </span></span>
<span class="line"><span style="color:#A6ACCD;">    const style = {</span></span>
<span class="line"><span style="color:#A6ACCD;">        color: theme.fore,</span></span>
<span class="line"><span style="color:#A6ACCD;">        background: theme.background</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return (</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            &lt;button style={style}&gt;theme button&lt;/button&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;/&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    )</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">export default ThemeButton</span></span></code></pre></div><ul><li>通过 useContext 获取提供的 context 的值</li></ul>`,10),p=[t];function o(c,r,C,i,A,D){return n(),a("div",null,p)}const u=s(e,[["render",o]]);export{d as __pageData,u as default};
