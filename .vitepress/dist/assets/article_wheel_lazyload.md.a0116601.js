import{_ as s,o as n,c as a,U as l}from"./chunks/framework.9adb0f96.js";const D=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"article/wheel/lazyload.md","filePath":"article/wheel/lazyload.md","lastUpdated":1691647431000}'),e={name:"article/wheel/lazyload.md"},p=l(`<h2 id="lazyload-使用" tabindex="-1">lazyLoad 使用 <a class="header-anchor" href="#lazyload-使用" aria-label="Permalink to &quot;lazyLoad 使用&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">import VueLazyLoad from &#39;./plugins/vue-lazyload&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">Vue.use(VueLazyLoad, {</span></span>
<span class="line"><span style="color:#A6ACCD;">    loading: logo,</span></span>
<span class="line"><span style="color:#A6ACCD;">    preload: 1.2</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;div class=&quot;box&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;li v-for=&quot;(item, index) in list&quot; :key=&quot;index&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;img v-lazy=&quot;item&quot; alt=&quot;&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;/li&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/div&gt;</span></span></code></pre></div><h2 id="实现-vuelazyload" tabindex="-1">实现 VueLazyLoad <a class="header-anchor" href="#实现-vuelazyload" aria-label="Permalink to &quot;实现 VueLazyLoad&quot;">​</a></h2><ul><li>lazy 执行后得到一个类<code>lazyClass</code></li><li><code>lazyClass</code>实例化的对象，包含有<code>add</code>与<code>remove</code>方法</li><li>定义一个<code>lazy</code>指令</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const VueLazyLoad = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    install(Vue, options) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        const LazyClass = lazy(Vue)</span></span>
<span class="line"><span style="color:#A6ACCD;">        const instance = new LazyClass(options)</span></span>
<span class="line"><span style="color:#A6ACCD;">        Vue.directive(&#39;lazy&#39;, {</span></span>
<span class="line"><span style="color:#A6ACCD;">            bind: instance.add.bind(instance),</span></span>
<span class="line"><span style="color:#A6ACCD;">            unbind: instance.remove.bind(instance)</span></span>
<span class="line"><span style="color:#A6ACCD;">        })</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h2 id="lazy-函数做了什么" tabindex="-1">lazy 函数做了什么？ <a class="header-anchor" href="#lazy-函数做了什么" aria-label="Permalink to &quot;lazy 函数做了什么？&quot;">​</a></h2><ul><li>实例上定义<code>listeners</code>收集元素集合</li><li>实现<code>add</code>方法，作为指令<code>bind</code>时执行 <ul><li>通过<code>ReactiveListener</code>类生成一个元素对应的实例，收集于<code>listeners</code></li><li>通过<code>scrollParent</code>找到父级滚动的元素，监听该元素滚动事件执行<code>lazyLoadHandler</code></li></ul></li><li>实现<code>lazyLoadHandler</code><ul><li>遍历<code>listeners</code>集合，检测元素如果位于可视区则加载图片</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const lazy = Vue =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    class ReactiveListener {</span></span>
<span class="line"><span style="color:#A6ACCD;">        ...</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    return class LazyClass {</span></span>
<span class="line"><span style="color:#A6ACCD;">        constructor(options) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            this.options = options</span></span>
<span class="line"><span style="color:#A6ACCD;">            this.bindHandler = false</span></span>
<span class="line"><span style="color:#A6ACCD;">            this.listeners = []</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        add(el, bindings) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            Vue.nextTick(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">                // 寻找到可滚动的元素</span></span>
<span class="line"><span style="color:#A6ACCD;">                let ele = scrollParent(el)</span></span>
<span class="line"><span style="color:#A6ACCD;">                // 1. 监控el是否需要显示</span></span>
<span class="line"><span style="color:#A6ACCD;">                let listener = new ReactiveListener({</span></span>
<span class="line"><span style="color:#A6ACCD;">                    el,</span></span>
<span class="line"><span style="color:#A6ACCD;">                    src: bindings.value,</span></span>
<span class="line"><span style="color:#A6ACCD;">                    options: this.options</span></span>
<span class="line"><span style="color:#A6ACCD;">                })</span></span>
<span class="line"><span style="color:#A6ACCD;">                this.listeners.push(listener)</span></span>
<span class="line"><span style="color:#A6ACCD;">                // 2.绑定滚动事件</span></span>
<span class="line"><span style="color:#A6ACCD;">                // 只需要绑定一次</span></span>
<span class="line"><span style="color:#A6ACCD;">                if (!this.bindHandler) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                    // 也可以使用 intersectionObserver(兼容性不好)</span></span>
<span class="line"><span style="color:#A6ACCD;">                    // 节流降低使用频率</span></span>
<span class="line"><span style="color:#A6ACCD;">                    let lazyHandler = throttle(this.lazyLoadHandler.bind(this), 500)</span></span>
<span class="line"><span style="color:#A6ACCD;">                    ele.addEventListener(&#39;scroll&#39;, lazyHandler, {</span></span>
<span class="line"><span style="color:#A6ACCD;">                        passive: true</span></span>
<span class="line"><span style="color:#A6ACCD;">                    })</span></span>
<span class="line"><span style="color:#A6ACCD;">                    this.bindHandler = true</span></span>
<span class="line"><span style="color:#A6ACCD;">                }</span></span>
<span class="line"><span style="color:#A6ACCD;">                // 默认不滚动也需要展示的</span></span>
<span class="line"><span style="color:#A6ACCD;">                this.lazyLoadHandler()</span></span>
<span class="line"><span style="color:#A6ACCD;">            })</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        lazyLoadHandler() {</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 看一下 哪些需要加载</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 在可视区域内，这个元素没有被加载过</span></span>
<span class="line"><span style="color:#A6ACCD;">            this.listeners.forEach(listener =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">                // 如果加载过</span></span>
<span class="line"><span style="color:#A6ACCD;">                if (listener.state.loading) return</span></span>
<span class="line"><span style="color:#A6ACCD;">                listener.checkInView() &amp;&amp; listener.load()</span></span>
<span class="line"><span style="color:#A6ACCD;">            })</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        remove() {}</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h2 id="懒加载核心-reactivelistener" tabindex="-1">懒加载核心 ReactiveListener <a class="header-anchor" href="#懒加载核心-reactivelistener" aria-label="Permalink to &quot;懒加载核心 ReactiveListener&quot;">​</a></h2><ul><li>checkInView: 检查元素是否位于可视区 <ul><li>通过<code>getBoundingClientRect</code>获取元素距离屏幕位置</li><li>与屏幕的高度*比值比较是否已经位于可视区</li></ul></li><li>load: 负责src的变更 <ul><li>先显示loading图片</li><li>再去加载真实图片，图片成功后显示成功内容，失败显示失败内容</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">class ReactiveListener {</span></span>
<span class="line"><span style="color:#A6ACCD;">    constructor({ el, src, options }) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.el = el</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.src = src</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.options = options</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.state = {</span></span>
<span class="line"><span style="color:#A6ACCD;">            loading: false</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 用来检测自己在不在可视区域内</span></span>
<span class="line"><span style="color:#A6ACCD;">    checkInView() {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 获取当前元素距离屏幕的位置</span></span>
<span class="line"><span style="color:#A6ACCD;">        let { top } = this.el.getBoundingClientRect()</span></span>
<span class="line"><span style="color:#A6ACCD;">        return top &lt; window.innerHeight * this.options.preload</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    load() {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 先显示loading图片</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 再去加载真实图片，图片成功后显示成功内容，失败显示失败内容</span></span>
<span class="line"><span style="color:#A6ACCD;">        render(this, &#39;loading&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">        loadImg(</span></span>
<span class="line"><span style="color:#A6ACCD;">            this.src,</span></span>
<span class="line"><span style="color:#A6ACCD;">            () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">                this.state.loading = true</span></span>
<span class="line"><span style="color:#A6ACCD;">                render(this, &#39;loaded&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">            },</span></span>
<span class="line"><span style="color:#A6ACCD;">            () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">                render(this, &#39;error&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        )</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h2 id="其他方法" tabindex="-1">其他方法 <a class="header-anchor" href="#其他方法" aria-label="Permalink to &quot;其他方法&quot;">​</a></h2><ul><li>scrollParent</li><li>render</li><li>loadImg</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const scrollParent = el =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let parent = el.parentNode</span></span>
<span class="line"><span style="color:#A6ACCD;">    while (parent) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // getComputedStyle: 原生方法用于获取元素样式</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (/scroll/.test(getComputedStyle(parent)[&#39;overflow&#39;])) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            return parent</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        parent = parent.parentNode</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const render = (listener, status) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let el = listener.el</span></span>
<span class="line"><span style="color:#A6ACCD;">    let src = &#39;&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">    switch (status) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        case &#39;loading&#39;:</span></span>
<span class="line"><span style="color:#A6ACCD;">            src = listener.options.loading</span></span>
<span class="line"><span style="color:#A6ACCD;">            break</span></span>
<span class="line"><span style="color:#A6ACCD;">        case &#39;loaded&#39;:</span></span>
<span class="line"><span style="color:#A6ACCD;">            src = listener.src</span></span>
<span class="line"><span style="color:#A6ACCD;">            break</span></span>
<span class="line"><span style="color:#A6ACCD;">        case &#39;error&#39;:</span></span>
<span class="line"><span style="color:#A6ACCD;">            src = listener.options.error</span></span>
<span class="line"><span style="color:#A6ACCD;">            break</span></span>
<span class="line"><span style="color:#A6ACCD;">        default:</span></span>
<span class="line"><span style="color:#A6ACCD;">            break</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    el.setAttribute(&#39;src&#39;, src)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const loadImg = (src, resolve, reject) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let img = new Image()</span></span>
<span class="line"><span style="color:#A6ACCD;">    img.src = src</span></span>
<span class="line"><span style="color:#A6ACCD;">    img.onload = resolve</span></span>
<span class="line"><span style="color:#A6ACCD;">    img.onerror = reject</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div>`,15),o=[p];function c(t,i,r,C,A,y){return n(),a("div",null,o)}const u=s(e,[["render",c]]);export{D as __pageData,u as default};
