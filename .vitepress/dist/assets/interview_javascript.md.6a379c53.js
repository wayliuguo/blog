import{_ as s,o as n,c as a,U as l}from"./chunks/framework.9adb0f96.js";const e="/blog/javascript/JavaScript.png",p="/blog/javascript/image-20220811013531668.png",o="/blog/javascript/1615475711487-c474af95-b5e0-4778-a90b-9484208d724d.png",u=JSON.parse('{"title":"一、数据类型","description":"","frontmatter":{},"headers":[],"relativePath":"interview/javascript.md","filePath":"interview/javascript.md","lastUpdated":1694064542000}'),c={name:"interview/javascript.md"},t=l('<p><img src="'+e+`" alt="JavaScript"></p><h1 id="一、数据类型" tabindex="-1">一、数据类型 <a class="header-anchor" href="#一、数据类型" aria-label="Permalink to &quot;一、数据类型&quot;">​</a></h1><h2 id="_1-数据类型" tabindex="-1">1.数据类型 <a class="header-anchor" href="#_1-数据类型" aria-label="Permalink to &quot;1.数据类型&quot;">​</a></h2><ul><li>基本数据类型 <ul><li>Undefined</li><li>Null</li><li>Boolean</li><li>Number</li><li>String</li><li>Symbol</li><li>BigInt</li></ul></li><li>引用数据类型 <ul><li>Object</li><li>Array</li></ul></li><li>两种类型的区别在与存储位置的不同 <ul><li>原始类型直接存储在栈中，占据空间小，大小固定，属于被频繁使用的数据，所以放入栈中存储。</li><li>引用类型存储在堆中，占据空间大，大小不固定。</li></ul></li></ul><h2 id="_2-数据类型检测的方式有哪些" tabindex="-1">2. 数据类型检测的方式有哪些 <a class="header-anchor" href="#_2-数据类型检测的方式有哪些" aria-label="Permalink to &quot;2. 数据类型检测的方式有哪些&quot;">​</a></h2><ul><li>typeof</li><li>instanceof</li><li>constructor</li><li>Object.prototype.toString.call()</li></ul><h3 id="_2-1-typeof" tabindex="-1">2.1 typeof <a class="header-anchor" href="#_2-1-typeof" aria-label="Permalink to &quot;2.1 typeof&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// typeof</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(typeof 2) // number</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(typeof true) // boolean</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(typeof &#39;str&#39;) // string</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(typeof undefined) // undefined</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(typeof Symbol(5)) // symbol</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(typeof BigInt(5)) // bigint</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(typeof function(){}) // function</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(typeof {}) //object</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(typeof []) //object</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(typeof null) //object</span></span></code></pre></div><ul><li>缺点：在判断 对象、数组、null时都是 object</li></ul><h3 id="_2-2-instanceof" tabindex="-1">2.2 instanceof <a class="header-anchor" href="#_2-2-instanceof" aria-label="Permalink to &quot;2.2 instanceof&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// instanceof</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(2 instanceof Number) // false</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log([] instanceof Array) // true</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(function(){} instanceof Function) // true</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log({} instanceof Object) // true</span></span></code></pre></div><ul><li>instanceof 只能判断引用类型数据类型，而不能判断基本数据类型</li><li>其内部运行机制是判断在其原型链中能否找到该类型的原型</li><li>可以用来测试一个对象在其原型链中是否存在一个构造函数的prototype属性</li></ul><h3 id="_2-3-constructor" tabindex="-1">2.3 constructor <a class="header-anchor" href="#_2-3-constructor" aria-label="Permalink to &quot;2.3 constructor&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">console.log((2).constructor === Number) // true</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log((true).constructor === Boolean) // true</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log((&#39;str&#39;).constructor === String) // true</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(([]).constructor === Array) // true</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log((function(){}).constructor === Function) // true</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(({}).constructor === Object) // true</span></span></code></pre></div><ul><li>constructor 有两个作用 <ul><li>判断数据的类型</li><li>对象实例通过constructor 对象访问它的构造函数</li></ul></li><li>缺点：如果创建一个对象来改变它的原型，constructor则不能用来判断数据类型了</li></ul><h3 id="_2-4-object-prototype-tostring-call" tabindex="-1">2.4 Object.prototype.toString.call() <a class="header-anchor" href="#_2-4-object-prototype-tostring-call" aria-label="Permalink to &quot;2.4 Object.prototype.toString.call()&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const ObString = Object.prototype.toString</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(ObString.call(2)) // [object Number]</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(ObString.call(true)) // [object Boolean]</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(ObString.call(&#39;str&#39;)) // [object String]</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(ObString.call([])) // [object Array]</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(ObString.call(function(){})) // [object Function]</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(ObString.call({})) // [object Object]</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(ObString.call(undefined)) // [object Undefined]</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(ObString.call(null)) // [object Null]</span></span></code></pre></div><p>同样是检测对象obj调用toString方法，obj.toString()的结果和Object.prototype.toString.call(obj)的结果不一样，这是为什么？</p><p>这是因为toString是Object的原型方法，而Array、function等<strong>类型作为Object的实例，都重写了toString方法</strong>。不同的对象类型调用toString方法时，根据原型链的知识，调用的是对应的重写之后的toString方法（function类型返回内容为函数体的字符串，Array类型返回元素组成的字符串…）。</p><h2 id="_3-判断数组的方式有哪些" tabindex="-1">3. 判断数组的方式有哪些？ <a class="header-anchor" href="#_3-判断数组的方式有哪些" aria-label="Permalink to &quot;3. 判断数组的方式有哪些？&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">console.log(Object.prototype.toString.call([]).slice(8,-1) === &#39;Array&#39;) // true</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log([].__proto__ === Array.prototype) // true</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(Array.isArray([])) // true</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log([] instanceof Array) // true</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(Array.prototype.isPrototypeOf([])) // true</span></span></code></pre></div><h2 id="_4-null-和-undefined-的区别" tabindex="-1">4. null 和 undefined 的区别？ <a class="header-anchor" href="#_4-null-和-undefined-的区别" aria-label="Permalink to &quot;4. null 和 undefined 的区别？&quot;">​</a></h2><ul><li><p>定义</p><ul><li>null：空对象</li><li>undefined: 未定义</li></ul></li><li><p>判断</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">null == undefined // true</span></span>
<span class="line"><span style="color:#A6ACCD;">null === undefined // false</span></span></code></pre></div></li></ul><h2 id="_5-typeof-null-的结果为什么是object" tabindex="-1">5. typeof null 的结果为什么是object？ <a class="header-anchor" href="#_5-typeof-null-的结果为什么是object" aria-label="Permalink to &quot;5. typeof null 的结果为什么是object？&quot;">​</a></h2><p>在 JavaScript 第一个版本中，所有值都存储在 32 位的单元中，每个单元包含一个小的 <strong>类型标签(1-3 bits)</strong> 以及当前要存储值的真实数据。类型标签存储在每个单元的低位中，共有五种数据类型</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">000: object   - 当前存储的数据指向一个对象。</span></span>
<span class="line"><span style="color:#A6ACCD;">  1: int      - 当前存储的数据是一个 31 位的有符号整数。</span></span>
<span class="line"><span style="color:#A6ACCD;">010: double   - 当前存储的数据指向一个双精度的浮点数。</span></span>
<span class="line"><span style="color:#A6ACCD;">100: string   - 当前存储的数据指向一个字符串。</span></span>
<span class="line"><span style="color:#A6ACCD;">110: boolean  - 当前存储的数据是布尔值。</span></span></code></pre></div><ul><li>null 的值是机器码 NULL 指针(null 指针的值全是 0)</li><li>就是说null的类型标签也是000，和Object的类型标签一样，所以会被判定为Object。</li></ul><h2 id="_6-instanceof-操作符的实现原理及实现" tabindex="-1">6. instanceof 操作符的实现原理及实现 <a class="header-anchor" href="#_6-instanceof-操作符的实现原理及实现" aria-label="Permalink to &quot;6. instanceof 操作符的实现原理及实现&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function myInstanceof (left, right) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 获取对象的原型</span></span>
<span class="line"><span style="color:#A6ACCD;">    let proto = Object.getPrototypeOf(left)</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 获取构造函数的 prototype 对象</span></span>
<span class="line"><span style="color:#A6ACCD;">    let prototype = right.prototype</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    // 判断构造函数的 prototype 对象是否在对象的原型链上</span></span>
<span class="line"><span style="color:#A6ACCD;">    while (true) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (!proto) return false</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (proto === prototype) return true</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 如果没有找到，就继续从其原型上找，Object.getPrototypeOf方法用来获取指定对象的原型</span></span>
<span class="line"><span style="color:#A6ACCD;">        proto = Object.getPrototypeOf(proto)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(myInstanceof(2, Number)) // true</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(myInstanceof([], Array)) // true</span></span></code></pre></div><h2 id="_7-typeof-nan的结果是什么" tabindex="-1">7.typeof NaN的结果是什么？ <a class="header-anchor" href="#_7-typeof-nan的结果是什么" aria-label="Permalink to &quot;7.typeof NaN的结果是什么？&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">typeof NaN // &#39;number&#39;</span></span></code></pre></div><h2 id="_8-object-is-与比较操作符-或-的区别" tabindex="-1">8. Object.is() 与比较操作符 “===” 或 “==”的区别？ <a class="header-anchor" href="#_8-object-is-与比较操作符-或-的区别" aria-label="Permalink to &quot;8. Object.is() 与比较操作符 “===” 或 “==”的区别？&quot;">​</a></h2><ul><li>使用双等号（==）进行相等判断时，如果两边的类型不一致，则会进行强制类型转化后再进行比较。</li><li>使用三等号（===）进行相等判断时，如果两边的类型不一致时，不会做强制类型准换，直接返回 false。</li><li>使用 Object.is 来进行相等判断时，一般情况下和三等号的判断相同，它处理了一些特殊的情况，比如 -0 和 +0 不再相等，两个 NaN 是相等的。</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">+0 === -0 // true</span></span>
<span class="line"><span style="color:#A6ACCD;">Object.is(+0, -0) // false</span></span></code></pre></div><h2 id="_9-什么是-javascript-中包装类型" tabindex="-1">9.什么是 JavaScript 中包装类型？ <a class="header-anchor" href="#_9-什么是-javascript-中包装类型" aria-label="Permalink to &quot;9.什么是 JavaScript 中包装类型？&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const a = &#39;abc&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">a.length; // 3</span></span>
<span class="line"><span style="color:#A6ACCD;">a.toUpperCase(); // &quot;ABC&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">Object(a) // String {&quot;abc&quot;}</span></span>
<span class="line"><span style="color:#A6ACCD;">Object(a).valueOf() // &#39;abc&#39;</span></span></code></pre></div><ul><li>在 JavaScript 中，基本类型是没有属性和方法的，但是为了便于操作基本类型的值，在调用基本类型的属性或方法时 JavaScript 会在后台隐式地将基本类型的值转换为对象。</li><li>在访问 a.length 时，JavaScript 将<code>&#39;abc&#39;</code>在后台转换成<code>String(&#39;abc&#39;)</code>，然后再访问其<code>length</code>属性</li><li>可以使用<code>Object</code>函数显式地将基本类型转换为包装类型</li><li>可以使用<code>valueOf</code>方法将包装类型倒转成基本类型</li></ul><h2 id="_10-object-assign和扩展运算法是深拷贝还是浅拷贝-两者区别" tabindex="-1">10.object.assign和扩展运算法是深拷贝还是浅拷贝，两者区别 <a class="header-anchor" href="#_10-object-assign和扩展运算法是深拷贝还是浅拷贝-两者区别" aria-label="Permalink to &quot;10.object.assign和扩展运算法是深拷贝还是浅拷贝，两者区别&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">let outObj = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    inObj: {a: 1, b: 2}</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let newObj = {...outObj}</span></span>
<span class="line"><span style="color:#A6ACCD;">let newObjAs = Object.assign({}, outObj)</span></span>
<span class="line"><span style="color:#A6ACCD;">newObj.inObj.a = 2</span></span>
<span class="line"><span style="color:#A6ACCD;">newObjAs.inObj.b = 5</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(outObj) // {inObj: {a: 2, b: 5}}</span></span></code></pre></div><ul><li>两者都是浅拷贝</li><li>Object.assign()方法接收的第一个参数作为目标对象，后面的所有参数作为源对象。然后把所有的源对象合并到目标对象中。它会修改了一个对象，因此会触发 ES6 setter。</li><li>扩展操作符（…）使用它时，数组或对象中的每一个值都会被拷贝到一个新的数组或对象中。它不复制继承的属性或类的属性，但是它会复制ES6的 symbols 属性。</li></ul><h2 id="_11-如何判断一个对象是空对象" tabindex="-1">11. 如何判断一个对象是空对象 <a class="header-anchor" href="#_11-如何判断一个对象是空对象" aria-label="Permalink to &quot;11. 如何判断一个对象是空对象&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 1.使用 JSON.stringify 方法来判断</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(JSON.stringify({}) === &#39;{}&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">// Object.keys()</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(Object.keys({})) // []</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(Object.keys({}).length) // 0</span></span></code></pre></div><h1 id="二、es6" tabindex="-1">二、ES6 <a class="header-anchor" href="#二、es6" aria-label="Permalink to &quot;二、ES6&quot;">​</a></h1><h2 id="_12-let、const、var的区别" tabindex="-1">12.let、const、var的区别 <a class="header-anchor" href="#_12-let、const、var的区别" aria-label="Permalink to &quot;12.let、const、var的区别&quot;">​</a></h2><p><img src="`+p+`" alt="image-20220811013531668"></p><h2 id="_13-const-对象的属性可以修改吗" tabindex="-1">13. const 对象的属性可以修改吗 <a class="header-anchor" href="#_13-const-对象的属性可以修改吗" aria-label="Permalink to &quot;13. const 对象的属性可以修改吗&quot;">​</a></h2><ul><li>const保证的并不是变量的值不能改，而是变量指向的那个内存地址不能改动。对于基本类型的数据（数值、字符串、布尔值），其值就保存在变量指向的那个内存地址，因此等同于常量。</li><li>但对于引用类型的数据（主要是对象和数组）来说，变量指向数据的内存地址，保存的只是一个指针，const只能保证这个指针是固定不变的，至于它指向的数据结构是不是可变的，就完全不能控制了。</li></ul><h2 id="_14-箭头函数与普通函数的区别" tabindex="-1">14. 箭头函数与普通函数的区别 <a class="header-anchor" href="#_14-箭头函数与普通函数的区别" aria-label="Permalink to &quot;14. 箭头函数与普通函数的区别&quot;">​</a></h2><ol><li><p><strong>箭头函数比普通函数更加简洁</strong></p></li><li><p><strong>箭头函数没有自己的this</strong></p><p>箭头函数不会创建自己的this， 所以它没有自己的this，它只会在自己作用域的上一层继承this。所以箭头函数中this的指向在它在定义时已经确定了，之后不会改变。</p></li><li><p><strong>箭头函数继承来的this指向永远不会改变</strong></p></li><li><p><strong>call()、apply()、bind()等方法不能改变箭头函数中this的指向</strong></p></li><li><p><strong>箭头函数不能作为构造函数使用</strong></p></li><li><p><strong>箭头函数没有自己的arguments</strong></p></li><li><p><strong>箭头函数没有prototype</strong></p></li><li><p><strong>箭头函数没有自己的arguments</strong></p></li></ol><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var id = &#39;GLOBAL&#39;;</span></span>
<span class="line"><span style="color:#A6ACCD;">var obj = {</span></span>
<span class="line"><span style="color:#A6ACCD;">  id: &#39;OBJ&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">  a: function(){</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(this.id);</span></span>
<span class="line"><span style="color:#A6ACCD;">  },</span></span>
<span class="line"><span style="color:#A6ACCD;">  b: () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(this.id);</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span>
<span class="line"><span style="color:#A6ACCD;">obj.a();    // &#39;OBJ&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">obj.b();    // &#39;GLOBAL&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">new obj.a()  // undefined</span></span>
<span class="line"><span style="color:#A6ACCD;">new obj.b()  // Uncaught TypeError: obj.b is not a constructor</span></span></code></pre></div><p>对象obj的方法b是使用箭头函数定义的，这个函数中的this就永远指向它定义时所处的全局执行环境中的this，即便这个函数是作为对象obj的方法调用，this依旧指向Window对象。需要注意，定义对象的大括号<code>{}</code>是无法形成一个单独的执行环境的，它依旧是处于全局执行环境中。</p><h2 id="_15-扩展运算符的作用及使用场景" tabindex="-1">15.扩展运算符的作用及使用场景 <a class="header-anchor" href="#_15-扩展运算符的作用及使用场景" aria-label="Permalink to &quot;15.扩展运算符的作用及使用场景&quot;">​</a></h2><h3 id="_15-1-对象扩展运算符" tabindex="-1">15.1 对象扩展运算符 <a class="header-anchor" href="#_15-1-对象扩展运算符" aria-label="Permalink to &quot;15.1 对象扩展运算符&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 对象的扩展运算符</span></span>
<span class="line"><span style="color:#A6ACCD;">let bar = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    a: 1,</span></span>
<span class="line"><span style="color:#A6ACCD;">    b: 2</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log({...bar})</span></span></code></pre></div><ul><li>用于取出参数对象中的所有<strong>可遍历属性</strong>，拷贝到当前对象之中。</li></ul><h3 id="_15-2-数组的扩展运算函数" tabindex="-1">15.2 数组的扩展运算函数 <a class="header-anchor" href="#_15-2-数组的扩展运算函数" aria-label="Permalink to &quot;15.2 数组的扩展运算函数&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 数组的扩展运算符</span></span>
<span class="line"><span style="color:#A6ACCD;">const arr = [1,2,3]</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(...arr) // 1,2,3</span></span></code></pre></div><ul><li>可以将一个数组<strong>转为用逗号分隔的参数序列</strong>，且每次只能展开一层数组</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 作用——复制数组</span></span>
<span class="line"><span style="color:#A6ACCD;">const arrCopy = [...arr]</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(arrCopy) // [ 1, 2, 3 ]</span></span>
<span class="line"><span style="color:#A6ACCD;">// 作用——合并数组</span></span>
<span class="line"><span style="color:#A6ACCD;">const arr1 = [&#39;one&#39;, &#39;two&#39;, ...arr]</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(arr1) // [ &#39;one&#39;, &#39;two&#39;, 1, 2, 3 ]</span></span>
<span class="line"><span style="color:#A6ACCD;">// 与解构赋值结合，用于生成数组</span></span>
<span class="line"><span style="color:#A6ACCD;">const [first, ...rest] = arr1</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(first) // one</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(rest) // [ &#39;two&#39;, 1, 2, 3 ]</span></span></code></pre></div><h2 id="_16-proxy-可以实现什么功能" tabindex="-1">16. Proxy 可以实现什么功能？ <a class="header-anchor" href="#_16-proxy-可以实现什么功能" aria-label="Permalink to &quot;16. Proxy 可以实现什么功能？&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">let p = new Proxy(target, handler)</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">/**</span></span>
<span class="line"><span style="color:#A6ACCD;"> * obj: 源对象</span></span>
<span class="line"><span style="color:#A6ACCD;"> * setBind: set回调</span></span>
<span class="line"><span style="color:#A6ACCD;"> * getLogger: get 回调</span></span>
<span class="line"><span style="color:#A6ACCD;"> */</span></span>
<span class="line"><span style="color:#A6ACCD;">let onWatch = (obj, setBind, getLogger) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let handler = {</span></span>
<span class="line"><span style="color:#A6ACCD;">        set (target, property, value, receiver) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            setBind(target, property, value, receiver)</span></span>
<span class="line"><span style="color:#A6ACCD;">            return Reflect.set(target, property, value)</span></span>
<span class="line"><span style="color:#A6ACCD;">        },</span></span>
<span class="line"><span style="color:#A6ACCD;">        get (target, property, receiver) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            getLogger(target, property, receiver)</span></span>
<span class="line"><span style="color:#A6ACCD;">            return Reflect.get(target, property, receiver)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return new Proxy(obj, handler)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">let obj = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    a: 1</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let p = onWatch(</span></span>
<span class="line"><span style="color:#A6ACCD;">    obj,</span></span>
<span class="line"><span style="color:#A6ACCD;">    (target, property, value, receiver) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(target, property, value, receiver) // { a: 1 } a 2 { a: 1 }</span></span>
<span class="line"><span style="color:#A6ACCD;">    },</span></span>
<span class="line"><span style="color:#A6ACCD;">    (target, property, receiver) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">       console.log(target, property, receiver) // { a: 2 } a { a: 2 }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">p.a = 2</span></span>
<span class="line"><span style="color:#A6ACCD;">p.a</span></span></code></pre></div><h2 id="_17-对象与数组的解构" tabindex="-1">17. 对象与数组的解构 <a class="header-anchor" href="#_17-对象与数组的解构" aria-label="Permalink to &quot;17. 对象与数组的解构&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 数组解构</span></span>
<span class="line"><span style="color:#A6ACCD;">const [a, b, c] = [1, 2, 3]</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 对象解构</span></span>
<span class="line"><span style="color:#A6ACCD;">const stu = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: &#39;well&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: 15</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const { name } = stu</span></span></code></pre></div><h2 id="_18-扩展运算符" tabindex="-1">18. 扩展运算符 <a class="header-anchor" href="#_18-扩展运算符" aria-label="Permalink to &quot;18. 扩展运算符&quot;">​</a></h2><p>扩展运算符被用在函数形参上时，<strong>它还可以把一个分离的参数序列整合成一个数组</strong></p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const mutiple = (...args) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let result = 1</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let value of args) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        result *= value</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return result</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(mutiple(1,2,3,4)) // 24</span></span></code></pre></div><h1 id="三、this-call-apply-bind" tabindex="-1">三、this/call/apply/bind <a class="header-anchor" href="#三、this-call-apply-bind" aria-label="Permalink to &quot;三、this/call/apply/bind&quot;">​</a></h1><h2 id="_19-对this-对象的理解" tabindex="-1">19. 对this 对象的理解 <a class="header-anchor" href="#_19-对this-对象的理解" aria-label="Permalink to &quot;19. 对this 对象的理解&quot;">​</a></h2><ul><li><p>this 是执行上下文中的一个属性，它指向最后一次调用这个方法的对象。</p></li><li><p>在实际开发中，this 的指向可以通过四种调用模式来判断。</p><ol><li>第一种是<strong>函数调用模式</strong>，当一个函数不是一个对象的属性时，直接作为函数来调用时，this 指向全局对象。</li><li>第二种是<strong>方法调用模式</strong>，如果一个函数作为一个对象的方法来调用时，this 指向这个对象。</li><li>第三种是<strong>构造器调用模式</strong>，如果一个函数用 new 调用时，函数执行前会新创建一个对象，this 指向这个新创建的对象。</li><li>第四种是 <strong>apply 、 call 和 bind 调用模式</strong>，这三个方法都可以显示的指定调用函数的 this 指向。</li></ol></li><li><p>apply、call、bind的区别？</p><ul><li>apply接收的是数组，call、bind接受的非数组。</li><li>bind 方法通过传入一个对象，返回一个 this 绑定了传入对象的新函数。这个函数的 this 指向除了使用 new 时会被改变，其他情况下都不会改变。</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">global.name = &#39;liuguowei&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">global.age = 18</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 函数调用模式</span></span>
<span class="line"><span style="color:#A6ACCD;">const sayName = function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return this.name</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(&#39;函数调用模式:&#39;, sayName()) // 函数调用模式: liuguowei</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 方法调用模式</span></span>
<span class="line"><span style="color:#A6ACCD;">const nameObj = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: &#39;well&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    sayName () {</span></span>
<span class="line"><span style="color:#A6ACCD;">        return this.name</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(&#39;方法调用模式:&#39;, nameObj.sayName()) // 方法调用模式: well</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 构造器调用模式 </span></span>
<span class="line"><span style="color:#A6ACCD;">function AgeFun (age) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    this.age = age</span></span>
<span class="line"><span style="color:#A6ACCD;">    this.sayAge = function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">        return this.age</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">} </span></span>
<span class="line"><span style="color:#A6ACCD;">const ageInstance = new AgeFun(25)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(&#39;构造器调用模式:&#39;, ageInstance.sayAge()) // 构造器调用模式: 25</span></span></code></pre></div></li></ul><h2 id="_20-apply、call、bind" tabindex="-1">20. apply、call、bind <a class="header-anchor" href="#_20-apply、call、bind" aria-label="Permalink to &quot;20. apply、call、bind&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const foo = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    a: 1,</span></span>
<span class="line"><span style="color:#A6ACCD;">    fn (x, y) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(this.a, x, y)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const obj = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    a: 10</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// apply</span></span>
<span class="line"><span style="color:#A6ACCD;">foo.fn.apply(obj, [2, 3]) // 10 2 3</span></span>
<span class="line"><span style="color:#A6ACCD;">// call</span></span>
<span class="line"><span style="color:#A6ACCD;">foo.fn.call(obj, 2, 3) // 10 2 3</span></span>
<span class="line"><span style="color:#A6ACCD;">// bind</span></span>
<span class="line"><span style="color:#A6ACCD;">foo.fn.bind(obj, 2, 3)() // 10 2 3</span></span></code></pre></div><h2 id="_21-call-函数的实现及步骤" tabindex="-1">21. call 函数的实现及步骤 <a class="header-anchor" href="#_21-call-函数的实现及步骤" aria-label="Permalink to &quot;21. call 函数的实现及步骤&quot;">​</a></h2><ol><li>判断调用对象是否为函数</li><li>获取参数</li><li>判断 context 是否传入，如果不传入则设置为 window</li><li>将函数设为此对象的方法（把调用函数作为传入对象的属性）</li><li>调用函数</li><li>返回结果</li></ol><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">Function.prototype.MyCall = function (context) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;this&gt;&gt;&gt;&#39;, this) // this&gt;&gt;&gt; [Function: log]</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 判断调用对象</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (typeof this !== &#39;function&#39;) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.error(&#39;type error&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 获取参数</span></span>
<span class="line"><span style="color:#A6ACCD;">    const args = [...arguments].slice(1)</span></span>
<span class="line"><span style="color:#A6ACCD;">    let result = null</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 判断 context 是否传入， 如果未传入则设置为window</span></span>
<span class="line"><span style="color:#A6ACCD;">    context = context || window</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 将调用函数设为此对象的方法</span></span>
<span class="line"><span style="color:#A6ACCD;">    context.fn = this</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 调用函数</span></span>
<span class="line"><span style="color:#A6ACCD;">    result = context.fn(...args)</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 将属性删除</span></span>
<span class="line"><span style="color:#A6ACCD;">    delete context.fn</span></span>
<span class="line"><span style="color:#A6ACCD;">    return result</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const foo = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    a: 1,</span></span>
<span class="line"><span style="color:#A6ACCD;">    log (x, y) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(this.a, x, y)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const obj = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    a: 10</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">foo.log.MyCall(obj, 5, 6) // 10, 5, 6</span></span></code></pre></div><h2 id="_22-apply-函数的实现" tabindex="-1">22. apply 函数的实现 <a class="header-anchor" href="#_22-apply-函数的实现" aria-label="Permalink to &quot;22. apply 函数的实现&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">Function.prototype.MyApply = function (context) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 判断调用对象是否为函数</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (typeof this !== &#39;function&#39;) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        throw new TypeError(&#39;Error&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    let result = null</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 判断 context 是否传入，如果为传入则设置window</span></span>
<span class="line"><span style="color:#A6ACCD;">    context = context || window</span></span>
<span class="line"><span style="color:#A6ACCD;">    context.fn = this</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 判断是否有传参</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (arguments[1]) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        result = context.fn(...arguments[1])</span></span>
<span class="line"><span style="color:#A6ACCD;">    } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">        result = context.fn()</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 将属性删除</span></span>
<span class="line"><span style="color:#A6ACCD;">    delete context.fn</span></span>
<span class="line"><span style="color:#A6ACCD;">    return result</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const foo = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    a: 1,</span></span>
<span class="line"><span style="color:#A6ACCD;">    log (x, y) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(this.a, x, y)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const obj = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    a: 10</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">foo.log.MyApply(obj, [5, 6]) // 10, 5, 6</span></span></code></pre></div><h2 id="_23-bind-函数的实现及步骤" tabindex="-1">23. bind 函数的实现及步骤 <a class="header-anchor" href="#_23-bind-函数的实现及步骤" aria-label="Permalink to &quot;23. bind 函数的实现及步骤&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">Function.prototype.myBind = function (context) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 判断调用对象是否为函数</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (typeof this !== &#39;function&#39;) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        throw new TypeError(&#39;Error&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 获取参数</span></span>
<span class="line"><span style="color:#A6ACCD;">    const args = [...arguments].slice(1)</span></span>
<span class="line"><span style="color:#A6ACCD;">    const fn = this</span></span>
<span class="line"><span style="color:#A6ACCD;">    return function Fn () {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 根据调用方式，传入不同绑定值</span></span>
<span class="line"><span style="color:#A6ACCD;">        return fn.apply(</span></span>
<span class="line"><span style="color:#A6ACCD;">            this instanceof Fn ? this : context,</span></span>
<span class="line"><span style="color:#A6ACCD;">            args.concat(...arguments)</span></span>
<span class="line"><span style="color:#A6ACCD;">        )</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const foo = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    a: 1,</span></span>
<span class="line"><span style="color:#A6ACCD;">    log (x, y) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(this.a, x, y)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const obj = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    a: 10</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">foo.log.myBind(obj, 5, 6)() // 10, 5, 6</span></span></code></pre></div><h1 id="四、原型与原型链" tabindex="-1">四、原型与原型链 <a class="header-anchor" href="#四、原型与原型链" aria-label="Permalink to &quot;四、原型与原型链&quot;">​</a></h1><h2 id="_24-对原型链的理解" tabindex="-1">24.对原型链的理解 <a class="header-anchor" href="#_24-对原型链的理解" aria-label="Permalink to &quot;24.对原型链的理解&quot;">​</a></h2><p>在JavaScript中是使用构造函数来新建一个对象的，每一个构造函数的内部都有一个 prototype 属性，它的属性值是一个对象，这个对象包含了可以由该构造函数的所有实例共享的属性和方法。当使用构造函数新建一个对象后，在这个对象的内部将包含一个指针，这个指针指向构造函数的 prototype 属性对应的值，在 ES5 中这个指针被称为对象的原型。一般来说不应该能够获取到这个值的，但是现在浏览器中都实现了 <strong>proto</strong> 属性来访问这个属性，但是最好不要使用这个属性，因为它不是规范中规定的。ES5 中新增了一个 Object.getPrototypeOf() 方法，可以通过这个方法来获取对象的原型。</p><p>当访问一个对象的属性时，如果这个对象内部不存在这个属性，那么它就会去它的原型对象里找这个属性，这个原型对象又会有自己的原型，于是就这样一直找下去，也就是原型链的概念。原型链的尽头一般来说都是 Object.prototype 所以这就是新建的对象为什么能够使用 toString() 等方法的原因。</p><p><img src="`+o+`" alt="img"></p><ul><li>每个构造函数都有一个prototype属性，其指向对象的原型。</li><li>对象的原型包含了可以由该构造函数的所有实例共享的属性和方法。而且其还有一个constructor 属性，其指向对应的构造函数。</li><li>通过构造函数实例化一个对象后，这个对象包含 一个指针<code>__proto__:非标准，由浏览器实现</code>，指向构造函数的 prototype 属性对应的值，即对象的原型。</li><li>原型链的尽头一般来说都是 Object.prototype(对象)来获取。</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;!DOCTYPE html&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;html lang=&quot;en&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;head&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;meta charset=&quot;UTF-8&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;meta http-equiv=&quot;X-UA-Compatible&quot; content=&quot;IE=edge&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;meta name=&quot;viewport&quot; content=&quot;width=device-width, initial-scale=1.0&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;title&gt;Document&lt;/title&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/head&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;body&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;script&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        function Person (age) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            this.age = age</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        const well = new Person(18)</span></span>
<span class="line"><span style="color:#A6ACCD;">        /**</span></span>
<span class="line"><span style="color:#A6ACCD;">         * {constructor: ƒ}</span></span>
<span class="line"><span style="color:#A6ACCD;">            constructor: ƒ Person(age)</span></span>
<span class="line"><span style="color:#A6ACCD;">            [[Prototype]]: Object</span></span>
<span class="line"><span style="color:#A6ACCD;">         */</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(Object.getPrototypeOf(well))</span></span>
<span class="line"><span style="color:#A6ACCD;">        /**</span></span>
<span class="line"><span style="color:#A6ACCD;">         * {constructor: ƒ}</span></span>
<span class="line"><span style="color:#A6ACCD;">            constructor: ƒ Person(age)</span></span>
<span class="line"><span style="color:#A6ACCD;">            [[Prototype]]: Object</span></span>
<span class="line"><span style="color:#A6ACCD;">         */</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(well.__proto__)</span></span>
<span class="line"><span style="color:#A6ACCD;">        /**</span></span>
<span class="line"><span style="color:#A6ACCD;">         * {constructor: ƒ}</span></span>
<span class="line"><span style="color:#A6ACCD;">            constructor: ƒ Person(age)</span></span>
<span class="line"><span style="color:#A6ACCD;">            [[Prototype]]: Object</span></span>
<span class="line"><span style="color:#A6ACCD;">         */</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(Person.prototype)</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;/script&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/body&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/html&gt;</span></span></code></pre></div><h2 id="_25-原型链指向" tabindex="-1">25. 原型链指向 <a class="header-anchor" href="#_25-原型链指向" aria-label="Permalink to &quot;25. 原型链指向&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;!DOCTYPE html&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;html lang=&quot;en&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;head&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;meta charset=&quot;UTF-8&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;meta http-equiv=&quot;X-UA-Compatible&quot; content=&quot;IE=edge&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;meta name=&quot;viewport&quot; content=&quot;width=device-width, initial-scale=1.0&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;title&gt;Document&lt;/title&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/head&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;body&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;script&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        function Person(name) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            this.name = name</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        const p = new Person(&#39;well&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(&#39;p.__proto__&gt;&gt;&gt;&#39;, p.__proto__) // // Person.prototype</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(&#39;p.__proto__.constructor&gt;&gt;&gt;&#39;, p.__proto__.constructor) // f Person(name)</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(&#39;Person.prototype.__proto__&gt;&gt;&gt;&#39;, Person.prototype.__proto__) // Object.prototype</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(&#39;p.__proto__.__proto__&gt;&gt;&gt;&#39;, p.__proto__.__proto__) // // Object.prototype</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(&#39;p.__proto__.constructor.prototype.__proto__&gt;&gt;&gt;&#39;, p.__proto__.constructor.prototype.__proto__) // Object.prototype</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(&#39;Person.prototype.constructor.prototype.__proto__&gt;&gt;&gt;&#39;, Person.prototype.constructor.prototype.__proto__) // Object.prototype</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(&#39;Person.prototype.constructor&gt;&gt;&gt;&#39;, Person.prototype.constructor) // f Person(name)</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;/script&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/body&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/html&gt;</span></span></code></pre></div><h2 id="_26-原型链的终点是什么-null" tabindex="-1">26.原型链的终点是什么？null <a class="header-anchor" href="#_26-原型链的终点是什么-null" aria-label="Permalink to &quot;26.原型链的终点是什么？null&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">console.log(Object.prototype.__proto__) //</span></span></code></pre></div><h2 id="_27-如何获得对象非原型链上的属性" tabindex="-1">27.如何获得对象非原型链上的属性？ <a class="header-anchor" href="#_27-如何获得对象非原型链上的属性" aria-label="Permalink to &quot;27.如何获得对象非原型链上的属性？&quot;">​</a></h2><p><strong><code>hasOwnProperty()</code></strong> 方法会返回一个布尔值，指示对象自身属性中是否具有指定的属性（也就是，是否有指定的键）。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function iterate(obj) {</span></span>
<span class="line"><span style="color:#A6ACCD;">	const res = []</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let key in obj) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    	if (obj.hasOwnProperty(key)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        	res.push(\`\${key}:\${obj[key]}\`)</span></span>
<span class="line"><span style="color:#A6ACCD;">         }</span></span>
<span class="line"><span style="color:#A6ACCD;">     }</span></span>
<span class="line"><span style="color:#A6ACCD;">     return res</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">function Person (name) {</span></span>
<span class="line"><span style="color:#A6ACCD;">	this.name = name</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(iterate(new Person(&#39;well&#39;))) // [&#39;name:well&#39;]</span></span></code></pre></div><h1 id="五、闭包、作用域链、执行上下文" tabindex="-1">五、闭包、作用域链、执行上下文 <a class="header-anchor" href="#五、闭包、作用域链、执行上下文" aria-label="Permalink to &quot;五、闭包、作用域链、执行上下文&quot;">​</a></h1><h2 id="_28-对闭包的理解" tabindex="-1">28. 对闭包的理解 <a class="header-anchor" href="#_28-对闭包的理解" aria-label="Permalink to &quot;28. 对闭包的理解&quot;">​</a></h2><ul><li><strong>闭包是指有权访问另一个函数作用域中变量的函数</strong></li><li>闭包有两个常用的用途： <ul><li>闭包的第一个用途是使我们在函数外部能够访问到函数内部的变量。通过使用闭包，可以通过在外部调用闭包函数，从而在外部访问到函数内部的变量，可以使用这种方法来创建私有变量。</li><li>闭包的另一个用途是使已经运行结束的函数上下文中的变量对象继续留在内存中，因为闭包函数保留了这个变量对象的引用，所以这个变量对象不会被回收。</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const name = &#39;well&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">const age = 25</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">function showName () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const name = &#39;liuguowei&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">    return function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">        return name</span></span>
<span class="line"><span style="color:#A6ACCD;">    } </span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(showName()()) // liuguowei</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">function myAge () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return age</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">function showAge (fn) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const age = 18</span></span>
<span class="line"><span style="color:#A6ACCD;">    return fn()</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(showAge(myAge)) // 25</span></span></code></pre></div><h2 id="_29-对作用域、作用域链的理解" tabindex="-1">29.对作用域、作用域链的理解 <a class="header-anchor" href="#_29-对作用域、作用域链的理解" aria-label="Permalink to &quot;29.对作用域、作用域链的理解&quot;">​</a></h2><ul><li>全局作用域 <ul><li>最外层函数和最外层函数外面定义的变量拥有全局作用域</li><li>所有未定义直接赋值的变量自动声明为全局作用域</li><li>所有window对象的属性拥有全局作用域</li><li>全局作用域有很大的弊端，过多的全局作用域变量会污染全局命名空间，容易引起命名冲突。</li></ul></li><li>函数作用域 <ul><li>函数作用域声明在函数内部的变零，一般只有固定的代码片段可以访问到</li><li>作用域是分层的，内层作用域可以访问外层作用域，反之不行</li></ul></li><li>块级作用域 <ul><li>使用ES6中新增的let和const指令可以声明块级作用域，块级作用域可以在函数中创建也可以在一个代码块中的创建（由<code>{ }</code>包裹的代码片段）</li><li>let和const声明的变量不会有变量提升，也不可以重复声明</li><li>在循环中比较适合绑定块级作用域，这样就可以把声明的计数器变量限制在循环内部。</li></ul></li></ul><h2 id="_30-对执行上下文的理解" tabindex="-1">30.对执行上下文的理解 <a class="header-anchor" href="#_30-对执行上下文的理解" aria-label="Permalink to &quot;30.对执行上下文的理解&quot;">​</a></h2><ul><li><p>执行上下文类型</p><ul><li><p><strong>全局执行上下文</strong></p><p>任何不在函数内部的都是全局执行上下文，它首先会创建一个全局的window对象，并且设置this的值等于这个全局对象，一个程序中只有一个全局执行上下文。</p></li><li><p><strong>函数执行上下文</strong></p><p>当一个函数被调用时，就会为该函数创建一个新的执行上下文，函数的上下文可以有任意多个。</p></li><li><p><strong>eval函数执行上下文</strong></p><p>执行在eval函数中的代码会有属于他自己的执行上下文，不过eval函数不常使用。</p></li></ul></li><li><p>执行上下文栈</p><ul><li>JavaScript引擎使用执行上下文栈来管理执行上下文</li><li>当JavaScript执行代码时，首先遇到全局代码，会创建一个全局执行上下文并且压入执行栈中，每当遇到一个函数调用，就会为该函数创建一个新的执行上下文并压入栈顶，引擎会执行位于执行上下文栈顶的函数，当函数执行完成之后，执行上下文从栈中弹出，继续执行下一个上下文。当所有的代码都执行完毕之后，从栈中弹出全局执行上下文。</li></ul></li></ul><h1 id="六、javascript-基础" tabindex="-1">六、JavaScript 基础 <a class="header-anchor" href="#六、javascript-基础" aria-label="Permalink to &quot;六、JavaScript 基础&quot;">​</a></h1><h2 id="_31-new-操作符的实现原理" tabindex="-1">31. new 操作符的实现原理 <a class="header-anchor" href="#_31-new-操作符的实现原理" aria-label="Permalink to &quot;31. new 操作符的实现原理&quot;">​</a></h2><p><strong>new 操作符的执行过程</strong></p><ul><li>首先创建一个新的空对象</li><li>设置原型，将对象的原型设置为函数的prototype 对象。（实例的原型执行构造函数的原型）</li><li>让函数的this指向这个对象，执行构造函数的代码（为这个新对象添加属性）</li><li>判断函数的返回值类型，如果是值类型，返回创建的对象。如果是引用类型，就返回这个引用类型的对象。</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function objectFactory () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 声明要创建的对象</span></span>
<span class="line"><span style="color:#A6ACCD;">    let newObject = null</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 取出构造函数</span></span>
<span class="line"><span style="color:#A6ACCD;">    let constructor = Array.prototype.shift.call(arguments)</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;constructor&gt;&gt;&gt;&#39;, constructor) // constructor&gt;&gt;&gt; [Function: Person]</span></span>
<span class="line"><span style="color:#A6ACCD;">    let result = null</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 判断参数是否是函数</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (typeof constructor !== &#39;function&#39;) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        throw TypeError(&#39;error&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 新建一个空对象，对象的原型为构造函数的 prototype 对象</span></span>
<span class="line"><span style="color:#A6ACCD;">    newObject = Object.create(constructor.prototype)</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;newObject&gt;&gt;&gt;&#39;, newObject) // newObject&gt;&gt;&gt; Person {}</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 将 this 指向新建对象，并指向函数</span></span>
<span class="line"><span style="color:#A6ACCD;">    result = constructor.apply(newObject, arguments)</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;result&gt;&gt;&gt;&#39;, result)</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;newObject&gt;&gt;&gt;&#39;, newObject) // newObject&gt;&gt;&gt; Person { name: &#39;well&#39;, age: 18 }</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 判断返回对象</span></span>
<span class="line"><span style="color:#A6ACCD;">    let flag = result &amp;&amp; (typeof result === &#39;object&#39; || typeof result === &#39;function&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 判断返回结果</span></span>
<span class="line"><span style="color:#A6ACCD;">    return flag ? result : newObject</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">function Person (name, age) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    this.name = name</span></span>
<span class="line"><span style="color:#A6ACCD;">    this.age = age</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const well = objectFactory(Person, &#39;well&#39;, 18)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(well.name)</span></span></code></pre></div><h2 id="_32-map" tabindex="-1">32.map <a class="header-anchor" href="#_32-map" aria-label="Permalink to &quot;32.map&quot;">​</a></h2><h3 id="_1-map-与-object-的区别" tabindex="-1">1. Map 与 object 的区别？ <a class="header-anchor" href="#_1-map-与-object-的区别" aria-label="Permalink to &quot;1. Map 与 object 的区别？&quot;">​</a></h3><table><thead><tr><th></th><th>Map</th><th>Object</th></tr></thead><tbody><tr><td>意外的键</td><td>Map默认情况不包含任何键，只包含显式插入的键。</td><td>Object 有一个原型, 原型链上的键名有可能和自己在对象上的设置的键名产生冲突。</td></tr><tr><td>键的类型</td><td>Map的键可以是任意值，包括函数、对象或任意基本类型。</td><td>Object 的键必须是 String 或是Symbol。</td></tr><tr><td>键的顺序</td><td>Map 中的 key 是有序的。因此，当迭代的时候， Map 对象以插入的顺序返回键值。</td><td>Object 的键是无序的</td></tr><tr><td>Size</td><td>Map 的键值对个数可以轻易地通过size 属性获取</td><td>Object 的键值对个数只能手动计算</td></tr><tr><td>迭代</td><td>Map 是 iterable 的，所以可以直接被迭代。</td><td>迭代Object需要以某种方式获取它的键然后才能迭代。</td></tr><tr><td>性能</td><td>在频繁增删键值对的场景下表现更好。</td><td>在频繁添加和删除键值对的场景下未作出优化。</td></tr></tbody></table><h3 id="_2-map" tabindex="-1">2. Map <a class="header-anchor" href="#_2-map" aria-label="Permalink to &quot;2. Map&quot;">​</a></h3><ul><li><strong>size</strong>： <code>map.size</code> 返回Map结构的成员总数。</li><li><strong>set(key,value)</strong>：设置键名key对应的键值value，然后返回整个Map结构，如果key已经有值，则键值会被更新，否则就新生成该键。（因为返回的是当前Map对象，所以可以链式调用）</li><li><strong>has(key)</strong>：该方法返回一个布尔值，表示某个键是否在当前Map对象中。</li><li><strong>delete(key)</strong>：该方法删除某个键，返回true，如果删除失败，返回false。</li><li><strong>clear()</strong>：map.clear()清除所有成员，没有返回值。</li><li><strong>keys()</strong>：返回键名的遍历器。</li><li><strong>values()</strong>：返回键值的遍历器。</li><li><strong>entries()</strong>：返回所有成员的遍历器。</li><li><strong>forEach()</strong>：遍历Map的所有成员。</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const map = new Map()</span></span>
<span class="line"><span style="color:#A6ACCD;">// map.set(key, value)</span></span>
<span class="line"><span style="color:#A6ACCD;">map.set(&#39;a&#39;, 1).set({a: 1}, 2)</span></span>
<span class="line"><span style="color:#A6ACCD;">// map.get(key)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(map.get(&#39;a&#39;)) // 1</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(map.size) // 2</span></span>
<span class="line"><span style="color:#A6ACCD;">// map.has(key)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(map.has(&#39;a&#39;)) // true</span></span>
<span class="line"><span style="color:#A6ACCD;">// map.delete(key)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(map.delete(&#39;a&#39;)) // true</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(map) // Map(1) { { a: 1 } =&gt; 2 }</span></span>
<span class="line"><span style="color:#A6ACCD;">// map.clear()</span></span>
<span class="line"><span style="color:#A6ACCD;">map.clear()</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(map) // Map(0) {}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 验证遍历器</span></span>
<span class="line"><span style="color:#A6ACCD;">map.set(&#39;foo&#39;, 1).set(&#39;bar&#39;, 2)</span></span>
<span class="line"><span style="color:#A6ACCD;">for(let key of map.keys()){</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(key);  // foo bar</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">for(let value of map.values()){</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(value); // 1 2</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">for(let items of map.entries()){</span></span>
<span class="line"><span style="color:#A6ACCD;">   console.log(items);  // [&quot;foo&quot;,1]  [&quot;bar&quot;,2]</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">map.forEach( (value,key,map) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(key,value); // foo 1    bar 2</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span></code></pre></div><h3 id="_3-weakmap" tabindex="-1">3.WeakMap <a class="header-anchor" href="#_3-weakmap" aria-label="Permalink to &quot;3.WeakMap&quot;">​</a></h3><ul><li><strong>set(key,value)</strong>：设置键名key对应的键值value，然后返回整个Map结构，如果key已经有值，则键值会被更新，否则就新生成该键。（因为返回的是当前Map对象，所以可以链式调用）</li><li><strong>get(key)</strong>：该方法读取key对应的键值，如果找不到key，返回undefined。</li><li><strong>has(key)</strong>：该方法返回一个布尔值，表示某个键是否在当前Map对象中。</li><li><strong>delete(key)</strong>：该方法删除某个键，返回true，如果删除失败，返回false。</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const weakmap = new WeakMap()</span></span>
<span class="line"><span style="color:#A6ACCD;">const a = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    a: 1</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const b = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    b: 2</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">weakmap.set(a, 1).set(b, 2)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(weakmap) // WeakMap { &lt;items unknown&gt; }</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(weakmap.get(a)) // 1</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(weakmap.has(a)) // true</span></span>
<span class="line"><span style="color:#A6ACCD;">weakmap.delete(a)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(weakmap.has(a)) // false</span></span></code></pre></div><ul><li>Map 数据结构。它类似于对象，也是键值对的集合，但是“键”的范围不限于字符串，各种类型的值（包括对象）都可以当作键。</li><li>WeakMap 结构与 Map 结构类似，也是用于生成键值对的集合。但是 WeakMap 只接受对象作为键名（ null 除外），不接受其他类型的值作为键名。而且 WeakMap 的键名所指向的对象，不计入垃圾回收机制。</li></ul><h2 id="_33-为什么函数的-arguments-参数是类数组而不是数组-如果遍历类数组" tabindex="-1">33. 为什么函数的 arguments 参数是类数组而不是数组？如果遍历类数组 <a class="header-anchor" href="#_33-为什么函数的-arguments-参数是类数组而不是数组-如果遍历类数组" aria-label="Permalink to &quot;33. 为什么函数的 arguments 参数是类数组而不是数组？如果遍历类数组&quot;">​</a></h2><p><code>arguments</code>是一个对象，它的属性是从 0 开始依次递增的数字，还有<code>callee</code>和<code>length</code>等属性，与数组相似；但是它却没有数组常见的方法属性，如<code>forEach</code>, <code>reduce</code>等，所以叫它们类数组。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function foo () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    Array.prototype.forEach.call(arguments, a=&gt; console.log(a)) // 1 2 3 4 5</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">function foo1 () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const arrArgs = Array.from(arguments)</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(arrArgs) // [ 1, 2, 3, 4, 5 ]</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">function foo2 () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const arrArgs = [...arguments]</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(arrArgs) // [ 1, 2, 3, 4, 5 ]</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">foo(1,2,3,4,5)</span></span>
<span class="line"><span style="color:#A6ACCD;">foo1(1,2,3,4,5)</span></span>
<span class="line"><span style="color:#A6ACCD;">foo2(1,2,3,4,5)</span></span></code></pre></div><h2 id="_34-xmlhttprequest" tabindex="-1">34. XMLHttpRequest <a class="header-anchor" href="#_34-xmlhttprequest" aria-label="Permalink to &quot;34. XMLHttpRequest&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const SERVER_URL = &#39;http://localhost:3000/todos&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">const xhr = new XMLHttpRequest()</span></span>
<span class="line"><span style="color:#A6ACCD;">// 创建 Http 请求</span></span>
<span class="line"><span style="color:#A6ACCD;">xhr.open(&#39;GET&#39;, SERVER_URL, true)</span></span>
<span class="line"><span style="color:#A6ACCD;">// 设置状态监听函数</span></span>
<span class="line"><span style="color:#A6ACCD;">xhr.onreadystatechange = function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (this.readyState !== 4) return</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 当请求成功时</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (this.status === 200) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(this.response)</span></span>
<span class="line"><span style="color:#A6ACCD;">    } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.error(this.statusText)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">// 设置请求失败时的监听函数</span></span>
<span class="line"><span style="color:#A6ACCD;">xhr.onerror = function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">	console.error(this.statusText)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">// 设置请求头信息</span></span>
<span class="line"><span style="color:#A6ACCD;">xhr.responseType = &#39;json&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">xhr.setRequestHeader(&#39;Accept&#39;, &#39;application/json&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">xhr.send()</span></span></code></pre></div><h2 id="_35-xmlhttprequest-promise" tabindex="-1">35 XMLHttpRequest Promise <a class="header-anchor" href="#_35-xmlhttprequest-promise" aria-label="Permalink to &quot;35 XMLHttpRequest Promise&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function getJSON (url) {</span></span>
<span class="line"><span style="color:#A6ACCD;">	let promise = new Promise(function (resolve, reject) {</span></span>
<span class="line"><span style="color:#A6ACCD;">		const xhr = new XMLHttpRequest()</span></span>
<span class="line"><span style="color:#A6ACCD;">		// 创建 Http 请求</span></span>
<span class="line"><span style="color:#A6ACCD;">		xhr.open(&#39;GET&#39;, url, true)</span></span>
<span class="line"><span style="color:#A6ACCD;">		// 设置状态监听函数</span></span>
<span class="line"><span style="color:#A6ACCD;">		xhr.onreadystatechange = function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (this.readyState !== 4) return</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 当请求成功时</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (this.status === 200) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                resolve(this.response)</span></span>
<span class="line"><span style="color:#A6ACCD;">            } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">                reject(new Error(this.statusText))</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 设置请求失败时的监听函数</span></span>
<span class="line"><span style="color:#A6ACCD;">        xhr.onerror = function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">            reject(new Error(this.statusText))</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 设置请求头信息</span></span>
<span class="line"><span style="color:#A6ACCD;">        xhr.responseType = &#39;json&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">        xhr.setRequestHeader(&#39;Accept&#39;, &#39;application/json&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">        xhr.send()</span></span>
<span class="line"><span style="color:#A6ACCD;">	})</span></span>
<span class="line"><span style="color:#A6ACCD;">	return promise</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const SERVER_URL = &#39;http://localhost:3000/todos&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">getJSON(SERVER_URL)</span></span></code></pre></div><h1 id="七、异步编程" tabindex="-1">七、异步编程 <a class="header-anchor" href="#七、异步编程" aria-label="Permalink to &quot;七、异步编程&quot;">​</a></h1><h2 id="_36-对-promise-的理解" tabindex="-1">36.对 Promise 的理解 <a class="header-anchor" href="#_36-对-promise-的理解" aria-label="Permalink to &quot;36.对 Promise 的理解&quot;">​</a></h2><p>Promise是异步编程的一种解决方案，它是一个对象，可以获取异步操作的消。</p><ul><li>Promise 实例有三个状态 <ul><li>Pendding (进行中)</li><li>Resolved(已完成)</li><li>Rejected(已拒绝)</li><li>当把一件事交给promise时，它的状态就是 Pending，任务完成了状态就成了Resolved，失败就成了Rejected。</li></ul></li><li>Promise的实例有两个过程 <ul><li>pending -&gt; fulfilled: Resolved(已完成)</li><li>pending -&gt; rejected: Rejected(已拒绝)</li><li>注意：旦从进行状态变成为其他状态就永远不能更改状态了。</li></ul></li><li>Promise 的缺点 <ul><li>无法取消 Promise，旦新建它就会立即执行，无法中途取消</li><li>旦新建它就会立即执行，无法中途取消</li><li>当处于pending状态时，无法得知目前进展到哪一个阶段（刚刚开始还是即将完成）。</li></ul></li></ul><h2 id="_37-promise-的-基本用法" tabindex="-1">37.Promise 的 基本用法 <a class="header-anchor" href="#_37-promise-的-基本用法" aria-label="Permalink to &quot;37.Promise 的 基本用法&quot;">​</a></h2><ul><li><p>then、catch、finally</p></li><li><p>all：全部resolve 才 执行then，否则执行 catch</p></li><li><p>race：“竞赛”，最先resolve的作为then，使用场景：当一件事超过一定时间就不做了</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">Promise.race([promise1,timeOutPromise(5000)]).then(res=&gt;{})</span></span></code></pre></div></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// new Promise() promise.then() promise.catch</span></span>
<span class="line"><span style="color:#A6ACCD;">function getData (success) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return new Promise((resolve, reject) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        setTimeout(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (success) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                resolve(1)</span></span>
<span class="line"><span style="color:#A6ACCD;">            } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">                reject(0)</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        })</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">getData(1).then((res) =&gt; console.log(&#39;promise.then()&gt;&gt;&gt;&#39;, res)) // promise.then()&gt;&gt;&gt; 1</span></span>
<span class="line"><span style="color:#A6ACCD;">getData().then((res) =&gt; console.log(res)).catch(err =&gt; console.log(&#39;promise.catch()&gt;&gt;&gt;&#39;, err)) // promise.catch()&gt;&gt;&gt; 0</span></span>
<span class="line"><span style="color:#A6ACCD;">// promise.all()、 promise.race()</span></span>
<span class="line"><span style="color:#A6ACCD;">let promise1 = new Promise((resolve,reject)=&gt;{</span></span>
<span class="line"><span style="color:#A6ACCD;">	setTimeout(()=&gt;{</span></span>
<span class="line"><span style="color:#A6ACCD;">       resolve(1);</span></span>
<span class="line"><span style="color:#A6ACCD;">	},2000)</span></span>
<span class="line"><span style="color:#A6ACCD;">});</span></span>
<span class="line"><span style="color:#A6ACCD;">let promise2 = new Promise((resolve,reject)=&gt;{</span></span>
<span class="line"><span style="color:#A6ACCD;">	setTimeout(()=&gt;{</span></span>
<span class="line"><span style="color:#A6ACCD;">       resolve(2);</span></span>
<span class="line"><span style="color:#A6ACCD;">	},1000)</span></span>
<span class="line"><span style="color:#A6ACCD;">});</span></span>
<span class="line"><span style="color:#A6ACCD;">let promise3 = new Promise((resolve,reject)=&gt;{</span></span>
<span class="line"><span style="color:#A6ACCD;">	setTimeout(()=&gt;{</span></span>
<span class="line"><span style="color:#A6ACCD;">       resolve(3);</span></span>
<span class="line"><span style="color:#A6ACCD;">	},3000)</span></span>
<span class="line"><span style="color:#A6ACCD;">});</span></span>
<span class="line"><span style="color:#A6ACCD;">Promise.all([promise1,promise2,promise3]).then(res=&gt;{</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;promise.all&gt;&gt;&gt;&#39;, res); // promise.all&gt;&gt;&gt; [ 1, 2, 3 ]</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;">Promise.race([promise1,promise2,promise3]).then(res=&gt;{</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;promise.race&gt;&gt;&gt;&#39;, res); // promise.race&gt;&gt;&gt; 2</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span></code></pre></div><h2 id="_38-async-await" tabindex="-1">38. async &amp; await <a class="header-anchor" href="#_38-async-await" aria-label="Permalink to &quot;38. async &amp; await&quot;">​</a></h2><h3 id="_1-async-函数" tabindex="-1">1. async 函数 <a class="header-anchor" href="#_1-async-函数" aria-label="Permalink to &quot;1. async 函数&quot;">​</a></h3><ul><li>async 函数返回的是一个 Promise 对象。</li><li>联想一下Promise 的特点——无等待，所以在没有await 的情况下执行 async 函数，它会立即执行，返回一个Promise 对象，绝不会阻塞后面的语句。</li><li>async 的返回值会作为：Promise.resolve(返回值)，如果没有返回值则相当于：Promise.resolve(undefined)</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// async 返回的是什么？</span></span>
<span class="line"><span style="color:#A6ACCD;">const testAsync = async () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return &#39;hello world&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">let result = testAsync()</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(&#39;async 返回值&gt;&gt;&gt;&#39;, result) // Promise { &#39;hello world&#39; }</span></span>
<span class="line"><span style="color:#A6ACCD;">result.then(res =&gt; console.log(res)) // hello world</span></span></code></pre></div><h3 id="_2-await-在等待什么" tabindex="-1">2.await 在等待什么？ <a class="header-anchor" href="#_2-await-在等待什么" aria-label="Permalink to &quot;2.await 在等待什么？&quot;">​</a></h3><ul><li>await 等待的是一个表达式，这个表达式的计算结果是Promise对象或者其他值（即没有特殊限定）</li><li>如果它等到不是一个Promise对象，那么 await 表达式的运算结果就是它等到的东西</li><li>如果它等到的是一个Promise对象，await 就忙起来了，它会阻塞后面的代码，等着 Promise 对象 resolve，然后得到 resolve 的值，作为 await 表达式的运算结果。</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// await 在等待什么？</span></span>
<span class="line"><span style="color:#A6ACCD;">function getSomething () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;await 会阻塞后面的代码，执行外面的同步代码&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    return &#39;something&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">async function asyncFn () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return new Promise(resolve =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        setTimeout(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            resolve(&#39;hello async&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }, 3000)</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">async function test () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const v1 = await getSomething()</span></span>
<span class="line"><span style="color:#A6ACCD;">    const v2 = await asyncFn()</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;await 等到非Promise&gt;&gt;&gt;&#39;, v1) // await 等到非Promise&gt;&gt;&gt; something</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;await 等到Promise&gt;&gt;&gt;&#39;, v2) // await 等到Promise&gt;&gt;&gt; hello async</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">test()</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(&#39;不在async 函数里的不会被阻塞&#39;) // 不在async 函数里的不会被阻塞</span></span></code></pre></div><p><strong>输出顺序</strong></p><ul><li><p>await 会阻塞后面的代码，执行外面的同步代码</p></li><li><p>不在async 函数里的不会被阻塞</p></li><li><p>await 等到非Promise&gt;&gt;&gt; something</p></li><li><p>await 等到Promise&gt;&gt;&gt; hello async</p></li></ul><p><strong>遇到await会阻塞后面的代码，先执行async外面的同步代码，同步代码执行完，再回到async内部，继续执行await后面的代码。</strong></p><p><strong>await 后面的代码进入了微任务队列</strong></p><ol><li>先进入 test()函数，进入getSomething, 打印<strong>await 会阻塞后面的代码，执行外面的同步代码</strong></li><li>阻塞后面的代码，执行async外面的代码，打印<strong>不在async 函数里的不会被阻塞</strong></li><li>......</li></ol><h3 id="_3-深刻理解await" tabindex="-1">3.深刻理解await <a class="header-anchor" href="#_3-深刻理解await" aria-label="Permalink to &quot;3.深刻理解await&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function sumTimeOUt  (a,b) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(&#39;timeoutStart&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">  setTimeout(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;timeoutEnd&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    return a + b</span></span>
<span class="line"><span style="color:#A6ACCD;">  })</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">async function testAsync () {</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(&#39;start&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">  const ret = await sumTimeOUt(1,2)</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(ret)</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(&#39;await end&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">testAsync()</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(&#39;end&#39;)</span></span></code></pre></div><ul><li>start</li><li>timeoutStart</li><li>end</li><li>undefined</li><li>await end</li><li>timeoutEnd</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function sumTimeOUt  (a,b) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(&#39;timeoutStart&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">  return new Promise(resolve =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    setTimeout(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">      console.log(&#39;timeoutEnd&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">      resolve(a+b)</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">  })</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">async function testAsync () {</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(&#39;start&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">  const ret = await sumTimeOUt(1,2)</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(ret)</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(&#39;await end&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">testAsync()</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(&#39;end&#39;)</span></span></code></pre></div><ul><li>start</li><li>timeoutStart</li><li>end</li><li>timeoutEnd</li><li>3</li><li>await end</li></ul><p><strong>结论：</strong></p><ul><li>如果它等到的不是一个 Promise 对象，那 await 表达式的运算结果就是它等到的东西。</li><li>如果它等到的是一个 Promise 对象，await 就忙起来了，它会阻塞后面的代码，等着 Promise 对象 resolve，然后得到 resolve 的值，作为 await 表达式的运算结果。</li></ul><h2 id="_39-async-await-魔鬼细节" tabindex="-1">39.async await 魔鬼细节 <a class="header-anchor" href="#_39-async-await-魔鬼细节" aria-label="Permalink to &quot;39.async await 魔鬼细节&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">async function async1 () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    await new Promise((resolve, reject) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;A&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">async1()</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">new Promise((resolve) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;B&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">}).then(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;C&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">}).then(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;D&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// B A C D</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">async function async1 () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    await async2()</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;A&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">async function async2 () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return new Promise((resolve, reject) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">async1()</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">new Promise((resolve) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;B&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">}).then(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;C&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">}).then(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;D&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// B C D A</span></span></code></pre></div><h3 id="async-函数返回值" tabindex="-1">async 函数返回值 <a class="header-anchor" href="#async-函数返回值" aria-label="Permalink to &quot;async 函数返回值&quot;">​</a></h3><p>在讨论 <code>await</code> 之前，先聊一下 <code>async</code> 函数处理返回值的问题，它会像 <code>Promise.prototype.then</code> 一样，会对返回值的类型进行辨识。</p><p><strong>根据返回值的类型，引起 <code>js引擎</code> 对返回值处理方式的不同</strong></p><p><strong>结论：</strong><code>async</code>函数在抛出返回值时，会根据返回值<strong>类型</strong>开启<strong>不同数目的微任务</strong></p><ul><li>return结果值：非<code>thenable</code>、非<code>promise</code>（不等待）</li><li>return结果值：<code>thenable</code>（等待 1个<code>then</code>的时间）</li><li>return结果值：<code>promise</code>（等待 2个<code>then</code>的时间）</li></ul><h4 id="非thenable、非promise-不等待" tabindex="-1">非<code>thenable</code>、非<code>promise</code>（不等待） <a class="header-anchor" href="#非thenable、非promise-不等待" aria-label="Permalink to &quot;非\`thenable\`、非\`promise\`（不等待）&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">async function testA () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return 1;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">testA().then(() =&gt; console.log(1));</span></span>
<span class="line"><span style="color:#A6ACCD;">Promise.resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(2))</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(3));</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// (不等待)最终结果👉: 1 2 3</span></span></code></pre></div><h4 id="thenable-等待-1个then的时间" tabindex="-1"><code>thenable</code>（等待 1个<code>then</code>的时间） <a class="header-anchor" href="#thenable-等待-1个then的时间" aria-label="Permalink to &quot;\`thenable\`（等待 1个\`then\`的时间）&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">async function testB () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return {</span></span>
<span class="line"><span style="color:#A6ACCD;">        then (cb) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            cb();</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    };</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">testB().then(() =&gt; console.log(1));</span></span>
<span class="line"><span style="color:#A6ACCD;">Promise.resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(2))</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(3));</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// (等待一个then)最终结果👉: 2 1 3</span></span></code></pre></div><h4 id="promise-等待-2个then的时间" tabindex="-1"><code>promise</code>（等待 2个<code>then</code>的时间） <a class="header-anchor" href="#promise-等待-2个then的时间" aria-label="Permalink to &quot;\`promise\`（等待 2个\`then\`的时间）&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">async function testC () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return new Promise((resolve, reject) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">} </span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">testC().then(() =&gt; console.log(1));</span></span>
<span class="line"><span style="color:#A6ACCD;">Promise.resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(2))</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(3))</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(4))</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// (等待两个then)最终结果👉: 2 3 1 4</span></span></code></pre></div><h3 id="await-右值类型区别" tabindex="-1">await 右值类型区别 <a class="header-anchor" href="#await-右值类型区别" aria-label="Permalink to &quot;await 右值类型区别&quot;">​</a></h3><h4 id="非thenable" tabindex="-1">非<code>thenable</code> <a class="header-anchor" href="#非thenable" aria-label="Permalink to &quot;非\`thenable\`&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">async function test () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(1);</span></span>
<span class="line"><span style="color:#A6ACCD;">    await 1;</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(2);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">test();</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(3);</span></span>
<span class="line"><span style="color:#A6ACCD;">// 最终结果👉: 1 3 2</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function func () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(2);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">async function test () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(1);</span></span>
<span class="line"><span style="color:#A6ACCD;">    await func();</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(3);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">test();</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(4);</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 最终结果👉: 1 2 4 3</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">async function test () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(1);</span></span>
<span class="line"><span style="color:#A6ACCD;">    await 123</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(2);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">test();</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(3);</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">Promise.resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(4))</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(5))</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(6))</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(7));</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 最终结果👉: 1 3 2 4 5 6 7</span></span></code></pre></div><p><strong><code>await</code>后面接非 <code>thenable</code> 类型，会立即向微任务队列添加一个微任务<code>then</code>，但不需等待</strong></p><h4 id="thenable类型" tabindex="-1"><code>thenable</code>类型 <a class="header-anchor" href="#thenable类型" aria-label="Permalink to &quot;\`thenable\`类型&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">async function test () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(1);</span></span>
<span class="line"><span style="color:#A6ACCD;">    await {</span></span>
<span class="line"><span style="color:#A6ACCD;">        then (cb) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            cb();</span></span>
<span class="line"><span style="color:#A6ACCD;">        },</span></span>
<span class="line"><span style="color:#A6ACCD;">    };</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(2);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">test();</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(3);</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">Promise.resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(4))</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(5))</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(6))</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(7));</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 最终结果👉: 1 3 4 2 5 6 7</span></span></code></pre></div><p><strong><code>await</code> 后面接 <code>thenable</code> 类型，需要</strong>等待一个 <code>then</code> 的时间之后<strong>执行</strong></p><h4 id="promise类型" tabindex="-1"><code>Promise</code>类型 <a class="header-anchor" href="#promise类型" aria-label="Permalink to &quot;\`Promise\`类型&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">async function test () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(1);</span></span>
<span class="line"><span style="color:#A6ACCD;">    await new Promise((resolve, reject) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(2);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">test();</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(3);</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">Promise.resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(4))</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(5))</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(6))</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(7));</span></span>
<span class="line"><span style="color:#A6ACCD;">    </span></span>
<span class="line"><span style="color:#A6ACCD;">// 最终结果👉: 1 3 2 4 5 6 7</span></span></code></pre></div><p>为什么表现的和非 <code>thenable</code> 值一样呢？为什么不等待两个 <code>then</code> 的时间呢？</p><ul><li>TC 39(ECMAScript标准制定者) 对<code>await</code> 后面是 <code>promise</code> 的情况如何处理进行了一次修改，<strong>移除</strong>了额外的两个微任务，在<strong>早期版本</strong>，依然会等待两个 <code>then</code> 的时间</li><li>有大佬翻译了官方解释：<strong>更快的 async 函数和 promises</strong>，但在这次更新中并没有修改 <code>thenable</code> 的情况</li></ul><p>这样做可以极大的优化 <code>await</code> 等待的速度👇</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">async function func () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(1);</span></span>
<span class="line"><span style="color:#A6ACCD;">    await 1;</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(2);</span></span>
<span class="line"><span style="color:#A6ACCD;">    await 2;</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(3);</span></span>
<span class="line"><span style="color:#A6ACCD;">    await 3;</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(4);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">async function test () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(5);</span></span>
<span class="line"><span style="color:#A6ACCD;">    await func();</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(6);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">test();</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(7);</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">Promise.resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(8))</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(9))</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(10))</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(11));</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 最终结果👉: 5 1 7 2 8 3 9 4 10 6 11</span></span></code></pre></div><p><code>await</code> 和 <code>Promise.prototype.then</code> 虽然很多时候可以在<strong>时间顺序</strong>上能等效，但是它们之间有<strong>本质的区别</strong>。</p><ul><li><code>test</code> 函数中的 <code>await</code> 会等待 <code>func</code> 函数中所有的 <code>await</code> 取得 恢复函数执行 的命令并且整个函数执行完毕后才能获得取得 <strong>恢复函数执行</strong>的命令；</li><li>也就是说，<code>func</code> 函数的 <code>await</code> 此时<strong>不能在时间的顺序上等效</strong> <code>then</code>，而要等待到 <code>test</code> 函数完全执行完毕；</li><li>比如这里的数字<code>6</code>很晚才输出，<strong>如果</strong>单纯看成<code>then</code>的话，在下一个微任务队列执行时<code>6</code>就应该作为同步代码输出了才对。</li></ul><p>所以我们可以合并两个函数的代码👇</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">async function test () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(5);</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(1);</span></span>
<span class="line"><span style="color:#A6ACCD;">    await 1;</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(2);</span></span>
<span class="line"><span style="color:#A6ACCD;">    await 2;</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(3);</span></span>
<span class="line"><span style="color:#A6ACCD;">    await 3;</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(4);</span></span>
<span class="line"><span style="color:#A6ACCD;">    await null;</span></span>
<span class="line"><span style="color:#A6ACCD;">    </span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(6);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">test();</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(7);</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">Promise.resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(8))</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(9))</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(10))</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(11));</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 最终结果👉: 5 1 7 2 8 3 9 4 10 6 11</span></span></code></pre></div><p>因为将原本的函数融合，此时的 <code>await</code> 可以等效为 <code>Promise.prototype.then</code>，又完全可以等效如下代码👇</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">async function test () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(5);</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(1);</span></span>
<span class="line"><span style="color:#A6ACCD;">    Promise.resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">        .then(() =&gt; console.log(2))</span></span>
<span class="line"><span style="color:#A6ACCD;">        .then(() =&gt; console.log(3))</span></span>
<span class="line"><span style="color:#A6ACCD;">        .then(() =&gt; console.log(4))</span></span>
<span class="line"><span style="color:#A6ACCD;">        .then(() =&gt; console.log(6))</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">test();</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(7);</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">Promise.resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(8))</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(9))</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(10))</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(11));</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 最终结果👉: 5 1 7 2 8 3 9 4 10 6 11</span></span></code></pre></div><p>以上三种写法在时间的顺序上完全等效，所以你 <strong>完全可以将 <code>await</code> 后面的代码可以看做在 <code>then</code> 里面执行的结果</strong>，又因为 <code>async</code> 函数会返回 <code>promise</code> 实例，所以还可以等效成👇</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">async function test () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(5);</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(1);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">test()</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(2))</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(3))</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(4))</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(6))</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(7);</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">Promise.resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(8))</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(9))</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(10))</span></span>
<span class="line"><span style="color:#A6ACCD;">    .then(() =&gt; console.log(11));</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 最终结果👉: 5 1 7 2 8 3 9 4 10 6 11</span></span></code></pre></div><h3 id="真题演示" tabindex="-1">真题演示 <a class="header-anchor" href="#真题演示" aria-label="Permalink to &quot;真题演示&quot;">​</a></h3><h4 id="_1-方式一" tabindex="-1">1.方式一 <a class="header-anchor" href="#_1-方式一" aria-label="Permalink to &quot;1.方式一&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">async function async2 () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    new Promise((resolve, reject) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">async function async3 () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return new Promise((resolve, reject) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">async function async1 () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 方式一：最终结果：B A C D</span></span>
<span class="line"><span style="color:#A6ACCD;">    // await new Promise((resolve, reject) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    //     resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">    // })</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    // 方式二：最终结果：B A C D</span></span>
<span class="line"><span style="color:#A6ACCD;">    // await async2()</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    // 方式三：最终结果：B C D A</span></span>
<span class="line"><span style="color:#A6ACCD;">    await async3()</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;A&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">async1()</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">new Promise((resolve) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;B&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">}).then(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;C&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">}).then(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;D&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span></code></pre></div><ul><li>首先，<strong><code>async</code>函数的整体返回值永远都是<code>Promise</code>，无论值本身是什么</strong></li><li>方式一：<code>await</code>的是<code>Promise</code>，无需等待</li><li>方式二：<code>await</code>的是<code>async</code>函数，但是该函数的返回值本身是<strong>非<code>thenable</code></strong>，无需等待</li><li>方式三：<code>await</code>的是<code>async</code>函数，且返回值本身是<code>Promise</code>，需等待两个<code>then</code>时间</li></ul><h4 id="_2-方式二" tabindex="-1">2.方式二 <a class="header-anchor" href="#_2-方式二" aria-label="Permalink to &quot;2.方式二&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function func () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(2);</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    // 方式一：1 2 4  5 3 6 7</span></span>
<span class="line"><span style="color:#A6ACCD;">    // Promise.resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">    //     .then(() =&gt; console.log(5))</span></span>
<span class="line"><span style="color:#A6ACCD;">    //     .then(() =&gt; console.log(6))</span></span>
<span class="line"><span style="color:#A6ACCD;">    //     .then(() =&gt; console.log(7))</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    // 方式二：1 2 4  5 6 7 3</span></span>
<span class="line"><span style="color:#A6ACCD;">    return Promise.resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">        .then(() =&gt; console.log(5))</span></span>
<span class="line"><span style="color:#A6ACCD;">        .then(() =&gt; console.log(6))</span></span>
<span class="line"><span style="color:#A6ACCD;">        .then(() =&gt; console.log(7))</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">async function test () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(1);</span></span>
<span class="line"><span style="color:#A6ACCD;">    await func();</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(3);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">test();</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(4);</span></span></code></pre></div><ul><li><p>方式一：</p></li><li><ul><li>同步代码输出<code>1、2</code>，接着将<code>log(5)</code>处的<code>then1</code>加入微任务队列，<code>await</code>拿到确切的<code>func</code>函数返回值<code>undefined</code>，将后续代码放入微任务队列（<code>then2</code>，可以这样理解）</li><li>执行同步代码输出<code>4</code>，到此，所有同步代码完毕</li><li>执行第一个放入的微任务<code>then1</code>输出<code>5</code>，产生<code>log(6)</code>的微任务<code>then3</code></li><li>执行第二个放入的微任务<code>then2</code>输出<code>3</code></li><li>然后执行微任务<code>then3</code>，输出<code>6</code>，产生<code>log(7)</code>的微任务<code>then4</code></li><li>执行<code>then4</code>，输出<code>7</code></li></ul></li><li><p>方式二：</p></li><li><ul><li>同步代码输出<code>1、2</code>，<code>await</code>拿到<code>func</code>函数返回值，但是并未获得<strong>具体的结果</strong>（由<code>Promise</code>本身机制决定），暂停执行当前<code>async</code>函数内的代码（跳出、让行）</li><li>输出<code>4</code>，到此，所有同步代码完毕</li><li><code>await</code>一直等到<code>Promise.resolve().then...</code>执行完成，再放行输出<code>3</code></li></ul></li></ul><h4 id="_3-方式三" tabindex="-1">3.方式三 <a class="header-anchor" href="#_3-方式三" aria-label="Permalink to &quot;3.方式三&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function func () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(2);</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    return Promise.resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">        .then(() =&gt; console.log(5))</span></span>
<span class="line"><span style="color:#A6ACCD;">        .then(() =&gt; console.log(6))</span></span>
<span class="line"><span style="color:#A6ACCD;">        .then(() =&gt; console.log(7))</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">async function test () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(1);</span></span>
<span class="line"><span style="color:#A6ACCD;">    await func()</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(3);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">test();</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(4);</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">new Promise((resolve) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;B&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">}).then(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;C&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">}).then(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;D&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 最终结果👉: 1 2 4    B 5 C 6 D 7 3</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">async function test () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(1);</span></span>
<span class="line"><span style="color:#A6ACCD;">    await Promise.resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">        .then(() =&gt; console.log(5))</span></span>
<span class="line"><span style="color:#A6ACCD;">        .then(() =&gt; console.log(6))</span></span>
<span class="line"><span style="color:#A6ACCD;">        .then(() =&gt; console.log(7))</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(3);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">test();</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(4);</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">new Promise((resolve) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;B&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">}).then(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;C&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">}).then(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;D&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 最终结果👉: 1 4    B 5 C 6 D 7 3</span></span></code></pre></div><p>综上，<code>await</code>一定要等到右侧的表达式有<strong>确切的值</strong>才会放行，否则将一直等待（阻塞当前<code>async</code>函数内的后续代码），不服看看这个👇</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function func () {</span></span>
<span class="line"><span style="color:#A6ACCD;">  return new Promise((resolve) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">      console.log(&#39;B&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">      // resolve() 故意一直保持pending</span></span>
<span class="line"><span style="color:#A6ACCD;">  })</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">async function test () {</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(1);</span></span>
<span class="line"><span style="color:#A6ACCD;">  await func()</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(3);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">test();</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(4);</span></span>
<span class="line"><span style="color:#A6ACCD;">// 最终结果👉: 1 B 4 (永远不会打印3)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// ---------------------或者写为👇-------------------</span></span>
<span class="line"><span style="color:#A6ACCD;">async function test () {</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(1);</span></span>
<span class="line"><span style="color:#A6ACCD;">  await new Promise((resolve) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">      console.log(&#39;B&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">      // resolve() 故意一直保持pending</span></span>
<span class="line"><span style="color:#A6ACCD;">  })</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(3);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">test();</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(4);</span></span>
<span class="line"><span style="color:#A6ACCD;">// 最终结果👉: 1 B 4 (永远不会打印3)</span></span></code></pre></div><h4 id="_4-方式四" tabindex="-1">4.方式四 <a class="header-anchor" href="#_4-方式四" aria-label="Permalink to &quot;4.方式四&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">async function func () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(2);</span></span>
<span class="line"><span style="color:#A6ACCD;">    return {</span></span>
<span class="line"><span style="color:#A6ACCD;">        then (cb) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            cb()</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">async function test () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(1);</span></span>
<span class="line"><span style="color:#A6ACCD;">    await func();</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(3);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">test();</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(4);</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">new Promise((resolve) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;B&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">}).then(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;C&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">}).then(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;D&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 最终结果👉: 1 2 4 B C 3 D</span></span></code></pre></div><ul><li>同步代码输出<code>1、2</code></li><li><code>await</code>拿到<code>func</code>函数的具体返回值<code>thenable</code>，将当前<code>async</code>函数内的后续代码放入微任务<code>then1</code>(但是需要等待一个<code>then</code>时间)</li><li>同步代码输出<code>4、B</code>，产生<code>log(C)</code>的微任务<code>then2</code></li><li>由于<code>then1</code>滞后一个<code>then</code>时间，直接执行<code>then2</code>输出<code>C</code>，产生<code>log(D)</code>的微任务<code>then3</code></li><li>执行原本滞后一个<code>then</code>时间的微任务<code>then1</code>，输出<code>3</code></li><li>执行最后一个微任务<code>then3</code>输出<code>D</code></li></ul><h4 id="_5-经典面试题" tabindex="-1">5.经典面试题 <a class="header-anchor" href="#_5-经典面试题" aria-label="Permalink to &quot;5.经典面试题&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">async function async1 () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;1&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    await async2()</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;AAA&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">async function async2 () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;3&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    return new Promise((resolve, reject) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(&#39;4&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(&#39;5&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">setTimeout(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;6&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">}, 0);</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">async1()</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">new Promise((resolve) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;7&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    resolve()</span></span>
<span class="line"><span style="color:#A6ACCD;">}).then(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;8&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">}).then(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;9&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">}).then(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;10&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(&#39;11&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 最终结果👉: 5 1 3 4 7 11 8 9 AAA 10 6</span></span></code></pre></div><p>步骤拆分👇：</p><ol><li><p>先执行同步代码，输出<code>5</code></p></li><li><p>执行<code>setTimeout</code>，是放入宏任务异步队列中</p></li><li><p>接着执行<code>async1</code>函数，输出<code>1</code></p></li><li><p>执行<code>async2</code>函数，输出<code>3</code></p></li><li><p><code>Promise</code>构造器中代码属于同步代码，输出<code>4</code></p><blockquote><p><code>async2</code>函数的返回值是<code>Promise</code>，等待<code>2</code>个<code>then</code>后放行，所以<code>AAA</code>暂时无法输出</p></blockquote></li><li><p><code>async1</code>函数<strong>暂时</strong>结束，继续往下走，输出<code>7</code></p></li><li><p>同步代码，输出<code>11</code></p></li><li><p>执行第一个<code>then</code>，输出<code>8</code></p></li><li><p>执行第二个<code>then</code>，输出<code>9</code></p></li><li><p>终于<strong>等</strong>到了两个<code>then</code>执行完毕，执行<code>async1</code>函数里面剩下的，输出<code>AAA</code></p></li><li><p>再执行最后一个微任务<code>then</code>，输出<code>10</code></p></li><li><p>执行最后的宏任务<code>setTimeout</code>，输出<code>6</code></p></li></ol><h3 id="总结" tabindex="-1">总结 <a class="header-anchor" href="#总结" aria-label="Permalink to &quot;总结&quot;">​</a></h3><p><code>async</code>函数返回值</p><ul><li><p>📑结论：<code>async</code>函数在抛出返回值时，会根据返回值<strong>类型</strong>开启<strong>不同数目的微任务</strong></p></li><li><ul><li>return结果值：非<code>thenable</code>、非<code>promise</code>（不等待）</li><li>return结果值：<code>thenable</code>（等待 1个<code>then</code>的时间）</li><li>return结果值：<code>promise</code>（等待 2个<code>then</code>的时间）</li></ul></li></ul><p><code>await</code>右值类型区别</p><ul><li><p>接非 <code>thenable</code> 类型，会立即向微任务队列添加一个微任务<code>then</code>，<strong>但不需等待</strong></p></li><li><p>接 <code>thenable</code> 类型，需要<strong>等待一个 <code>then</code> 的时间之后</strong>执行</p></li><li><p>接<code>Promise</code>类型(有确定的返回值)，会立即向微任务队列添加一个微任务<code>then</code>，<strong>但不需等待</strong></p></li><li><ul><li>TC 39 对<code>await</code> 后面是 <code>promise</code> 的情况如何处理进行了一次修改，<strong>移除</strong>了额外的两个微任务，在<strong>早期版本</strong>，依然会等待两个 <code>then</code> 的时</li></ul></li></ul><h1 id="八、面向对象" tabindex="-1">八、面向对象 <a class="header-anchor" href="#八、面向对象" aria-label="Permalink to &quot;八、面向对象&quot;">​</a></h1><h2 id="_40-js-创建对象的6种方式" tabindex="-1">40.js 创建对象的6种方式 <a class="header-anchor" href="#_40-js-创建对象的6种方式" aria-label="Permalink to &quot;40.js 创建对象的6种方式&quot;">​</a></h2><ol><li>Object 构造函数创建</li><li>对象字面量创建</li><li>工厂模式创建</li><li>构造函数创建</li><li>原型模式创建</li><li>组合使用构造函数模式和原型模式创建 <ul><li>构造函数每个实例对象都会复制构造函数内部的方法，造成内存浪费</li><li>可以结合原型模式来共享同一个方法达到节省内存</li></ul></li></ol><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// Object 构造函数</span></span>
<span class="line"><span style="color:#A6ACCD;">/* const Person = new Object()</span></span>
<span class="line"><span style="color:#A6ACCD;">Person.type = 1 */</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 字面量</span></span>
<span class="line"><span style="color:#A6ACCD;">/* const Person = {}</span></span>
<span class="line"><span style="color:#A6ACCD;">Person.type = 2 */</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 工厂模式</span></span>
<span class="line"><span style="color:#A6ACCD;">/* function createPerson(name, age, job) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    var o = new Object()</span></span>
<span class="line"><span style="color:#A6ACCD;">    o.name = name</span></span>
<span class="line"><span style="color:#A6ACCD;">    o.age = age</span></span>
<span class="line"><span style="color:#A6ACCD;">    o.job = job</span></span>
<span class="line"><span style="color:#A6ACCD;">    o.sayName = function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">        alert(this.name)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return o</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const person = createPerson(&#39;Nike&#39;, 29, &#39;teacher&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(person.age) */</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 构造函数</span></span>
<span class="line"><span style="color:#A6ACCD;">/* function Person(name, age, job) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    this.name = name</span></span>
<span class="line"><span style="color:#A6ACCD;">    this.age = age</span></span>
<span class="line"><span style="color:#A6ACCD;">    this.job = job</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const person = new Person(&#39;Nike&#39;, 29, &#39;teacher&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(person.age) */</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 原型模式</span></span>
<span class="line"><span style="color:#A6ACCD;">/* function Person() {}</span></span>
<span class="line"><span style="color:#A6ACCD;">Person.prototype.name = &#39;Nike&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">Person.prototype.age = 20</span></span>
<span class="line"><span style="color:#A6ACCD;">Person.prototype.job = &#39;teacher&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">const person = new Person(&#39;Nike&#39;, 29, &#39;teacher&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(person.age) */</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 构造函数与原型组合</span></span>
<span class="line"><span style="color:#A6ACCD;">function Person (name) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    this.name = name</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">Person.prototype.sayName = function() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(this.name)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const mike = new Person(&#39;mike&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">mike.sayName()</span></span></code></pre></div><h2 id="_41-js的6种继承方式" tabindex="-1">41.js的6种继承方式 <a class="header-anchor" href="#_41-js的6种继承方式" aria-label="Permalink to &quot;41.js的6种继承方式&quot;">​</a></h2><ol><li>原型链继承 <ul><li>特点：所有实例对象共用同一个原型对象的属性和方法</li><li>缺点： <ul><li>所有实例对象共享原型对象属性和方法，如果是引用类型，一个实例修改，其他地方也会修改</li><li>实例化时不能向 Parent 传参</li><li>子类的原型上多了不需要的父类属性，存在内存上的浪费</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 原型继承</span></span>
<span class="line"><span style="color:#A6ACCD;">function Parent() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    this.info = {</span></span>
<span class="line"><span style="color:#A6ACCD;">        balance: 10000</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">Parent.prototype.useMoney = function (number) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    this.info.balance -= number</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(\`花了\${number}块\`)</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(\`余额\${this.info.balance}块\`)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">function Child() {}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">Child.prototype = new Parent()</span></span>
<span class="line"><span style="color:#A6ACCD;">const child1 = new Child()</span></span>
<span class="line"><span style="color:#A6ACCD;">const child2 = new Child()</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(child1.info.balance) // 10000</span></span>
<span class="line"><span style="color:#A6ACCD;">child1.useMoney(500)</span></span>
<span class="line"><span style="color:#A6ACCD;">// child1 花了500块</span></span>
<span class="line"><span style="color:#A6ACCD;">// child1 余额9500块</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(child2.info.balance) // child2 也只剩9500</span></span></code></pre></div></li><li>盗用构造函数继承（利用call、apply） <ul><li>特点：利用call、apply 使 parent 指向 child，从而获得对应的属性</li><li>缺点 <ul><li>无法继承 parent 的方法</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function Parent() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    this.info = {</span></span>
<span class="line"><span style="color:#A6ACCD;">        balance: 10000</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">Parent.prototype.useMoney = function (number) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    this.info.balance -= number</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(\`花了\${number}块\`)</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(\`余额\${this.info.balance}块\`)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">function Child() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    Parent.call(this)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const child1 = new Child()</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(child1.info.balance) // 10000</span></span>
<span class="line"><span style="color:#A6ACCD;">child1.useMoney(500) // 报错</span></span></code></pre></div></li><li>组合继承</li></ol><ul><li>特点：兼顾盗用构造继承特点，同时解决无法继承方法<div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function Parent() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    this.info = {</span></span>
<span class="line"><span style="color:#A6ACCD;">        balance: 10000</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">Parent.prototype.useMoney = function (number) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    this.info.balance -= number</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(\`花了\${number}块\`)</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(\`余额\${this.info.balance}块\`)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">function Child() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    Parent.call(this)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">Child.prototype = new Parent()</span></span>
<span class="line"><span style="color:#A6ACCD;">// 更正 Child 原型对象的构造函数，不加则为 Parent</span></span>
<span class="line"><span style="color:#A6ACCD;">Child.prototype.constructor = Child</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">Child.prototype = new Parent()</span></span>
<span class="line"><span style="color:#A6ACCD;">const child1 = new Child()</span></span>
<span class="line"><span style="color:#A6ACCD;">const child2 = new Child()</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(child1.info.balance) // 10000</span></span>
<span class="line"><span style="color:#A6ACCD;">child1.useMoney(500)</span></span>
<span class="line"><span style="color:#A6ACCD;">// child1 花了500块</span></span>
<span class="line"><span style="color:#A6ACCD;">// child1 余额9500块</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(child2.info.balance) // 10000</span></span></code></pre></div></li></ul><ol start="4"><li>原型式继承 <ul><li>跟原型链继承类似，只是把继承的改为传参的方式</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function Parent() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    this.info = {</span></span>
<span class="line"><span style="color:#A6ACCD;">        balance: 10000</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">Parent.prototype.useMoney = function (number) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    this.info.balance -= number</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(\`花了\${number}块\`)</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(\`余额\${this.info.balance}块\`)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">function createObj(Parent) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 接受的式一个实例对象，即Parent的实例对象parent</span></span>
<span class="line"><span style="color:#A6ACCD;">    function Child() {}</span></span>
<span class="line"><span style="color:#A6ACCD;">    Child.prototype = Parent</span></span>
<span class="line"><span style="color:#A6ACCD;">    return new Child()</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const parent = new Parent()</span></span>
<span class="line"><span style="color:#A6ACCD;">const child1 = createObj(parent)</span></span>
<span class="line"><span style="color:#A6ACCD;">const child2 = createObj(parent)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(child1.info.balance) // 10000</span></span>
<span class="line"><span style="color:#A6ACCD;">child1.useMoney(500)</span></span>
<span class="line"><span style="color:#A6ACCD;">// child1 花了500块</span></span>
<span class="line"><span style="color:#A6ACCD;">// child1 余额9500块</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(child2.info.balance) // 9500</span></span></code></pre></div></li><li>寄生式继承 <ul><li>在原型式继承的基础上，再利用函数中定义方法</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function object(Parent) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    function Child(){}</span></span>
<span class="line"><span style="color:#A6ACCD;">    Child.prototype = Parent</span></span>
<span class="line"><span style="color:#A6ACCD;">    return new Child()</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">function createAnother(Parent) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let Child = object(Parent)</span></span>
<span class="line"><span style="color:#A6ACCD;">    Child.sayHi = function() {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(&#39;hi&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return Child</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">function Parent() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    this.info = {</span></span>
<span class="line"><span style="color:#A6ACCD;">        balance: 10000</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const parent = new Parent()</span></span>
<span class="line"><span style="color:#A6ACCD;">const child = createAnother(parent)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(child.info.balance) // 10000</span></span>
<span class="line"><span style="color:#A6ACCD;">child.sayHi() // hi</span></span></code></pre></div></li><li>寄生组合式继承</li></ol><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function Parent() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    this.balance = 10000</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">Parent.prototype.useMoney = function (number) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    this.balance -= number</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(\`花了\${number}块\`)</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(\`余额\${this.balance}块\`)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">function Child() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    Parent.call(this)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">function object(o) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    function F() {}</span></span>
<span class="line"><span style="color:#A6ACCD;">    F.prototype = o</span></span>
<span class="line"><span style="color:#A6ACCD;">    return new F()</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">function inheritPrototype(Child, Parent) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    var prototype = object(Parent.prototype) // 创建一个prototype对象，prototype对象的原型对象为Parent.prototype</span></span>
<span class="line"><span style="color:#A6ACCD;">    prototype.constructor = Child // prototype对象的constructor指向Child</span></span>
<span class="line"><span style="color:#A6ACCD;">    Child.prototype = prototype // 将Child的原型对象替换成我们创建好的新的prototype对象</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">inheritPrototype(Child, Parent) // 继承</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const child1 = new Child() </span></span>
<span class="line"><span style="color:#A6ACCD;">const child2 = new Child() </span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(child1.balance) // 10000</span></span>
<span class="line"><span style="color:#A6ACCD;">child1.useMoney(500)</span></span>
<span class="line"><span style="color:#A6ACCD;">// 花了500块</span></span>
<span class="line"><span style="color:#A6ACCD;">// 余额9500块</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(child2.balance)  // 10000</span></span></code></pre></div>`,219),i=[t];function r(C,A,y,D,d,g){return n(),a("div",null,i)}const b=s(c,[["render",r]]);export{u as __pageData,b as default};