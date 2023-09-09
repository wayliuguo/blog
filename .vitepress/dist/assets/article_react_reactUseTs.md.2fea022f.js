import{_ as s,o as n,c as a,U as l}from"./chunks/framework.9adb0f96.js";const g=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"article/react/reactUseTs.md","filePath":"article/react/reactUseTs.md","lastUpdated":1691735071000}'),e={name:"article/react/reactUseTs.md"},t=l(`<h2 id="组件声明" tabindex="-1">组件声明 <a class="header-anchor" href="#组件声明" aria-label="Permalink to &quot;组件声明&quot;">​</a></h2><h2 id="类组件声明" tabindex="-1">类组件声明 <a class="header-anchor" href="#类组件声明" aria-label="Permalink to &quot;类组件声明&quot;">​</a></h2><ul><li>定义形式<div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">React.Component&lt;P, S={}&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">React.PureComponent&lt;P, S={}&gt;</span></span></code></pre></div></li><li>例子<div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 类型定义</span></span>
<span class="line"><span style="color:#A6ACCD;">interface IProps {</span></span>
<span class="line"><span style="color:#A6ACCD;">  name: string</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">interface IState {</span></span>
<span class="line"><span style="color:#A6ACCD;">  count: number</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">class ClassTs extends React.PureComponent&lt;IProps, IState&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">  state = {</span></span>
<span class="line"><span style="color:#A6ACCD;">      count: 0</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">  render() {</span></span>
<span class="line"><span style="color:#A6ACCD;">      return &lt;div&gt;{this.props.name}&lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">...</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;ClassTs name=&#39;well&#39; /&gt;</span></span></code></pre></div></li></ul><h2 id="类组件泛型" tabindex="-1">类组件泛型 <a class="header-anchor" href="#类组件泛型" aria-label="Permalink to &quot;类组件泛型&quot;">​</a></h2><ul><li>在组件上定义泛型，指定其props的类型为传入泛型</li><li>调用时传入泛型</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">interface IState {</span></span>
<span class="line"><span style="color:#A6ACCD;">    count: number</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">class ClassTs&lt;P&gt; extends React.PureComponent&lt;P, IState&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    internalProps: P</span></span>
<span class="line"><span style="color:#A6ACCD;">    constructor(props: P) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        super(props)</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.internalProps = props</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    state = {</span></span>
<span class="line"><span style="color:#A6ACCD;">        count: 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    render() {</span></span>
<span class="line"><span style="color:#A6ACCD;">        return &lt;div&gt;{this.state.count}&lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">...</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">type IProps = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;ClassTs&lt;IProps&gt; name=&#39;well&#39; /&gt;</span></span></code></pre></div><h2 id="函数组件" tabindex="-1">函数组件 <a class="header-anchor" href="#函数组件" aria-label="Permalink to &quot;函数组件&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">interface IProps {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const FunctionTs = (props: IProps) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const { name} = props</span></span>
<span class="line"><span style="color:#A6ACCD;">    return &lt;div&gt;{name}&lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">import { FC } from &quot;react&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">interface IProps {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const FunctionTs: FC&lt;IProps&gt; = (props) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const { name} = props</span></span>
<span class="line"><span style="color:#A6ACCD;">    return &lt;div&gt;{name}&lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h2 id="函数组件泛型" tabindex="-1">函数组件泛型 <a class="header-anchor" href="#函数组件泛型" aria-label="Permalink to &quot;函数组件泛型&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// const FunctionTs = &lt;P extends any&gt;(props: P) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">//     return &lt;div&gt;hello world&lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">// }</span></span>
<span class="line"><span style="color:#A6ACCD;">function FunctionTs&lt;P&gt;(props: P) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return &lt;div&gt;hello world&lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">export default FunctionTs</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">...</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">type IProps = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: string</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;FunctionTs&lt;IProps&gt; name=&#39;well&#39; /&gt;</span></span></code></pre></div><h2 id="事件处理" tabindex="-1">事件处理 <a class="header-anchor" href="#事件处理" aria-label="Permalink to &quot;事件处理&quot;">​</a></h2><h2 id="event-事件处理" tabindex="-1">Event 事件处理 <a class="header-anchor" href="#event-事件处理" aria-label="Permalink to &quot;Event 事件处理&quot;">​</a></h2><ul><li>剪切板事件对象：ClipboardEvent<code>&lt;T = Element&gt;</code></li><li>拖拽事件对象：DragEvent<code>&lt;T = Element&gt;</code></li><li>焦点事件对象：FocusEvent<code>&lt;T = Element&gt;</code></li><li>表单事件对象：FormEvent<code>&lt;T = Element&gt;</code></li><li>Change事件对象：ChangeEvent<code>&lt;T = Element&gt;</code></li><li>键盘事件对象：KeyboardEvent<code>&lt;T = Element&gt;</code></li><li>鼠标事件对象：MouseEvent<code>&lt;T = Element&gt;, E = NativeMouseEvent</code></li><li>触摸事件对象：TouchEvent<code>&lt;T = Element&gt;</code></li><li>滚轮事件对象：WheelEvent<code>&lt;T = Element&gt;</code></li><li>动画事件对象：AnimateionEvent<code>&lt;T = Element&gt;</code></li><li>过度事件对象：TransitionEvent<code>&lt;T = Element&gt;</code> 这些Event事件对象的泛型中都会接收一个Element元素的类型，这个类型就是我们绑定这个事件的<strong>标签元素类型</strong>。</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const handleEvent = (e:React.DragEvent&lt;HTMLDivElement&gt;) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(e.target)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h2 id="事件处理函数类型" tabindex="-1">事件处理函数类型 <a class="header-anchor" href="#事件处理函数类型" aria-label="Permalink to &quot;事件处理函数类型&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">type EventHandler&lt;E extends SyntheticEvent&lt;any&gt;&gt; - { bivarianceHack(event: E): void }[&quot;bivarianceHack&quot;];</span></span>
<span class="line"><span style="color:#A6ACCD;">type ReactEventHandler&lt;T = Element&gt; = EventHandler&lt;SyntheticEvent&lt;T&gt;&gt;;</span></span>
<span class="line"><span style="color:#A6ACCD;">//剪切板事件处理函数</span></span>
<span class="line"><span style="color:#A6ACCD;">type clipboardEventHandler&lt;T = Element&gt; = EventHandler&lt;ClipboardEvent&lt;T&gt;&gt;;</span></span>
<span class="line"><span style="color:#A6ACCD;">//复合事件处理函数</span></span>
<span class="line"><span style="color:#A6ACCD;">type CompositionEventHandler&lt;T = Element&gt; = EventHandler&lt;CompositionEvent&lt;T&gt;&gt;;</span></span>
<span class="line"><span style="color:#A6ACCD;">//拖拽事件处理函数</span></span>
<span class="line"><span style="color:#A6ACCD;">type DragEventHandler&lt;T = Element&gt; = EventHandler&lt;DragEvent&lt;T&gt;&gt;;</span></span>
<span class="line"><span style="color:#A6ACCD;">//焦点事件处理函数</span></span>
<span class="line"><span style="color:#A6ACCD;">type FocusEventHandler&lt;T = Element&gt; = EventHandler&lt;FocusEvent&lt;T&gt;&gt;;</span></span>
<span class="line"><span style="color:#A6ACCD;">//表单事件处理函数</span></span>
<span class="line"><span style="color:#A6ACCD;">type FormEventHandler&lt;T - Element&gt; = EventHandler&lt;FormEvent&lt;T&gt;&gt;;</span></span>
<span class="line"><span style="color:#A6ACCD;">//Change事件处理函数</span></span>
<span class="line"><span style="color:#A6ACCD;">type ChangeEventHandler&lt;T = Element&gt; = EventHandler&lt;ChangeEvent&lt;T&gt;&gt;;</span></span>
<span class="line"><span style="color:#A6ACCD;">//键盘事件处理函数</span></span>
<span class="line"><span style="color:#A6ACCD;">type KeyboardEventHandler&lt;T = Element&gt; = EventHandler&lt;KeyboardEvent&lt;T&gt;&gt;;</span></span>
<span class="line"><span style="color:#A6ACCD;">//鼠标事件处理函数</span></span>
<span class="line"><span style="color:#A6ACCD;">type MouseEventHandler&lt;T = Element&gt; = EventHandler&lt;MouseEvent&lt;T&gt;&gt;;</span></span>
<span class="line"><span style="color:#A6ACCD;">//触屏事件处理函娄数</span></span>
<span class="line"><span style="color:#A6ACCD;">type TouchEventHandler&lt;T = Element&gt; = EventHandler&lt;TouchEvent&lt;T&gt;&gt;;</span></span>
<span class="line"><span style="color:#A6ACCD;">//指针事件处理函数</span></span>
<span class="line"><span style="color:#A6ACCD;">type PointerEventHandler&lt;T = Element&gt; = EventHandler&lt;PointerEvent&lt;T&gt;&gt;;</span></span>
<span class="line"><span style="color:#A6ACCD;">//界面事件处理函数</span></span>
<span class="line"><span style="color:#A6ACCD;">type UIEventHandler&lt;T = Element&gt; = EventHandler&lt;UIEvent&lt;T&gt;&gt;;</span></span>
<span class="line"><span style="color:#A6ACCD;">//滚轮事件处理函数</span></span>
<span class="line"><span style="color:#A6ACCD;">type wheelEventHandler&lt;T = Element&gt; = EventHandler&lt;lheelEvent&lt;T&gt;&gt;;</span></span>
<span class="line"><span style="color:#A6ACCD;">//动画事件处理函数</span></span>
<span class="line"><span style="color:#A6ACCD;">type AnimationEventHandler&lt;T = Element&gt; = EventHandler&lt;AnimationEvent&lt;T&gt;&gt;;</span></span>
<span class="line"><span style="color:#A6ACCD;">//过渡事件处理函数</span></span>
<span class="line"><span style="color:#A6ACCD;">type TransitionEventHandler&lt;T = Element&gt; = EventHandler&lt;TransitionEvent&lt;T&gt;&gt;;</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const onChange: React.ChangeEventHandler&lt;HTMLInputElement&gt; = (e) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(e.currentTarget)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h2 id="html-标签类型" tabindex="-1">HTML 标签类型 <a class="header-anchor" href="#html-标签类型" aria-label="Permalink to &quot;HTML 标签类型&quot;">​</a></h2><h2 id="常见标签类型" tabindex="-1">常见标签类型 <a class="header-anchor" href="#常见标签类型" aria-label="Permalink to &quot;常见标签类型&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">a: HTMLAnchorElement;</span></span>
<span class="line"><span style="color:#A6ACCD;">body : HTMLBodyElement;</span></span>
<span class="line"><span style="color:#A6ACCD;">br: HTMLBRElement;</span></span>
<span class="line"><span style="color:#A6ACCD;">button: HTMLButtonElement;</span></span>
<span class="line"><span style="color:#A6ACCD;">div : HTMLDivElement;</span></span>
<span class="line"><span style="color:#A6ACCD;">h1: HTMLHeadingElement;</span></span>
<span class="line"><span style="color:#A6ACCD;">h2: HTMLHeadingElement;</span></span>
<span class="line"><span style="color:#A6ACCD;">h3: HTMLHeadingElement;</span></span>
<span class="line"><span style="color:#A6ACCD;">html: HTMLHtmlElement;</span></span>
<span class="line"><span style="color:#A6ACCD;">img : HTMLImageElement;</span></span>
<span class="line"><span style="color:#A6ACCD;">input : HTMLInputElement;</span></span>
<span class="line"><span style="color:#A6ACCD;">ul: HTMLUListElement;</span></span>
<span class="line"><span style="color:#A6ACCD;">li: HTMLLIElement;</span></span>
<span class="line"><span style="color:#A6ACCD;">link: HTMLLinkElement;</span></span>
<span class="line"><span style="color:#A6ACCD;">p: HTMLParagraphElement;</span></span>
<span class="line"><span style="color:#A6ACCD;">span: HTMLSpanElement;</span></span>
<span class="line"><span style="color:#A6ACCD;">style: HTMLStyleElement;</span></span>
<span class="line"><span style="color:#A6ACCD;">table: HTMLTableElement;</span></span>
<span class="line"><span style="color:#A6ACCD;">tbody : HTMLTablesectionElement;</span></span>
<span class="line"><span style="color:#A6ACCD;">video: HTMLVideoElement;</span></span>
<span class="line"><span style="color:#A6ACCD;">audio: HTMLAudioElement;</span></span>
<span class="line"><span style="color:#A6ACCD;">meta: HTMLMetaElement;</span></span>
<span class="line"><span style="color:#A6ACCD;">form: HTALFormElement;</span></span></code></pre></div><h2 id="标签属性类型" tabindex="-1">标签属性类型 <a class="header-anchor" href="#标签属性类型" aria-label="Permalink to &quot;标签属性类型&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">HTML属性类型:HTMLAttributes&lt;T&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">按钮属性类型:ButtonHTMLAttributes&lt;T&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">表单属性类型: FormHTMLAttributes&lt;T&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">图片属性类型:lmgHTMLAttributes&lt;T&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">输入框属性类型: InputHTMLAttributes&lt;T&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">链接属性类型:LinkHTMLAttributes&lt;T&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">meta属性类型:MetaHTMLAttributes&lt;T&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">选择框属性类型:SelectHTMLAttributes&lt;T&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">表格属性类型:TableHTMLAttributes&lt;T&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">输入区属性类型:TextareaHTMLAttributes&lt;T&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">视频属性类型:VideoHTMLAttributes&lt;T&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">SVG星性类型: SVGAttributes&lt;T&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">WebView属性类型: WebViewHTMLAttributes&lt;T&gt;</span></span></code></pre></div>`,23),p=[t];function o(c,i,r,C,A,d){return n(),a("div",null,p)}const D=s(e,[["render",o]]);export{g as __pageData,D as default};
