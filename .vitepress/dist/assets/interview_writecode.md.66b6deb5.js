import{_ as s,o as n,c as a,U as l}from"./chunks/framework.9adb0f96.js";const u=JSON.parse('{"title":"一、JavaScript基础","description":"","frontmatter":{},"headers":[],"relativePath":"interview/writecode.md","filePath":"interview/writecode.md","lastUpdated":1694661640000}'),e={name:"interview/writecode.md"},p=l(`<h1 id="一、javascript基础" tabindex="-1">一、JavaScript基础 <a class="header-anchor" href="#一、javascript基础" aria-label="Permalink to &quot;一、JavaScript基础&quot;">​</a></h1><h2 id="_1-object-create" tabindex="-1">1. Object.create <a class="header-anchor" href="#_1-object-create" aria-label="Permalink to &quot;1. Object.create&quot;">​</a></h2><p>思路：新对象原型指向传入对象，从而继承传入对象的属性和方法</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">Object.prototype.MyCreate = function (obj) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  function F() {}</span></span>
<span class="line"><span style="color:#A6ACCD;">  F.prototype = obj;</span></span>
<span class="line"><span style="color:#A6ACCD;">  return new F();</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const personPrototype = {</span></span>
<span class="line"><span style="color:#A6ACCD;">  greeting() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(\`Hello, my name is \${this.name}.\`);</span></span>
<span class="line"><span style="color:#A6ACCD;">  },</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span>
<span class="line"><span style="color:#A6ACCD;">const john = Object.MyCreate(personPrototype);</span></span>
<span class="line"><span style="color:#A6ACCD;">john.name = &quot;John Doe&quot;;</span></span>
<span class="line"><span style="color:#A6ACCD;">john.greeting();</span></span></code></pre></div><h2 id="_2-new-操作符" tabindex="-1">2. new 操作符 <a class="header-anchor" href="#_2-new-操作符" aria-label="Permalink to &quot;2. new 操作符&quot;">​</a></h2><ul><li>通过<code>Object.create</code>创建一个空对象继承传入构造函数的原型。</li><li>指向构造函数，使其<code>this</code>指向新建的对象</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function objectFactory(constructor, ...args) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 设置原型，将对象的原型设置为函数的 prototype 对象</span></span>
<span class="line"><span style="color:#A6ACCD;">  const obj = Object.create(constructor.prototype);</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 将 this 指向新建对象，并执行函数</span></span>
<span class="line"><span style="color:#A6ACCD;">  const result = constructor.apply(obj, args);</span></span>
<span class="line"><span style="color:#A6ACCD;">  return typeof result === &quot;object&quot; &amp;&amp; result !== null ? result : obj;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">function Person(name) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  this.name = name;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const well = objectFactory(Person, &quot;well&quot;);</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(well.name); // well</span></span></code></pre></div><h2 id="_3-instanceof" tabindex="-1">3. instanceof <a class="header-anchor" href="#_3-instanceof" aria-label="Permalink to &quot;3. instanceof&quot;">​</a></h2><ol><li>首先获取类型的原型</li><li>然后获得对象的原型</li><li>然后一直循环判断对象的原型是否等于类型的原型，直到对象原型为 <code>null</code>，因为原型链最终为 <code>null</code></li></ol><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function myInstanceof (left, right) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let proto = Object.getPrototypeOf(left)</span></span>
<span class="line"><span style="color:#A6ACCD;">    let constructor = right.prototype</span></span>
<span class="line"><span style="color:#A6ACCD;">    while (true) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (!proto) return false</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (proto === constructor) return true</span></span>
<span class="line"><span style="color:#A6ACCD;">        proto = Object.getPrototypeOf(proto)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">console.log([] instanceof Array) // true</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(2 instanceof Number) // fasle</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(myInstanceof([], Array)) // true</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(myInstanceof(2, Number)) // true</span></span></code></pre></div><h2 id="_4-debounce" tabindex="-1">4. debounce <a class="header-anchor" href="#_4-debounce" aria-label="Permalink to &quot;4. debounce&quot;">​</a></h2><p>函数防抖是指在事件被触发 n 秒后再执行回调，如果在这 n 秒内事件又被触发，则重新计时。这可以使用在一些点击请求的事件上，避免因为用户的多次点击向后端发送多次请求。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function debounce(fn, wait) {</span></span>
<span class="line"><span style="color:#A6ACCD;">	let timer = null</span></span>
<span class="line"><span style="color:#A6ACCD;">	// 利用箭头函数this指向定义处</span></span>
<span class="line"><span style="color:#A6ACCD;">    return (...args) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    	if (timer) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            clearTimeout(timer)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        timer = setTimeout(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        	fn.apply(this, args)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }, wait)</span></span>
<span class="line"><span style="color:#A6ACCD;">   }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h2 id="_5-throttle" tabindex="-1">5. throttle <a class="header-anchor" href="#_5-throttle" aria-label="Permalink to &quot;5. throttle&quot;">​</a></h2><p>函数节流是指规定一个单位时间，在这个单位时间内，只能有一次触发事件的回调函数执行，如果在同一个单位时间内某事件被触发多次，只有一次能生效。节流可以使用在 scroll 函数的事件监听上，通过事件节流来降低事件调用的频率。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function throttle(fn, delay) {</span></span>
<span class="line"><span style="color:#A6ACCD;">	let startTime = Date.now()</span></span>
<span class="line"><span style="color:#A6ACCD;">	return (...args) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">		let nowTime = Date.now()</span></span>
<span class="line"><span style="color:#A6ACCD;">		if (nowTime - startTime &gt;= delay) {</span></span>
<span class="line"><span style="color:#A6ACCD;">			startTime = nowTime</span></span>
<span class="line"><span style="color:#A6ACCD;">			return fn.apply(this, args)</span></span>
<span class="line"><span style="color:#A6ACCD;">		}</span></span>
<span class="line"><span style="color:#A6ACCD;">	}</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h2 id="_6-类型判断" tabindex="-1">6.类型判断 <a class="header-anchor" href="#_6-类型判断" aria-label="Permalink to &quot;6.类型判断&quot;">​</a></h2><p>主要是通过typeof 和 Object.prototype.toString.call()来判断，由于typeof null 也等于 &#39;object&#39;,所以才做了多一步的处理</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function getType (value) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 如果是null则返回</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (value === null) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        return value + &#39;&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 如果是数组、对象</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (typeof value === &#39;object&#39;) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // [object Array]</span></span>
<span class="line"><span style="color:#A6ACCD;">        let valueClass = Object.prototype.toString.call(value)</span></span>
<span class="line"><span style="color:#A6ACCD;">        let type = valueClass.split(&#39; &#39;)[1].split(&#39;&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">        type.pop()</span></span>
<span class="line"><span style="color:#A6ACCD;">        // [&#39;A&#39;, &#39;r&#39;, &#39;r&#39;, &#39;a&#39;, &#39;y&#39;]</span></span>
<span class="line"><span style="color:#A6ACCD;">        return type.join(&#39;&#39;).toLowerCase()</span></span>
<span class="line"><span style="color:#A6ACCD;">    } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">        return typeof value</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(getType([])) // array</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(getType(2)) // number</span></span></code></pre></div><h2 id="_7-call" tabindex="-1">7.call <a class="header-anchor" href="#_7-call" aria-label="Permalink to &quot;7.call&quot;">​</a></h2><p>核心思想：把调用方法作为contex的属性去执行，并把得到的结果返回</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">Function.prototype.MyCall = function (context, ...args) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  context = context || window;</span></span>
<span class="line"><span style="color:#A6ACCD;">  context.fn = this;</span></span>
<span class="line"><span style="color:#A6ACCD;">  const result = context.fn(...args);</span></span>
<span class="line"><span style="color:#A6ACCD;">  delete context.fn;</span></span>
<span class="line"><span style="color:#A6ACCD;">  return result;</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const Person = {</span></span>
<span class="line"><span style="color:#A6ACCD;">  name: &quot;well&quot;,</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span>
<span class="line"><span style="color:#A6ACCD;">function sayName(age) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  return \`name:\${this.name},age:\${age}\`;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(sayName.MyCall(Person, 18)); // name:well,age:18</span></span></code></pre></div><h2 id="_8-apply" tabindex="-1">8.apply <a class="header-anchor" href="#_8-apply" aria-label="Permalink to &quot;8.apply&quot;">​</a></h2><p>核心思想：把调用方法作为contex的属性去执行，并把得到的结果返回。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">Function.prototype.MyApply = function (context, ...args) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  context = context || window;</span></span>
<span class="line"><span style="color:#A6ACCD;">  context.fn = this;</span></span>
<span class="line"><span style="color:#A6ACCD;">  const result = context.fn(...args);</span></span>
<span class="line"><span style="color:#A6ACCD;">  delete context.fn;</span></span>
<span class="line"><span style="color:#A6ACCD;">  return result;</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const Person = {</span></span>
<span class="line"><span style="color:#A6ACCD;">  name: &quot;well&quot;,</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span>
<span class="line"><span style="color:#A6ACCD;">function sayName(age) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  return \`name:\${this.name},age:\${age}\`;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(sayName.MyApply(Person, [18]));</span></span></code></pre></div><h2 id="_9-bind" tabindex="-1">9.bind <a class="header-anchor" href="#_9-bind" aria-label="Permalink to &quot;9.bind&quot;">​</a></h2><p>bind 函数的实现步骤：</p><ol><li>判断调用对象是否为函数，即使我们是定义在函数的原型上的，但是可能出现使用 call 等方式调用的情况。</li><li>保存当前函数的引用，获取其余传入参数值。</li><li>创建一个函数返回</li><li>函数内部使用 apply 来绑定函数调用，需要判断函数作为构造函数的情况，这个时候需要传入当前函数的 this 给 apply 调用，其余情况都传入指定的上下文对象。</li></ol><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">Function.prototype.myBind = function (context, ...args) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  context = context || window;</span></span>
<span class="line"><span style="color:#A6ACCD;">  const fn = this;</span></span>
<span class="line"><span style="color:#A6ACCD;">  return function Fn() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 根据调用方式，传入不同绑定值</span></span>
<span class="line"><span style="color:#A6ACCD;">    return fn.apply(</span></span>
<span class="line"><span style="color:#A6ACCD;">      this instanceof Fn ? this : context,</span></span>
<span class="line"><span style="color:#A6ACCD;">      args.concat(...arguments)</span></span>
<span class="line"><span style="color:#A6ACCD;">    );</span></span>
<span class="line"><span style="color:#A6ACCD;">  };</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const foo = {</span></span>
<span class="line"><span style="color:#A6ACCD;">  a: 1,</span></span>
<span class="line"><span style="color:#A6ACCD;">  log(x, y) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(this.a, x, y);</span></span>
<span class="line"><span style="color:#A6ACCD;">  },</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span>
<span class="line"><span style="color:#A6ACCD;">const obj = {</span></span>
<span class="line"><span style="color:#A6ACCD;">  a: 10,</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span>
<span class="line"><span style="color:#A6ACCD;">foo.log.myBind(obj, 5, 6)(); // 10, 5, 6</span></span></code></pre></div><h2 id="_10-实现浅拷贝" tabindex="-1">10. 实现浅拷贝 <a class="header-anchor" href="#_10-实现浅拷贝" aria-label="Permalink to &quot;10. 实现浅拷贝&quot;">​</a></h2><p>浅拷贝是指，一个新的对象对原始对象的属性值进行精确地拷贝，如果拷贝的是基本数据类型，拷贝的就是基本数据类型的值，如果是引用数据类型，拷贝的就是内存地址。如果其中一个对象的引用内存地址发生改变，另一个对象也会发生变化。</p><ul><li>Object.assign()</li><li>扩展运算符</li><li>数组方法实现数组浅拷贝</li></ul><h3 id="_10-1-object-assign" tabindex="-1">10.1 Object.assign() <a class="header-anchor" href="#_10-1-object-assign" aria-label="Permalink to &quot;10.1 Object.assign()&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">let target = {a: 1};</span></span>
<span class="line"><span style="color:#A6ACCD;">let object2 = {b: 2};</span></span>
<span class="line"><span style="color:#A6ACCD;">let object3 = {c: 3};</span></span>
<span class="line"><span style="color:#A6ACCD;">Object.assign(target,object2,object3);  </span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(target);  // {a: 1, b: 2, c: 3}</span></span></code></pre></div><h3 id="_10-2-扩展运算符" tabindex="-1">10.2 扩展运算符 <a class="header-anchor" href="#_10-2-扩展运算符" aria-label="Permalink to &quot;10.2 扩展运算符&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">let obj4 = {a:1,b:{c:1}}</span></span>
<span class="line"><span style="color:#A6ACCD;">let obj5 = {...obj4} // { a: 1, b: { c: 1 } }</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(obj5)</span></span></code></pre></div><h3 id="_10-3-数组方法实现数组浅拷贝" tabindex="-1">10.3 数组方法实现数组浅拷贝 <a class="header-anchor" href="#_10-3-数组方法实现数组浅拷贝" aria-label="Permalink to &quot;10.3 数组方法实现数组浅拷贝&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// Array.prototype.slice</span></span>
<span class="line"><span style="color:#A6ACCD;">let arr = [1,2,3,4];</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(arr.slice()); // [1,2,3,4]</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(arr.slice() === arr); //false</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// Array.prototype.concat</span></span>
<span class="line"><span style="color:#A6ACCD;">let arr2 = [1,2,3,4];</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(arr2.concat()); // [1,2,3,4]</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(arr2.concat() === arr); //false</span></span></code></pre></div><h3 id="_10-4-浅拷贝的实现" tabindex="-1">10.4 浅拷贝的实现 <a class="header-anchor" href="#_10-4-浅拷贝的实现" aria-label="Permalink to &quot;10.4 浅拷贝的实现&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function shallowCopy(object) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 只拷贝对象</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (!object || typeof object !== &#39;object&#39;) return</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 根据object 的类型判断新建的是数组还是对象</span></span>
<span class="line"><span style="color:#A6ACCD;">    let newObject = Array.isArray(object) ? [] : {}</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 遍历object，判断是object的属性才拷贝</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let key in object) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (object.hasOwnProperty(key)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            newObject[key] = object[key]</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return newObject</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const myObject = [1,2,3,4,5]</span></span>
<span class="line"><span style="color:#A6ACCD;">const newShallowObject = shallowCopy(myObject)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(newShallowObject) // [ 1, 2, 3, 4, 5 ]</span></span></code></pre></div><h2 id="_11-实现深拷贝" tabindex="-1">11. 实现深拷贝 <a class="header-anchor" href="#_11-实现深拷贝" aria-label="Permalink to &quot;11. 实现深拷贝&quot;">​</a></h2><p>深拷贝相对浅拷贝而言，如果遇到属性值为引用类型的时候，它新建一个引用类型并将对应的值复制给它，因此对象获得的一个新的引用类型而不是一个原有类型的引用。深拷贝对于一些对象可以使用 JSON 的两个函数来实现，但是由于 JSON 的对象格式比 js 的对象格式更加严格，所以如果属性值里边出现函数或者 Symbol 类型的值时，会转换失败。</p><ul><li>JSON.stringify</li><li>lodash的_.cloneDeep</li><li>手动实现深拷贝函数</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const obj1 = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    a: 1,</span></span>
<span class="line"><span style="color:#A6ACCD;">    b: { f: { g: 1 } },</span></span>
<span class="line"><span style="color:#A6ACCD;">    c: [1, 2, 3]</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">// JSON.stringfy</span></span>
<span class="line"><span style="color:#A6ACCD;">const obj2 = JSON.parse(JSON.stringify(obj1))</span></span>
<span class="line"><span style="color:#A6ACCD;">obj2.b.e =2</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(obj1) // { a: 1, b: { f: { g: 1 } }, c: [ 1, 2, 3 ] }</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(obj2) // { a: 1, b: { f: { g: 1 }, e: 2 }, c: [ 1, 2, 3 ] }</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 深拷贝的实现</span></span>
<span class="line"><span style="color:#A6ACCD;">function deepCopy (object) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 只拷贝对象</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (!object || typeof object !== &#39;object&#39;) return</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 根据object 的类型判断新建的是数组还是对象</span></span>
<span class="line"><span style="color:#A6ACCD;">    let newObject = Array.isArray(object) ? [] : {}</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 遍历 object</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let key in object) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (object.hasOwnProperty(key)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            newObject[key] = typeof object[key] === &#39;object&#39; ? deepCopy(object[key]) : object[key]</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return newObject</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const obj3 = deepCopy(obj1)</span></span>
<span class="line"><span style="color:#A6ACCD;">obj3.b.f.g = 5</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(obj1) // { a: 1, b: { f: { g: 1 } }, c: [ 1, 2, 3 ] }</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(obj3) // { a: 1, b: { f: { g: 5 } }, c: [ 1, 2, 3 ] }</span></span></code></pre></div><h2 id="_12-实现-sleep-函数" tabindex="-1">12.实现 sleep 函数 <a class="header-anchor" href="#_12-实现-sleep-函数" aria-label="Permalink to &quot;12.实现 sleep 函数&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function sleep (wait) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return new Promise(resolve =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        setTimeout(resolve, wait)</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const curTime = Date.now()</span></span>
<span class="line"><span style="color:#A6ACCD;">sleep(3000).then(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(Date.now() - curTime) // 3000</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span></code></pre></div><h2 id="_13-实现-object-assign" tabindex="-1">13. 实现 Object.assign <a class="header-anchor" href="#_13-实现-object-assign" aria-label="Permalink to &quot;13. 实现 Object.assign&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">Object.myAssign = function (target, ...source) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (target === null) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        throw new TypeError(&#39;error&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    let ret = Object(target)</span></span>
<span class="line"><span style="color:#A6ACCD;">    source.forEach(obj =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (obj !== null) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            for (let key in obj) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                if (obj.hasOwnProperty(key)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                    ret[key] = obj[key]</span></span>
<span class="line"><span style="color:#A6ACCD;">                }</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">    return ret</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">let target = {a: 1}</span></span>
<span class="line"><span style="color:#A6ACCD;">let object2 = {b: 2}</span></span>
<span class="line"><span style="color:#A6ACCD;">let object3 = {c: 3}</span></span>
<span class="line"><span style="color:#A6ACCD;">Object.myAssign(target,object2,object3)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(target);  // {a: 1, b: 2, c: 3}</span></span></code></pre></div><h2 id="_14-手写-promise" tabindex="-1">14.手写 Promise <a class="header-anchor" href="#_14-手写-promise" aria-label="Permalink to &quot;14.手写 Promise&quot;">​</a></h2><h3 id="_14-1声明-promise-类-then-的基础构建" tabindex="-1">14.1声明 Promise 类 &amp; then 的基础构建 <a class="header-anchor" href="#_14-1声明-promise-类-then-的基础构建" aria-label="Permalink to &quot;14.1声明 Promise 类 &amp; then 的基础构建&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const PENDING = &#39;pengding&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">const FULFILLED = &#39;fulfilled&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">const REJECTED = &#39;rejected&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">class myPromise {</span></span>
<span class="line"><span style="color:#A6ACCD;">    constructor (executor) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 保存 promise 的状态</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.state = PENDING</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 成功结果</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.value = undefined</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 失败结果</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.reason = undefined</span></span>
<span class="line"><span style="color:#A6ACCD;">        // resolve 方法</span></span>
<span class="line"><span style="color:#A6ACCD;">        const resolve = (value) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (this.state = PENDING) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                this.state = FULFILLED</span></span>
<span class="line"><span style="color:#A6ACCD;">                this.value = value</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        const reject = (reason) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (this.state = PENDING) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                this.state = REJECTED</span></span>
<span class="line"><span style="color:#A6ACCD;">                this.reason = reason</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        try {</span></span>
<span class="line"><span style="color:#A6ACCD;">            executor(resolve, reject)</span></span>
<span class="line"><span style="color:#A6ACCD;">        } catch (e) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            reject(e)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    // then 方法</span></span>
<span class="line"><span style="color:#A6ACCD;">    then (onFulfilled, onRejected) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 如果状态是 fulfilled，则执行then传入的 onFulfilled 函数</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (this.state === FULFILLED) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            typeof onFulfilled === &#39;function&#39; &amp;&amp; onFulfilled(this.value)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 如果状态是 fulfilled，则执行then传入的 onRejected 函数</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (this.state === REJECTED) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            typeof onRejected === &#39;function&#39; &amp;&amp; onRejected(this.reason)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const promise = new myPromise ((resolve, reject) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    resolve(1)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(promise) // myPromise { state: &#39;fulfilled&#39;, value: 1, reason: undefined }</span></span>
<span class="line"><span style="color:#A6ACCD;">promise.then((res) =&gt; console.log(res)) // 1</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 漏洞</span></span>
<span class="line"><span style="color:#A6ACCD;">const promiseError = new myPromise((resolve, reject) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;执行&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    setTimeout(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        reject(3)</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(promiseError) // myPromise { state: &#39;pengding&#39;, value: undefined, reason: undefined } </span></span>
<span class="line"><span style="color:#A6ACCD;">promiseError.then(res =&gt; console.log(res), err =&gt; console.log(err))</span></span></code></pre></div><ul><li>resolve: 把state 变为 fulfilled， 改变value</li><li>reject：把state 变为 rejected，改变reason</li><li>由于setTimeout是宏任务，放入宏任务队列，执行了下面的then，由于还没有resolve或者reject，所以状态还是pending。</li></ul><h3 id="_14-2-then-进一步优化" tabindex="-1">14.2 then 进一步优化 <a class="header-anchor" href="#_14-2-then-进一步优化" aria-label="Permalink to &quot;14.2 then 进一步优化&quot;">​</a></h3><p><strong>参考发布订阅模式，在执行then的时候，如果当时还是 pending 状态，就把回调函数寄存到一个数组中，当状态发生改变时，去数组中取出回调函数。</strong></p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">class myPromise {</span></span>
<span class="line"><span style="color:#A6ACCD;">    constructor (executor) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    	...</span></span>
<span class="line"><span style="color:#A6ACCD;">    	// 成功的回调</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.onFulfilled = []</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 失败的回调</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.onRejected = []</span></span>
<span class="line"><span style="color:#A6ACCD;">        // resolve 方法</span></span>
<span class="line"><span style="color:#A6ACCD;">        const resolve = (value) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (this.state = PENDING) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                this.state = FULFILLED</span></span>
<span class="line"><span style="color:#A6ACCD;">                this.value = value</span></span>
<span class="line"><span style="color:#A6ACCD;">                // 执行成功的回调</span></span>
<span class="line"><span style="color:#A6ACCD;">                this.onFulfilled.forEach(fn =&gt; fn(value))</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        const reject = (reason) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (this.state = PENDING) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                this.state = REJECTED</span></span>
<span class="line"><span style="color:#A6ACCD;">                this.reason = reason</span></span>
<span class="line"><span style="color:#A6ACCD;">                // 执行失败的回调</span></span>
<span class="line"><span style="color:#A6ACCD;">                this.onRejected.forEach(fn =&gt; fn(reason))</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    then (onFulfilled, onRejected) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    	...</span></span>
<span class="line"><span style="color:#A6ACCD;">    	// 如果状态是 pending，不是马上执行回调函数，而是将其存储起来</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (this.state === PENDING) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            typeof onFulfilled === &#39;function&#39; &amp;&amp; this.onFulfilled.push(onFulfilled)</span></span>
<span class="line"><span style="color:#A6ACCD;">            typeof onRejected === &#39;function&#39; &amp;&amp; this.onRejected.push(onRejected)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const promise = new myPromise((resolve, reject) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    setTimeout(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        resolve(1)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }, 1000)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;">promise.then(res =&gt; console.log(res)) // 1</span></span>
<span class="line"><span style="color:#A6ACCD;">promise.then(res =&gt; console.log(res)) // 1</span></span></code></pre></div><p><strong>原生的promise.then()中的代码是异步执行的，所以需要进一步优化，否则出现下面代码执行顺序</strong></p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const promise = new myPromise((resolve, reject) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    resolve(1)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;">promise.then(res =&gt; console.log(res)) // 1</span></span>
<span class="line"><span style="color:#A6ACCD;">promise.then(res =&gt; console.log(res)) // 1</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(2)</span></span></code></pre></div><ul><li>1</li><li>1</li><li>2</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">then (onFulfilled, onRejected) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if(typeof onFulfilled !== &#39;function&#39;) onFulfilled = () =&gt; {}</span></span>
<span class="line"><span style="color:#A6ACCD;">        if(typeof onRejected !== &#39;function&#39;) onRejected = () =&gt; {}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">        // 如果状态是 pending，不是马上执行回调函数，而是将其存储起来</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (this.state === PENDING) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            this.onFulfilled.push(</span></span>
<span class="line"><span style="color:#A6ACCD;">                () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">                    setTimeout(() =&gt; onFulfilled(this.value))</span></span>
<span class="line"><span style="color:#A6ACCD;">                }</span></span>
<span class="line"><span style="color:#A6ACCD;">            )</span></span>
<span class="line"><span style="color:#A6ACCD;">            this.onRejected.push(</span></span>
<span class="line"><span style="color:#A6ACCD;">                () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">                    setTimeout(() =&gt; onRejected(this.reason))</span></span>
<span class="line"><span style="color:#A6ACCD;">                }</span></span>
<span class="line"><span style="color:#A6ACCD;">            )</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 如果状态是 fulfilled，则执行then传入的 onFulfilled 函数</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (this.state === FULFILLED) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            setTimeout(() =&gt; onFulfilled(this.value))</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 如果状态是 fulfilled，则执行then传入的 onRejected 函数</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (this.state === REJECTED) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            setTimeout(() =&gt; onRejected(this.reason))</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span></code></pre></div><h3 id="_14-3-链式调用" tabindex="-1">14.3 链式调用 <a class="header-anchor" href="#_14-3-链式调用" aria-label="Permalink to &quot;14.3 链式调用&quot;">​</a></h3><ul><li>promise 是支持链式调用的，就是 .then() 之后还可以继续 .then()</li><li>所以 then 返回的应该还是一个 promise 对象，并且在这个返回的promise 中就调用了 resolve 或者 reject方法，改变了state，这样的话下一个then 的回调就可以获取到 value 或者 reason</li><li>由于promise 可以穿透，即前面的then不传入回调，后面的then的回调依然能接收到 value 或者 reason，所以 then 的实现中，如果没有传入回调函数，则定义一下回调函数即可</li><li>如果在 then 中发生了错误，则返回的promise对象的状态应该是调用了 reject 方法，把 state 改成了 rejected 状态的。</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">then (onFulfilled, onRejected) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if(typeof onFulfilled !== &#39;function&#39;) onFulfilled = () =&gt; {}</span></span>
<span class="line"><span style="color:#A6ACCD;">        if(typeof onRejected !== &#39;function&#39;) onRejected = () =&gt; {}</span></span>
<span class="line"><span style="color:#A6ACCD;">        return new myPromise((resolve, reject) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 如果状态是 pending，不是马上执行回调函数，而是将其存储起来</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (this.state === PENDING) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                this.onFulfilled.push(</span></span>
<span class="line"><span style="color:#A6ACCD;">                    () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">                        setTimeout(() =&gt; resolve(onFulfilled(this.value)))</span></span>
<span class="line"><span style="color:#A6ACCD;">                    }</span></span>
<span class="line"><span style="color:#A6ACCD;">                )</span></span>
<span class="line"><span style="color:#A6ACCD;">                this.onRejected.push(</span></span>
<span class="line"><span style="color:#A6ACCD;">                    () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">                        setTimeout(() =&gt; resolve(onRejected(this.reason)))</span></span>
<span class="line"><span style="color:#A6ACCD;">                    }</span></span>
<span class="line"><span style="color:#A6ACCD;">                )</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 如果状态是 fulfilled，则执行then传入的 onFulfilled 函数</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (this.state === FULFILLED) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                setTimeout(() =&gt; resolve(onFulfilled(this.value)))</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 如果状态是 fulfilled，则执行then传入的 onRejected 函数</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (this.state === REJECTED) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                setTimeout(() =&gt; resolve(onRejected(this.reason)))</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        })</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const promise = new myPromise((resolve, reject) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    resolve(1)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;">promise</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(res =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(res)</span></span>
<span class="line"><span style="color:#A6ACCD;">        return res</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(res =&gt; console.log(res))</span></span>
<span class="line"><span style="color:#A6ACCD;">// 输出： 1 1</span></span></code></pre></div><p><strong>处理then 穿透</strong></p><p>原生：promise.then().then(res =&gt; console.log(res))中依然可以拿到前面传递过来的参数，这里就是then的穿透。</p><p>实现 then 的穿透也非常简单，更改一下 onFulfilled 和 onRejected 不是函数的情况的处理即可：</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">then (onFulfilled, onRejected) {</span></span>
<span class="line"><span style="color:#A6ACCD;">	if(typeof onFulfilled !== &#39;function&#39;) onFulfilled = value =&gt; value</span></span>
<span class="line"><span style="color:#A6ACCD;">    if(typeof onRejected !== &#39;function&#39;) onRejected = reason =&gt; {throw reason}</span></span>
<span class="line"><span style="color:#A6ACCD;">    ...</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><p><strong>异常处理</strong></p><p>如果在then中出现了错误，需要返回的下一个promise 的 state 变为 rejected，所以需要添加异常处理</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">try {</span></span>
<span class="line"><span style="color:#A6ACCD;">	resolve(onFulfilled(this.value))</span></span>
<span class="line"><span style="color:#A6ACCD;">} catch(e) {</span></span>
<span class="line"><span style="color:#A6ACCD;">	reject(e)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h3 id="_14-4-封装-resolvepromise-来处理-promise" tabindex="-1">14-4 封装 resolvePromise 来处理 promise <a class="header-anchor" href="#_14-4-封装-resolvepromise-来处理-promise" aria-label="Permalink to &quot;14-4 封装 resolvePromise 来处理 promise&quot;">​</a></h3><p>在前面我们已经基本完成了 then，而一些特殊情况依旧会造成问题：</p><ol><li><p>循环引用自身</p><p>在原生Promise中，如果一个promise的onResolved返回了自身，比如这样</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const promise =  new Promise((resolve, reject) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">  resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;">const p = promise.then(() =&gt; p)</span></span>
<span class="line"><span style="color:#A6ACCD;">// Uncaught (in promise) TypeError: A promise cannot be resolved with itself.</span></span></code></pre></div></li><li><p>onResolved 返回了一个 promise 对象</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">new Promise((resolve, reject) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">  resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">}).then(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">	return new Promise((resolve, reject) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    resolve(&#39;hi&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">  })</span></span>
<span class="line"><span style="color:#A6ACCD;">}).then(res =&gt; console.log(res))</span></span></code></pre></div><p>在原生 Promise 中，当 onResolved 返回了一个 promise 对象时，会将其 resolve 或 reject 的值传递到下一个 then, 所以打印结果是 ‘hi’</p></li><li><p>onResolved 返回了一个嵌套的 promise 对象</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">new Promise((resolve, reject) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">  resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">}).then(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">  return new Promise((resolve, reject) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    resolve(new Promise((resolve, reject) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">      resolve(&#39;hi&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }))</span></span>
<span class="line"><span style="color:#A6ACCD;">  })</span></span>
<span class="line"><span style="color:#A6ACCD;">}).then(res =&gt; console.log(res)) // hi</span></span></code></pre></div></li></ol><h1 id="二、数据处理" tabindex="-1">二、数据处理 <a class="header-anchor" href="#二、数据处理" aria-label="Permalink to &quot;二、数据处理&quot;">​</a></h1><h2 id="_15-实现日期格式化函数" tabindex="-1">15.实现日期格式化函数 <a class="header-anchor" href="#_15-实现日期格式化函数" aria-label="Permalink to &quot;15.实现日期格式化函数&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const dateFormat = function (dateInput, format) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const day = dateInput.getDate()</span></span>
<span class="line"><span style="color:#A6ACCD;">    const month = dateInput.getMonth() + 1</span></span>
<span class="line"><span style="color:#A6ACCD;">    const year = dateInput.getFullYear()</span></span>
<span class="line"><span style="color:#A6ACCD;">    format = format.replace(/yyyy/, year)</span></span>
<span class="line"><span style="color:#A6ACCD;">    format = format.replace(/MM/, month)</span></span>
<span class="line"><span style="color:#A6ACCD;">    format = format.replace(/dd/, day)</span></span>
<span class="line"><span style="color:#A6ACCD;">    return format</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(dateFormat(new Date(&#39;2020-12-01&#39;), &#39;yyyy/MM/dd&#39;)) // 2020/12/01</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(dateFormat(new Date(&#39;2020-04-01&#39;), &#39;yyyy/MM/dd&#39;)) // 2020/04/01</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(dateFormat(new Date(&#39;2020-04-01&#39;), &#39;yyyy年MM月dd日&#39;)) // 2020年04月01日</span></span></code></pre></div><h2 id="_16-实现数组的乱序输出" tabindex="-1">16. 实现数组的乱序输出 <a class="header-anchor" href="#_16-实现数组的乱序输出" aria-label="Permalink to &quot;16. 实现数组的乱序输出&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const arr = [1,2,3,4,5,6,7,8,9,10]</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">let length = arr.length</span></span>
<span class="line"><span style="color:#A6ACCD;">let randomIndex</span></span>
<span class="line"><span style="color:#A6ACCD;">while (length) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    randomIndex = Math.floor(Math.random() * length)</span></span>
<span class="line"><span style="color:#A6ACCD;">    length--</span></span>
<span class="line"><span style="color:#A6ACCD;">    [arr[length], arr[randomIndex]] = [arr[randomIndex], arr[length]]</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(arr)</span></span></code></pre></div><h2 id="_17-实现数组元素的求和" tabindex="-1">17.实现数组元素的求和 <a class="header-anchor" href="#_17-实现数组元素的求和" aria-label="Permalink to &quot;17.实现数组元素的求和&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">let arr = [1,2,3,4,5,6,7,8,9,10]</span></span>
<span class="line"><span style="color:#A6ACCD;">// reduce</span></span>
<span class="line"><span style="color:#A6ACCD;">let sum = arr.reduce((total, i) =&gt; total += i, 0)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(sum) // 5</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 递归</span></span>
<span class="line"><span style="color:#A6ACCD;">function add (arr) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (arr.length === 1) return arr[0]</span></span>
<span class="line"><span style="color:#A6ACCD;">    return arr[0] + add(arr.slice(1)) </span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(add(arr)) // 5</span></span></code></pre></div><h2 id="_18-数组扁平化" tabindex="-1">18.数组扁平化 <a class="header-anchor" href="#_18-数组扁平化" aria-label="Permalink to &quot;18.数组扁平化&quot;">​</a></h2><ul><li>递归实现</li><li>迭代实现</li><li>扩展运算符实现</li><li>split 和 toString</li><li>ES6 flat</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">let arr = [1, [2, [3, 4, 5]]]</span></span>
<span class="line"><span style="color:#A6ACCD;">// 递归实现</span></span>
<span class="line"><span style="color:#A6ACCD;">function flatten (arr) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let result = []</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i=0; i&lt;arr.length; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (Array.isArray(arr[i])) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            result = result.concat(flatten(arr[i]))</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">            result.push(arr[i])</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return result</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(flatten(arr)) // [ 1, 2, 3, 4, 5 ]</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 迭代实现</span></span>
<span class="line"><span style="color:#A6ACCD;">function flattenReduce (arr) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return arr.reduce((previousValue, currentValue) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        return previousValue.concat(Array.isArray(currentValue) ? flattenReduce(currentValue) : currentValue)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }, [])</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(flattenReduce(arr)) // [ 1, 2, 3, 4, 5 ]</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 扩展运算符实现</span></span>
<span class="line"><span style="color:#A6ACCD;">function flattenExtension (arr) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    while(arr.some(item =&gt; Array.isArray(item))) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        arr = [].concat(...arr)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return arr</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(flattenExtension(arr)) // [ 1, 2, 3, 4, 5 ]</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// split 和 toString </span></span>
<span class="line"><span style="color:#A6ACCD;">function flattenByString (arr) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return arr.toString().split(&quot;,&quot;)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(flattenByString(arr)) // [ &#39;1&#39;, &#39;2&#39;, &#39;3&#39;, &#39;4&#39;, &#39;5&#39; ]</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// ES6 flat</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(arr.flat(Infinity)) // [ 1, 2, 3, 4, 5 ]</span></span></code></pre></div><h2 id="_19-数组去重" tabindex="-1">19. 数组去重 <a class="header-anchor" href="#_19-数组去重" aria-label="Permalink to &quot;19. 数组去重&quot;">​</a></h2><ul><li>set</li><li>map</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const array = [1, 2, 3, 5, 1, 5, 9, 1, 2, 8]</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// Array.from(new Set(arr))</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(Array.from(new Set(array))) // [ 1, 2, 3, 5, 9, 8 ]</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// map</span></span>
<span class="line"><span style="color:#A6ACCD;">function uniqueArray (arr) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let map = new Map()</span></span>
<span class="line"><span style="color:#A6ACCD;">    let res = []</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i=0; i&lt;arr.length; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (!map.has(arr[i])) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            map.set(arr[i], 1)</span></span>
<span class="line"><span style="color:#A6ACCD;">            res.push(arr[i])</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return res</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(uniqueArray(array)) // [ 1, 2, 3, 5, 9, 8 ]</span></span></code></pre></div><h2 id="_20-flat-实现" tabindex="-1">20. flat 实现 <a class="header-anchor" href="#_20-flat-实现" aria-label="Permalink to &quot;20. flat 实现&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function _flat (arr, depth) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (!Array.isArray(arr) || depth &lt;= 0) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        return arr</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return arr.reduce((previousVal, currentVal) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (Array.isArray(currentVal)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            return previousVal.concat(_flat(currentVal, depth - 1))</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">            return previousVal.concat(currentVal)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }, [])</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">let arr = [1, [2, [3, 4, 5]]]</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(_flat(arr, 1)) // [ 1, 2, [ 3, 4, 5 ] ]</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(arr.flat(1)) // [ 1, 2, [ 3, 4, 5 ] ]</span></span></code></pre></div><h2 id="_21-push-实现" tabindex="-1">21. push 实现 <a class="header-anchor" href="#_21-push-实现" aria-label="Permalink to &quot;21. push 实现&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">Array.prototype.myPush = function (...args) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i=0; i&lt;args.length; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        this[this.length] = args[i]</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return this.length</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const arr = [1, 2, 3]</span></span>
<span class="line"><span style="color:#A6ACCD;">const ret = arr.push(4, 5, 6)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(ret) // 6</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(arr) // [ 1, 2, 3, 4, 5, 6 ]</span></span></code></pre></div><h2 id="_22-filter-实现" tabindex="-1">22. filter 实现 <a class="header-anchor" href="#_22-filter-实现" aria-label="Permalink to &quot;22. filter 实现&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">Array.prototype.myFilter = function (fn) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (typeof fn !== &#39;function&#39;) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        throw TypeError(&#39;参数必须是一个函数&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    let res = []</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i=0; i&lt;this.length; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        fn(this[i]) &amp;&amp; res.push(this[i])</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return res</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const arr = [1, 2, 3, 4, 5, 6]</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(arr.myFilter(item =&gt; item&gt;3)) // [ 4, 5, 6 ]</span></span></code></pre></div><h2 id="_23-map-实现" tabindex="-1">23. map 实现 <a class="header-anchor" href="#_23-map-实现" aria-label="Permalink to &quot;23. map 实现&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">Array.prototype.myMap = function (fn) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (typeof fn !== &#39;function&#39;) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        throw TypeError(&#39;参数必须是一个函数&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    const res = []</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i=0; i&lt;this.length; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        res.push(fn(this[i]))</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return res</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const arr = [1, 2, 3, 4, 5, 6]</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(arr.myMap(item =&gt; item * item)) // [ 1, 4, 9, 16, 25, 36 ]</span></span></code></pre></div><h2 id="_24-repeat-实现" tabindex="-1">24.repeat 实现 <a class="header-anchor" href="#_24-repeat-实现" aria-label="Permalink to &quot;24.repeat 实现&quot;">​</a></h2><ul><li>冒泡实现</li><li>迭代实现</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function repeat(s, n) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (n &gt; 0) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        return s + repeat(s, --n)</span></span>
<span class="line"><span style="color:#A6ACCD;">    } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">        return &#39;&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">function repeatReduce (s, n) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    while (n &gt; 1) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        s += s</span></span>
<span class="line"><span style="color:#A6ACCD;">        n--</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return s</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(repeat(&#39;abc&#39;, 2)) // abcabc</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(repeatReduce(&#39;abc&#39;, 2)) // abcabc</span></span></code></pre></div><h2 id="_25-柯里化-参数长度不确定" tabindex="-1">25.柯里化-参数长度不确定 <a class="header-anchor" href="#_25-柯里化-参数长度不确定" aria-label="Permalink to &quot;25.柯里化-参数长度不确定&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 参数长度不固定</span></span>
<span class="line"><span style="color:#A6ACCD;">function currying (fn) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let args = []</span></span>
<span class="line"><span style="color:#A6ACCD;">    return function temp (...newArgs) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (newArgs.length) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            args = [</span></span>
<span class="line"><span style="color:#A6ACCD;">                ...args,</span></span>
<span class="line"><span style="color:#A6ACCD;">                ...newArgs</span></span>
<span class="line"><span style="color:#A6ACCD;">            ]</span></span>
<span class="line"><span style="color:#A6ACCD;">            return temp</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">            let val = fn.apply(this, args)</span></span>
<span class="line"><span style="color:#A6ACCD;">            args = [] //保证再次调用时清空</span></span>
<span class="line"><span style="color:#A6ACCD;">            return val</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">function add (...args) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    //求和</span></span>
<span class="line"><span style="color:#A6ACCD;">    return args.reduce((a, b) =&gt; a + b)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">function getSum (a,b,c) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return a+b+c</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let addCurry = currying(add)</span></span>
<span class="line"><span style="color:#A6ACCD;">let getSumCurry = currying(getSum)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(addCurry(1)(2)(3)(4, 5)())  //15</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(addCurry(1)(2)(3, 4, 5)())  //15</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(addCurry(1)(2, 3, 4, 5)())  //15</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(getSumCurry(1,2,3)()) // 6</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(getSumCurry(1)(2)(3)()) // 6</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(getSumCurry(1,2)(3)()) // 6</span></span></code></pre></div><h2 id="_26-柯里化-参数长度确定" tabindex="-1">26.柯里化-参数长度确定 <a class="header-anchor" href="#_26-柯里化-参数长度确定" aria-label="Permalink to &quot;26.柯里化-参数长度确定&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 参数长度固定</span></span>
<span class="line"><span style="color:#A6ACCD;">function curry (func) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return function curriedFn(...args) { // 使用剩余参数接收实参</span></span>
<span class="line"><span style="color:#A6ACCD;">        //  如果实参小于形参，递归执行(func.length: 传入函数的参数长度)</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (args.length &lt; func.length) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            return function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">                // argument 是再次调用的实参，需转换为数组然后拼接之前转为参数</span></span>
<span class="line"><span style="color:#A6ACCD;">                return curriedFn(...[...args, ...arguments])</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 如果实参等于形参直接执行</span></span>
<span class="line"><span style="color:#A6ACCD;">        return func(...args)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h2 id="_27-函数组合" tabindex="-1">27. 函数组合 <a class="header-anchor" href="#_27-函数组合" aria-label="Permalink to &quot;27. 函数组合&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function composeRight(...args) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return function(value) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        let res = value</span></span>
<span class="line"><span style="color:#A6ACCD;">        for (let i=args.length-1; i&gt;=0; i--) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            res = args[i](res)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        return res</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">function composeRightReduce(...args) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return function(value) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // reduce:对数组中的每一个元素执行提供的函数，并汇总成单个结果</span></span>
<span class="line"><span style="color:#A6ACCD;">        return args.reverse().reduce(function(acc,fn) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            return fn(acc)</span></span>
<span class="line"><span style="color:#A6ACCD;">        },value) // 把value作为acc的初始值</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const reverse = arr =&gt; arr.reverse()</span></span>
<span class="line"><span style="color:#A6ACCD;">const first = arr =&gt; arr[0]</span></span>
<span class="line"><span style="color:#A6ACCD;">const toUpper = s =&gt; s.toUpperCase()</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const f = composeRight(toUpper,first,reverse)</span></span>
<span class="line"><span style="color:#A6ACCD;">const fReduce = composeRightReduce(toUpper,first,reverse)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(f([&#39;one&#39;,&#39;two&#39;,&#39;three&#39;])) // THREE</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(fReduce([&#39;one&#39;,&#39;two&#39;,&#39;three&#39;])) // THREE</span></span></code></pre></div><h1 id="三、场景应用" tabindex="-1">三、场景应用 <a class="header-anchor" href="#三、场景应用" aria-label="Permalink to &quot;三、场景应用&quot;">​</a></h1><h2 id="_28-红蓝绿循环打印" tabindex="-1">28.红蓝绿循环打印 <a class="header-anchor" href="#_28-红蓝绿循环打印" aria-label="Permalink to &quot;28.红蓝绿循环打印&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function red() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;red&#39;);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">function green() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;green&#39;);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">function yellow() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;yellow&#39;);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">// 回调函数实现</span></span>
<span class="line"><span style="color:#A6ACCD;">const task = (wait, light, callback) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    setTimeout(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        switch (light) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            case &#39;red&#39;:</span></span>
<span class="line"><span style="color:#A6ACCD;">                red()</span></span>
<span class="line"><span style="color:#A6ACCD;">                break</span></span>
<span class="line"><span style="color:#A6ACCD;">            case &#39;green&#39;:</span></span>
<span class="line"><span style="color:#A6ACCD;">                green()</span></span>
<span class="line"><span style="color:#A6ACCD;">                break</span></span>
<span class="line"><span style="color:#A6ACCD;">            case &#39;yellow&#39;:</span></span>
<span class="line"><span style="color:#A6ACCD;">                yellow()</span></span>
<span class="line"><span style="color:#A6ACCD;">                break</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        callback()</span></span>
<span class="line"><span style="color:#A6ACCD;">    }, wait)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const step = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    task(3000, &#39;red&#39;, () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        task(2000, &#39;green&#39;, () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            task(1000, &#39;yellow&#39;, step)</span></span>
<span class="line"><span style="color:#A6ACCD;">        })</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">// step()</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// promise 实现</span></span>
<span class="line"><span style="color:#A6ACCD;">const taskPromise = (wait, light) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return new Promise (resolve =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        setTimeout(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            switch (light) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                case &#39;red&#39;:</span></span>
<span class="line"><span style="color:#A6ACCD;">                    red()</span></span>
<span class="line"><span style="color:#A6ACCD;">                    break</span></span>
<span class="line"><span style="color:#A6ACCD;">                case &#39;green&#39;:</span></span>
<span class="line"><span style="color:#A6ACCD;">                    green()</span></span>
<span class="line"><span style="color:#A6ACCD;">                    break</span></span>
<span class="line"><span style="color:#A6ACCD;">                case &#39;yellow&#39;:</span></span>
<span class="line"><span style="color:#A6ACCD;">                    yellow()</span></span>
<span class="line"><span style="color:#A6ACCD;">                    break</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">            resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">        }, wait)</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const setpPromise = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    taskPromise(3000, &#39;red&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">        .then(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            taskPromise(2000, &#39;green&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">        })</span></span>
<span class="line"><span style="color:#A6ACCD;">        .then(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            taskPromise(1000, &#39;yellow&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">        })</span></span>
<span class="line"><span style="color:#A6ACCD;">        .then(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            setpPromise()</span></span>
<span class="line"><span style="color:#A6ACCD;">        })</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">// setpPromise()</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const stepRunner = async () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    await taskPromise(3000, &#39;red&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    await taskPromise(2000, &#39;green&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    await taskPromise(1000, &#39;yellow&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    stepRunner()</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">stepRunner()</span></span></code></pre></div><h2 id="_29-间隔打印" tabindex="-1">29.间隔打印 <a class="header-anchor" href="#_29-间隔打印" aria-label="Permalink to &quot;29.间隔打印&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">for (let i=0; i&lt;5; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    setTimeout(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(i)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }, i * 1000)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h2 id="_30-es6创建类" tabindex="-1">30.ES6创建类 <a class="header-anchor" href="#_30-es6创建类" aria-label="Permalink to &quot;30.ES6创建类&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">class Employee {</span></span>
<span class="line"><span style="color:#A6ACCD;">    constructor (name, dept) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.name = name</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.dept = dept</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.age = 18</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 静态方法</span></span>
<span class="line"><span style="color:#A6ACCD;">    static fun () {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(&#39;static&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    getName () {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(this.name)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">Employee.fun() // static</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const well  = new Employee(&#39;well&#39;, &#39;dev&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(well) // Employee { name: &#39;well&#39;, dept: &#39;dev&#39;, age: 18 } </span></span>
<span class="line"><span style="color:#A6ACCD;">// well.fun() // well.fun is not a function</span></span>
<span class="line"><span style="color:#A6ACCD;">well.getName()</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// extends继承父类创建子类</span></span>
<span class="line"><span style="color:#A6ACCD;">class Manager extends Employee {</span></span>
<span class="line"><span style="color:#A6ACCD;">    constructor (name, dept, reports) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        super(name, dept)</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.reports = reports</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const wellManager = new Manager(&#39;wellManager&#39;, &#39;dev&#39;, 1)</span></span>
<span class="line"><span style="color:#A6ACCD;">Manager.fun() // static</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(wellManager) // Manager { name: &#39;wellManager&#39;, dept: &#39;dev&#39;, age: 18, reports: 1 } </span></span>
<span class="line"><span style="color:#A6ACCD;">wellManager.getName() // wellManager</span></span></code></pre></div><ul><li>constructor：构造函数，相当于ES5的构造函数，里面的this.×××的属性可以实例化给对象</li><li>static：静态属性，不会随着实例化给对象，但是可以通过extends继承。</li><li>非 static 方法可以随着实例化给对象。</li></ul><h2 id="_31-es5-创建类" tabindex="-1">31.ES5 创建类 <a class="header-anchor" href="#_31-es5-创建类" aria-label="Permalink to &quot;31.ES5 创建类&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function Employee (name, dept) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    this.name =  name</span></span>
<span class="line"><span style="color:#A6ACCD;">    this.dept = dept</span></span>
<span class="line"><span style="color:#A6ACCD;">    this.age = 18</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">// 静态方法</span></span>
<span class="line"><span style="color:#A6ACCD;">Employee.fun = function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;static&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">Employee.prototype.getName = function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(this.name)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const well = new Employee(&#39;well&#39;, &#39;dev&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(well) // Employee { name: &#39;well&#39;, dept: &#39;dev&#39;, age: 18 }</span></span>
<span class="line"><span style="color:#A6ACCD;">Employee.fun() // static</span></span>
<span class="line"><span style="color:#A6ACCD;">// well.fun() // Employee.fun is not a function</span></span>
<span class="line"><span style="color:#A6ACCD;">well.getName()</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 继承</span></span>
<span class="line"><span style="color:#A6ACCD;">function Manager(name, dept, reports) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 调用 Employee 函数，并把this执行Manger，所以完成了</span></span>
<span class="line"><span style="color:#A6ACCD;">    // this.name = name</span></span>
<span class="line"><span style="color:#A6ACCD;">    // this.dept = dept</span></span>
<span class="line"><span style="color:#A6ACCD;">    Employee.call(this, name, dept)</span></span>
<span class="line"><span style="color:#A6ACCD;">    this.reports = reports</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const wellManager = new Manager(&#39;wellManager&#39;, &#39;dev&#39;, 1)</span></span>
<span class="line"><span style="color:#A6ACCD;">// Manager.fun() // Manager.fun is not a function</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(wellManager) // Manager { name: &#39;wellManager&#39;, dept: &#39;dev&#39;, age: 18, reports: 1 } </span></span>
<span class="line"><span style="color:#A6ACCD;">// wellManager.getName() // wellManager.getName is not a function</span></span></code></pre></div><ul><li>静态属性添加</li><li>原型属性添加</li><li>继承实现 <ul><li>继承不了原型属性</li><li>继承不了静态属性</li></ul></li></ul>`,115),o=[p];function t(c,r,i,C,A,y){return n(),a("div",null,o)}const d=s(e,[["render",t]]);export{u as __pageData,d as default};
