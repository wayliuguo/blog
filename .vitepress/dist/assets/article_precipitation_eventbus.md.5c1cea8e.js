import{_ as s,o as n,c as a,U as l}from"./chunks/framework.9adb0f96.js";const e="/blog/assets/image-20231013150225722.fcda9012.png",d=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"article/precipitation/eventbus.md","filePath":"article/precipitation/eventbus.md","lastUpdated":1697181516000}'),p={name:"article/precipitation/eventbus.md"},c=l('<h2 id="什么是-eventbus" tabindex="-1">什么是 EventBus <a class="header-anchor" href="#什么是-eventbus" aria-label="Permalink to &quot;什么是 EventBus&quot;">​</a></h2><p>EventBus 事件总线是发布订阅设计模式的应用。多个模块 <code>module1</code>，<code>module2</code>，<code>module3</code>都订阅了事件 <code>EventA</code> ，然后我们在 <code>module4</code> 中通过事件总线发布事件 <code>EventA</code> ，事件总线会通知所有订阅者<code>module1</code>，<code>module2</code>，<code>module3</code>，它们收到消息会执行对应函数逻辑，注意这里通知的时候还可以传递 <code>extraArgs</code> 参数</p><p><img src="'+e+`" alt="image-20231013150225722"></p><h2 id="eventmap-结构" tabindex="-1">eventMap 结构 <a class="header-anchor" href="#eventmap-结构" aria-label="Permalink to &quot;eventMap 结构&quot;">​</a></h2><ul><li>eventName 对应的是一个对象，再通过把callbackId 作为属性值的作用是可以通过此属性值取消该订阅</li><li>以<code>one\${callbackId}</code>通过添加前缀的形式，实现触发后匹配到前缀移除监听</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">{</span></span>
<span class="line"><span style="color:#A6ACCD;">	eventName: {</span></span>
<span class="line"><span style="color:#A6ACCD;">		callbackId | \`one\${callbackId}\`: callback</span></span>
<span class="line"><span style="color:#A6ACCD;">	}</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h2 id="完整实现" tabindex="-1">完整实现 <a class="header-anchor" href="#完整实现" aria-label="Permalink to &quot;完整实现&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">class EventBus {</span></span>
<span class="line"><span style="color:#A6ACCD;">    constructor(maxListeners) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 用来存储发布订阅事件的集合</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.eventMap = {}</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 最大监听数量</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.maxListeners = maxListeners || Infinity</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 监听函数唯一id</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.callbackId = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    /**</span></span>
<span class="line"><span style="color:#A6ACCD;">     * 订阅事件</span></span>
<span class="line"><span style="color:#A6ACCD;">     * @param {事件名称} eventName</span></span>
<span class="line"><span style="color:#A6ACCD;">     * @param {事件函数} funCallback</span></span>
<span class="line"><span style="color:#A6ACCD;">     */</span></span>
<span class="line"><span style="color:#A6ACCD;">    subscribe(eventName, funCallback) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 判断是否订阅过,没有订阅过则初始化</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (!Reflect.has(this.eventMap, eventName)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            Reflect.set(this.eventMap, eventName, {})</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 判断是否超过了最大监听数</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (Object.keys(this.eventMap[eventName]).length &gt;= this.maxListeners) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            console.warn(\`该事件\${eventName}超过了最大监听数\`)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">        const thisCallbackId = this.callbackId++</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.eventMap[eventName][thisCallbackId] = funCallback</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 用于取消定于的函数</span></span>
<span class="line"><span style="color:#A6ACCD;">        const unSubscribe = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 根据 callbackId 取消订阅对应的 funCallback</span></span>
<span class="line"><span style="color:#A6ACCD;">            delete this.eventMap[eventName][thisCallbackId]</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 如果一个事件下的 funCallback 为空，清理掉 eventName</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (Object.keys(this.eventMap[eventName].length === 0)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                delete this.eventMap[eventName]</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        return {</span></span>
<span class="line"><span style="color:#A6ACCD;">            unSubscribe</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    subscribeOne(eventName, funCallback) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 判断是否订阅过,没有订阅过则初始化</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (!Reflect.has(this.eventMap, eventName)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            Reflect.set(this.eventMap, eventName, {})</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 判断是否超过了最大监听数</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (Object.keys(this.eventMap[eventName]).length &gt;= this.maxListeners) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            console.warn(\`该事件\${eventName}超过了最大监听数\`)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">        const theCallbackId = \`one\${this.callbackId}\`</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.eventMap[eventName][theCallbackId] = funCallback</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 取消订阅</span></span>
<span class="line"><span style="color:#A6ACCD;">        const unSubscribe = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 根据 callbackId 去取消订阅对应的 callback</span></span>
<span class="line"><span style="color:#A6ACCD;">            delete this.eventMap[eventName][theCallbackId]</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 如果一个事件下的 funCallback 为空，清理掉 eventName</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (Object.keys(this.eventMap[eventName].length === 0)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                delete this.eventMap[eventName]</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        return {</span></span>
<span class="line"><span style="color:#A6ACCD;">            unSubscribe</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    /**</span></span>
<span class="line"><span style="color:#A6ACCD;">     * 发布事件</span></span>
<span class="line"><span style="color:#A6ACCD;">     * @param {事件名称} eventName</span></span>
<span class="line"><span style="color:#A6ACCD;">     * @param {事件执行额外参数} args</span></span>
<span class="line"><span style="color:#A6ACCD;">     */</span></span>
<span class="line"><span style="color:#A6ACCD;">    emit(eventName, ...args) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (!Reflect.has(this.eventMap, eventName)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            console.warn(\`从未订阅过此事件\${eventName}\`)</span></span>
<span class="line"><span style="color:#A6ACCD;">            return</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        const callbackList = this.eventMap[eventName]</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">        if (Object.keys(callbackList).length === 0) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            console.warn(\`事件\${eventName}无函数可执行\`)</span></span>
<span class="line"><span style="color:#A6ACCD;">            return</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">            for (const [id, callback] of Object.entries(callbackList)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                callback.call(this, ...args)</span></span>
<span class="line"><span style="color:#A6ACCD;">                if (id.startsWith(&#39;one&#39;)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                    delete callbackList[id]</span></span>
<span class="line"><span style="color:#A6ACCD;">                }</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    /**</span></span>
<span class="line"><span style="color:#A6ACCD;">     * 清空某个事件名称下所有的回调函数</span></span>
<span class="line"><span style="color:#A6ACCD;">     * @param {事件名称} eventName</span></span>
<span class="line"><span style="color:#A6ACCD;">     * @returns</span></span>
<span class="line"><span style="color:#A6ACCD;">     */</span></span>
<span class="line"><span style="color:#A6ACCD;">    clear(eventName) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (!eventName) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            console.warn(\`需提供要被清除的事件名称\${eventName}\`)</span></span>
<span class="line"><span style="color:#A6ACCD;">            return</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        // delete this.eventMap[eventName]</span></span>
<span class="line"><span style="color:#A6ACCD;">        Reflect.defineProperty(this.eventMap, eventName)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    /**</span></span>
<span class="line"><span style="color:#A6ACCD;">     * 清空事件监听函数</span></span>
<span class="line"><span style="color:#A6ACCD;">     */</span></span>
<span class="line"><span style="color:#A6ACCD;">    clearAll() {</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.eventMap = {}</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h2 id="测试" tabindex="-1">测试 <a class="header-anchor" href="#测试" aria-label="Permalink to &quot;测试&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const eventBus = new EventBus(2)</span></span>
<span class="line"><span style="color:#A6ACCD;">const fun1 = function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;111&#39;, ...arguments)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const fun2 = function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;222&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const fun3 = function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;333&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const fun4 = function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;444&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// subscribe订阅一次，触发多次</span></span>
<span class="line"><span style="color:#A6ACCD;">eventBus.subscribe(&#39;testName1&#39;, fun1)</span></span>
<span class="line"><span style="color:#A6ACCD;">eventBus.emit(&#39;testName1&#39;, &#39;参数1&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">eventBus.emit(&#39;testName1&#39;, &#39;参数1&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 订阅多次触发一次</span></span>
<span class="line"><span style="color:#A6ACCD;">eventBus.subscribe(&#39;testName2&#39;, fun2)</span></span>
<span class="line"><span style="color:#A6ACCD;">eventBus.subscribe(&#39;testName2&#39;, fun2)</span></span>
<span class="line"><span style="color:#A6ACCD;">eventBus.emit(&#39;testName2&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">//  unSubscribe 取消订阅</span></span>
<span class="line"><span style="color:#A6ACCD;">const { unSubscribe } = eventBus.subscribe(&#39;testName3&#39;, fun3)</span></span>
<span class="line"><span style="color:#A6ACCD;">unSubscribe()</span></span>
<span class="line"><span style="color:#A6ACCD;">eventBus.emit(&#39;testName3&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// subscribeOne 订阅一次只能触发一次</span></span>
<span class="line"><span style="color:#A6ACCD;">eventBus.subscribeOne(&#39;testName4&#39;, fun4)</span></span>
<span class="line"><span style="color:#A6ACCD;">eventBus.emit(&#39;testName4&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">eventBus.emit(&#39;testName4&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">/**</span></span>
<span class="line"><span style="color:#A6ACCD;"> * 111  参数1</span></span>
<span class="line"><span style="color:#A6ACCD;"> * 111 参数1</span></span>
<span class="line"><span style="color:#A6ACCD;"> * 222</span></span>
<span class="line"><span style="color:#A6ACCD;"> * 222</span></span>
<span class="line"><span style="color:#A6ACCD;"> * 从未订阅过此事件testName3</span></span>
<span class="line"><span style="color:#A6ACCD;"> * 444</span></span>
<span class="line"><span style="color:#A6ACCD;"> * 事件testName4无函数可执行</span></span>
<span class="line"><span style="color:#A6ACCD;"> */</span></span></code></pre></div>`,10),t=[c];function o(C,A,i,r,y,D){return n(),a("div",null,t)}const m=s(p,[["render",o]]);export{d as __pageData,m as default};
