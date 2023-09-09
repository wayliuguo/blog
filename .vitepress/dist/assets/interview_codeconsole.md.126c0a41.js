import{_ as s,o as n,c as a,U as l}from"./chunks/framework.9adb0f96.js";const h=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"interview/codeconsole.md","filePath":"interview/codeconsole.md","lastUpdated":1691242518000}'),e={name:"interview/codeconsole.md"},p=l(`<h2 id="_1-异步与事件循环" tabindex="-1">1.异步与事件循环 <a class="header-anchor" href="#_1-异步与事件循环" aria-label="Permalink to &quot;1.异步与事件循环&quot;">​</a></h2><h3 id="_1-宏任务与微任务执行过程" tabindex="-1">1.宏任务与微任务执行过程 <a class="header-anchor" href="#_1-宏任务与微任务执行过程" aria-label="Permalink to &quot;1.宏任务与微任务执行过程&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">Promise.resolve().then(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(&#39;promise1&#39;);</span></span>
<span class="line"><span style="color:#A6ACCD;">  const timer2 = setTimeout(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;timer2&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">  }, 0)</span></span>
<span class="line"><span style="color:#A6ACCD;">});</span></span>
<span class="line"><span style="color:#A6ACCD;">const timer1 = setTimeout(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(&#39;timer1&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">  Promise.resolve().then(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;promise2&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">  })</span></span>
<span class="line"><span style="color:#A6ACCD;">}, 0)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(&#39;start&#39;);</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">start</span></span>
<span class="line"><span style="color:#A6ACCD;">promise1</span></span>
<span class="line"><span style="color:#A6ACCD;">timer1</span></span>
<span class="line"><span style="color:#A6ACCD;">promise2</span></span>
<span class="line"><span style="color:#A6ACCD;">timer2</span></span></code></pre></div><p>代码的执行过程如下：</p><ol><li>首先，<code>Promise.resolve().then</code>是一个微任务，加入微任务队列</li><li>执行timer1，它是一个宏任务，加入宏任务队列</li><li>继续执行下面的同步代码，打印出<code>start</code></li><li>这样第一轮宏任务就执行完了，开始执行微任务<code>Promise.resolve().then</code>，打印出<code>promise1</code></li><li>遇到<code>timer2</code>，它是一个宏任务，将其加入宏任务队列，此时宏任务队列有两个任务，分别是<code>timer1</code>、<code>timer2</code>；</li><li>这样第一轮微任务就执行完了，开始执行第二轮宏任务，首先执行定时器<code>timer1</code>，打印<code>timer1</code>；</li><li>遇到<code>Promise.resolve().then</code>，它是一个微任务，加入微任务队列</li><li>开始执行微任务队列中的任务，打印<code>promise2</code>；</li><li>最后执行宏任务<code>timer2</code>定时器，打印出<code>timer2</code>；</li></ol><h3 id="_2-promise-then-接收一个值而不是一个函数" tabindex="-1">2.promise.then()接收一个值而不是一个函数 <a class="header-anchor" href="#_2-promise-then-接收一个值而不是一个函数" aria-label="Permalink to &quot;2.promise.then()接收一个值而不是一个函数&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">Promise.resolve(1)</span></span>
<span class="line"><span style="color:#A6ACCD;">  .then(2)</span></span>
<span class="line"><span style="color:#A6ACCD;">  .then(Promise.resolve(3))</span></span>
<span class="line"><span style="color:#A6ACCD;">  .then(console.log)</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">1</span></span>
<span class="line"><span style="color:#A6ACCD;">Promise {&lt;fulfilled&gt;: undefined}</span></span></code></pre></div><p><code>.then</code> 或<code>.catch</code> 的参数期望是函数，传入非函数则会发生<strong>值透传</strong>。</p><h3 id="_3-promise-then-中抛出错误" tabindex="-1">3. promise.then()中抛出错误 <a class="header-anchor" href="#_3-promise-then-中抛出错误" aria-label="Permalink to &quot;3. promise.then()中抛出错误&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const promise1 = new Promise((resolve, reject) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">  setTimeout(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    resolve(&#39;success&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">  }, 1000)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;">const promise2 = promise1.then(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">  throw new Error(&#39;error!!!&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(&#39;promise1&#39;, promise1)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(&#39;promise2&#39;, promise2)</span></span>
<span class="line"><span style="color:#A6ACCD;">setTimeout(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(&#39;promise1&#39;, promise1)</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(&#39;promise2&#39;, promise2)</span></span>
<span class="line"><span style="color:#A6ACCD;">}, 2000)</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">promise1 Promise {&lt;pending&gt;}</span></span>
<span class="line"><span style="color:#A6ACCD;">promise2 Promise {&lt;pending&gt;}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">Uncaught (in promise) Error: error!!!</span></span>
<span class="line"><span style="color:#A6ACCD;">promise1 Promise {&lt;fulfilled&gt;: &quot;success&quot;}</span></span>
<span class="line"><span style="color:#A6ACCD;">promise2 Promise {&lt;rejected&gt;: Error: error!!}</span></span></code></pre></div><h3 id="_4-promise-then-返回一个值" tabindex="-1">4. promise.then()返回一个值 <a class="header-anchor" href="#_4-promise-then-返回一个值" aria-label="Permalink to &quot;4. promise.then()返回一个值&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">Promise.resolve(1)</span></span>
<span class="line"><span style="color:#A6ACCD;">  .then(res =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(res);</span></span>
<span class="line"><span style="color:#A6ACCD;">    return 2;</span></span>
<span class="line"><span style="color:#A6ACCD;">  })</span></span>
<span class="line"><span style="color:#A6ACCD;">  .catch(err =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return 3;</span></span>
<span class="line"><span style="color:#A6ACCD;">  })</span></span>
<span class="line"><span style="color:#A6ACCD;">  .then(res =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(res);</span></span>
<span class="line"><span style="color:#A6ACCD;">  });</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">1   </span></span>
<span class="line"><span style="color:#A6ACCD;">2</span></span></code></pre></div><p>Promise是可以链式调用的，由于每次调用 <code>.then</code> 或者 <code>.catch</code> 都会返回一个新的 promise，从而实现了链式调用, 它并不像一般任务的链式调用一样return this。</p><p>上面的输出结果之所以依次打印出1和2，是因为<code>resolve(1)</code>之后走的是第一个then方法，并没有进catch里，所以第二个then中的res得到的实际上是第一个then的返回值。并且return 2会被包装成<code>resolve(2)</code>，被最后的then打印输出2。</p><h3 id="_5-promise-then-返回错误" tabindex="-1">5. promise.then() 返回错误 <a class="header-anchor" href="#_5-promise-then-返回错误" aria-label="Permalink to &quot;5. promise.then() 返回错误&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">Promise.resolve().then(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">  return new Error(&#39;error!!!&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">}).then(res =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(&quot;then: &quot;, res)</span></span>
<span class="line"><span style="color:#A6ACCD;">}).catch(err =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(&quot;catch: &quot;, err)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&quot;then: &quot; &quot;Error: error!!!&quot;</span></span></code></pre></div><p>返回任意一个非 promise 的值都会被包裹成 promise 对象，因此这里的<code>return new Error(&#39;error!!!&#39;)</code>也被包裹成了<code>return Promise.resolve(new Error(&#39;error!!!&#39;))</code>，因此它会被then捕获而不是catch。</p><h3 id="_6-promise-then-返回一个promise" tabindex="-1">6.promise.then()返回一个promise <a class="header-anchor" href="#_6-promise-then-返回一个promise" aria-label="Permalink to &quot;6.promise.then()返回一个promise&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const promise = Promise.resolve().then(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">  return promise;</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;">promise.catch(console.err)</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">Uncaught (in promise) TypeError: Chaining cycle detected for promise #&lt;Promise&gt;</span></span></code></pre></div><p>这里其实是一个坑，<code>.then</code> 或 <code>.catch</code> 返回的值不能是 promise 本身，否则会造成死循环。</p><h3 id="_7-promise-then捕捉错误与catch同时存在" tabindex="-1">7. promise.then捕捉错误与catch同时存在 <a class="header-anchor" href="#_7-promise-then捕捉错误与catch同时存在" aria-label="Permalink to &quot;7. promise.then捕捉错误与catch同时存在&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">Promise.reject(&#39;err!!!&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">  .then((res) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;success&#39;, res)</span></span>
<span class="line"><span style="color:#A6ACCD;">  }, (err) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;error&#39;, err)</span></span>
<span class="line"><span style="color:#A6ACCD;">  }).catch(err =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;catch&#39;, err)</span></span>
<span class="line"><span style="color:#A6ACCD;">  })</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">error err!!!</span></span></code></pre></div><p>我们知道，<code>.then</code>函数中的两个参数：</p><ul><li>第一个参数是用来处理Promise成功的函数</li><li>第二个则是处理失败的函数</li></ul><p>也就是说<code>Promise.resolve(&#39;1&#39;)</code>的值会进入成功的函数，<code>Promise.reject(&#39;2&#39;)</code>的值会进入失败的函数。</p><p>在这道题中，错误直接被<code>then</code>的第二个参数捕获了，所以就不会被<code>catch</code>捕获了，输出结果为：<code>error err!!!&#39;</code></p><h3 id="_8-promise-finally" tabindex="-1">8. promise.finally <a class="header-anchor" href="#_8-promise-finally" aria-label="Permalink to &quot;8. promise.finally&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">Promise.resolve(&#39;1&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">  .then(res =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(res)</span></span>
<span class="line"><span style="color:#A6ACCD;">  })</span></span>
<span class="line"><span style="color:#A6ACCD;">  .finally(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;finally&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">  })</span></span>
<span class="line"><span style="color:#A6ACCD;">Promise.resolve(&#39;2&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">  .finally(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;finally2&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">  	return &#39;我是finally2返回的值&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">  })</span></span>
<span class="line"><span style="color:#A6ACCD;">  .then(res =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;finally2后面的then函数&#39;, res)</span></span>
<span class="line"><span style="color:#A6ACCD;">  })</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">1</span></span>
<span class="line"><span style="color:#A6ACCD;">finally2</span></span>
<span class="line"><span style="color:#A6ACCD;">finally</span></span>
<span class="line"><span style="color:#A6ACCD;">finally2后面的then函数 2</span></span></code></pre></div><p><code>.finally()</code>一般用的很少，只要记住以下几点就可以了：</p><ul><li><code>.finally()</code>方法不管Promise对象最后的状态如何都会执行</li><li><code>.finally()</code>方法的回调函数不接受任何的参数，也就是说你在<code>.finally()</code>函数中是无法知道Promise最终的状态是<code>resolved</code>还是<code>rejected</code>的</li><li>它最终返回的默认会是一个上一次的Promise对象值，不过如果抛出的是一个异常则返回异常的Promise对象。</li><li>finally本质上是then方法的特例</li></ul><h3 id="_9-promise-catch-捕捉异常" tabindex="-1">9. promise.catch 捕捉异常 <a class="header-anchor" href="#_9-promise-catch-捕捉异常" aria-label="Permalink to &quot;9. promise.catch 捕捉异常&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">Promise.resolve(&#39;1&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">  .finally(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;finally1&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    throw new Error(&#39;我是finally中抛出的异常&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">  })</span></span>
<span class="line"><span style="color:#A6ACCD;">  .then(res =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;finally后面的then函数&#39;, res)</span></span>
<span class="line"><span style="color:#A6ACCD;">  })</span></span>
<span class="line"><span style="color:#A6ACCD;">  .catch(err =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;捕获错误&#39;, err)</span></span>
<span class="line"><span style="color:#A6ACCD;">  })</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&#39;finally1&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">&#39;捕获错误&#39; Error: 我是finally中抛出的异常</span></span></code></pre></div><p>或者：</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">Promise.resolve(&#39;1&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">  .then(res =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    throw new Error(&#39;我是then中抛出的异常&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">  })</span></span>
<span class="line"><span style="color:#A6ACCD;">  .catch(err =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;捕获错误&#39;, err)</span></span>
<span class="line"><span style="color:#A6ACCD;">  })</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&#39;捕获错误&#39; Error: 我是then中抛出的异常</span></span></code></pre></div><h3 id="_10-promise-all" tabindex="-1">10.promise.all <a class="header-anchor" href="#_10-promise-all" aria-label="Permalink to &quot;10.promise.all&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function runAsync (x) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const p = new Promise(r =&gt; setTimeout(() =&gt; r(x, console.log(x)), 1000))</span></span>
<span class="line"><span style="color:#A6ACCD;">    return p</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">Promise.all([runAsync(1), runAsync(2), runAsync(3)]).then(res =&gt; console.log(res))</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">1</span></span>
<span class="line"><span style="color:#A6ACCD;">2</span></span>
<span class="line"><span style="color:#A6ACCD;">3</span></span>
<span class="line"><span style="color:#A6ACCD;">[1, 2, 3]</span></span></code></pre></div><h3 id="_11-promise-all-resolve与reject" tabindex="-1">11.promise.all resolve与reject <a class="header-anchor" href="#_11-promise-all-resolve与reject" aria-label="Permalink to &quot;11.promise.all resolve与reject&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function runAsync (x) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  const p = new Promise(r =&gt; setTimeout(() =&gt; r(x, console.log(x)), 1000))</span></span>
<span class="line"><span style="color:#A6ACCD;">  return p</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">function runReject (x) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  const p = new Promise((res, rej) =&gt; setTimeout(() =&gt; rej(\`Error: \${x}\`, console.log(x)), 1000 * x))</span></span>
<span class="line"><span style="color:#A6ACCD;">  return p</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">Promise.all([runAsync(1), runReject(4), runAsync(3), runReject(2)])</span></span>
<span class="line"><span style="color:#A6ACCD;">       .then(res =&gt; console.log(&#39;res&gt;&gt;&gt;&#39;, res))</span></span>
<span class="line"><span style="color:#A6ACCD;">       .catch(err =&gt; console.log(&#39;err&gt;&gt;&gt;&#39;, err))</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 1s后输出</span></span>
<span class="line"><span style="color:#A6ACCD;">1</span></span>
<span class="line"><span style="color:#A6ACCD;">3</span></span>
<span class="line"><span style="color:#A6ACCD;">// 2s后输出</span></span>
<span class="line"><span style="color:#A6ACCD;">2</span></span>
<span class="line"><span style="color:#A6ACCD;">Error: 2</span></span>
<span class="line"><span style="color:#A6ACCD;">// 4s后输出</span></span>
<span class="line"><span style="color:#A6ACCD;">4</span></span></code></pre></div><h3 id="_12-async-await" tabindex="-1">12. async &amp; await <a class="header-anchor" href="#_12-async-await" aria-label="Permalink to &quot;12. async &amp; await&quot;">​</a></h3><p><strong>遇到await会阻塞后面的代码，先执行async外面的同步代码，同步代码执行完，再回到async内部，继续执行await后面的代码。</strong></p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">async function async1() {</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(&quot;async1 start&quot;);</span></span>
<span class="line"><span style="color:#A6ACCD;">  await async2();</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(&quot;async1 end&quot;);</span></span>
<span class="line"><span style="color:#A6ACCD;">  setTimeout(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;timer1&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">  }, 0)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">async function async2() {</span></span>
<span class="line"><span style="color:#A6ACCD;">  setTimeout(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;timer2&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">  }, 0)</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(&quot;async2&quot;);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">async1();</span></span>
<span class="line"><span style="color:#A6ACCD;">setTimeout(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(&#39;timer3&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">}, 0)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(&quot;start&quot;)</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">async1 start</span></span>
<span class="line"><span style="color:#A6ACCD;">async2</span></span>
<span class="line"><span style="color:#A6ACCD;">start</span></span>
<span class="line"><span style="color:#A6ACCD;">async1 end</span></span>
<span class="line"><span style="color:#A6ACCD;">timer2</span></span>
<span class="line"><span style="color:#A6ACCD;">timer3</span></span>
<span class="line"><span style="color:#A6ACCD;">timer1</span></span></code></pre></div><ol><li>首先进入<code>async1</code>，打印出<code>async1 start</code>；</li><li>之后遇到<code>async2</code>，进入<code>async2</code>，遇到定时器<code>timer2</code>，加入宏任务队列，之后打印<code>async2</code>；</li><li>由于<code>async2</code>阻塞了后面代码的执行，所以执行后面的定时器<code>timer3</code>，将其加入宏任务队列，之后打印<code>start</code>；</li><li>然后执行async2后面的代码，打印出<code>async1 end</code>，遇到定时器timer1，将其加入宏任务队列；</li><li>最后，宏任务队列有三个任务，先后顺序为<code>timer2</code>，<code>timer3</code>，<code>timer1</code>，没有微任务，所以直接所有的宏任务按照先进先出的原则执行。</li></ol><h3 id="_13-async-await-与-promise-resolve" tabindex="-1">13. async await 与 promise.resolve <a class="header-anchor" href="#_13-async-await-与-promise-resolve" aria-label="Permalink to &quot;13. async await 与 promise.resolve&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">async function async1 () {</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(&#39;async1 start&#39;);</span></span>
<span class="line"><span style="color:#A6ACCD;">  await new Promise(resolve =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;promise1&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    resolve(&#39;promise1 resolve&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">  }).then(res =&gt; console.log(res))</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(&#39;async1 success&#39;);</span></span>
<span class="line"><span style="color:#A6ACCD;">  return &#39;async1 end&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(&#39;srcipt start&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">async1().then(res =&gt; console.log(res))</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(&#39;srcipt end&#39;)</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">script start</span></span>
<span class="line"><span style="color:#A6ACCD;">async1 start</span></span>
<span class="line"><span style="color:#A6ACCD;">promise1</span></span>
<span class="line"><span style="color:#A6ACCD;">script end</span></span>
<span class="line"><span style="color:#A6ACCD;">promise1 resolve</span></span>
<span class="line"><span style="color:#A6ACCD;">async1 success</span></span>
<span class="line"><span style="color:#A6ACCD;">async1 end</span></span></code></pre></div><ol><li>首先 <strong>srcipt start</strong></li><li>进入async1()，打印<strong>async1 start</strong>，Promise 里的会立即执行，打印<strong>promise1</strong></li><li>由于async1()阻塞了后面代码的执行，所以打印<strong>srcipt end</strong></li><li>执行 Promise.then 打印<strong>promise1 resolve</strong></li><li>打印<strong>async1 success</strong></li><li>打印<strong>async1 end</strong></li></ol><h3 id="_14-await-后面的代码进入了微任务队列" tabindex="-1">14.await 后面的代码进入了微任务队列 <a class="header-anchor" href="#_14-await-后面的代码进入了微任务队列" aria-label="Permalink to &quot;14.await 后面的代码进入了微任务队列&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">async function async1() {</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(&quot;async1 start&quot;);</span></span>
<span class="line"><span style="color:#A6ACCD;">  await async2();</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(&quot;async1 end&quot;);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">async function async2() {</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(&quot;async2&quot;);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(&quot;script start&quot;);</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">setTimeout(function() {</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(&quot;setTimeout&quot;);</span></span>
<span class="line"><span style="color:#A6ACCD;">}, 0);</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">async1();</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">new Promise(resolve =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(&quot;promise1&quot;);</span></span>
<span class="line"><span style="color:#A6ACCD;">  resolve();</span></span>
<span class="line"><span style="color:#A6ACCD;">}).then(function() {</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(&quot;promise2&quot;);</span></span>
<span class="line"><span style="color:#A6ACCD;">});</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(&#39;script end&#39;)</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">script start</span></span>
<span class="line"><span style="color:#A6ACCD;">async1 start</span></span>
<span class="line"><span style="color:#A6ACCD;">async2</span></span>
<span class="line"><span style="color:#A6ACCD;">promise1</span></span>
<span class="line"><span style="color:#A6ACCD;">script end</span></span>
<span class="line"><span style="color:#A6ACCD;">async1 end</span></span>
<span class="line"><span style="color:#A6ACCD;">promise2</span></span>
<span class="line"><span style="color:#A6ACCD;">setTimeout</span></span></code></pre></div><p>代码执行过程如下：</p><ol><li>开头定义了async1和async2两个函数，但是并未执行，执行script中的代码，所以打印出script start；</li><li>遇到定时器Settimeout，它是一个宏任务，将其加入到宏任务队列；</li><li>之后执行函数async1，首先打印出async1 start；</li><li>遇到await，执行async2，打印出async2，并阻断后面代码的执行，将后面的代码加入到微任务队列；</li><li>然后跳出async1和async2，遇到Promise，打印出promise1；</li><li>遇到resolve，将其加入到微任务队列，然后执行后面的script代码，打印出script end；</li><li>之后就该执行微任务队列了，首先打印出async1 end，然后打印出promise2；</li><li>执行完微任务队列，就开始执行宏任务队列中的定时器，打印出setTimeout。</li></ol><h3 id="_15-async-await-与-reject" tabindex="-1">15.async await 与 reject <a class="header-anchor" href="#_15-async-await-与-reject" aria-label="Permalink to &quot;15.async await 与 reject&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">async function async1 () {</span></span>
<span class="line"><span style="color:#A6ACCD;">  await async2();</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(&#39;async1&#39;);</span></span>
<span class="line"><span style="color:#A6ACCD;">  return &#39;async1 success&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">async function async2 () {</span></span>
<span class="line"><span style="color:#A6ACCD;">  return new Promise((resolve, reject) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;async2&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    reject(&#39;error&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">  })</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">async1().then(res =&gt; console.log(res))</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">async2</span></span>
<span class="line"><span style="color:#A6ACCD;">Uncaught (in promise) error</span></span></code></pre></div><p>可以看到，如果async函数中抛出了错误，就会终止错误结果，不会继续向下执行。</p><h2 id="_2-this" tabindex="-1">2. this <a class="header-anchor" href="#_2-this" aria-label="Permalink to &quot;2. this&quot;">​</a></h2><h3 id="_1-全局执行环境" tabindex="-1">1.全局执行环境 <a class="header-anchor" href="#_1-全局执行环境" aria-label="Permalink to &quot;1.全局执行环境&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function foo() {</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log( this.a );</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">function doFoo() {</span></span>
<span class="line"><span style="color:#A6ACCD;">  foo();</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">var obj = {</span></span>
<span class="line"><span style="color:#A6ACCD;">  a: 1,</span></span>
<span class="line"><span style="color:#A6ACCD;">  doFoo: doFoo</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">var a = 2; </span></span>
<span class="line"><span style="color:#A6ACCD;">obj.doFoo()</span></span></code></pre></div><p>输出结果：2</p><p>在Javascript中，this指向函数执行时的当前对象。在执行foo的时候，执行环境就是doFoo函数，执行环境为全局。所以，foo中的this是指向window的，所以会打印出2。</p><h3 id="_2-箭头函数this与非箭头函数" tabindex="-1">2.箭头函数this与非箭头函数 <a class="header-anchor" href="#_2-箭头函数this与非箭头函数" aria-label="Permalink to &quot;2.箭头函数this与非箭头函数&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var a = 10</span></span>
<span class="line"><span style="color:#A6ACCD;">var obj = {</span></span>
<span class="line"><span style="color:#A6ACCD;">  a: 20,</span></span>
<span class="line"><span style="color:#A6ACCD;">  say: () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(this.a)</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">obj.say() </span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">var anotherObj = { a: 30 } </span></span>
<span class="line"><span style="color:#A6ACCD;">obj.say.apply(anotherObj)</span></span></code></pre></div><p>输出结果：10 10</p><p>我么知道，箭头函数时不绑定this的，它的this来自原其父级所处的上下文，所以首先会打印全局中的 a 的值10。后面虽然让say方法指向了另外一个对象，但是仍不能改变箭头函数的特性，它的this仍然是指向全局的，所以依旧会输出10。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var a = 10  </span></span>
<span class="line"><span style="color:#A6ACCD;">var obj = {  </span></span>
<span class="line"><span style="color:#A6ACCD;">  a: 20,  </span></span>
<span class="line"><span style="color:#A6ACCD;">  say(){</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(this.a)  </span></span>
<span class="line"><span style="color:#A6ACCD;">  }  </span></span>
<span class="line"><span style="color:#A6ACCD;">}  </span></span>
<span class="line"><span style="color:#A6ACCD;">obj.say()   </span></span>
<span class="line"><span style="color:#A6ACCD;">var anotherObj={a:30}   </span></span>
<span class="line"><span style="color:#A6ACCD;">obj.say.apply(anotherObj)</span></span></code></pre></div><p>输出结果：20 30</p><p>这时，say方法中的this就会指向他所在的对象，输出其中的a的值。</p><h3 id="_3-call-null-在严格模式与非严格模式" tabindex="-1">3.call(null)在严格模式与非严格模式 <a class="header-anchor" href="#_3-call-null-在严格模式与非严格模式" aria-label="Permalink to &quot;3.call(null)在严格模式与非严格模式&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function a() {</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(this);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">a.call(null);</span></span></code></pre></div><p>打印结果：window对象</p><p>根据ECMAScript262规范规定：如果第一个参数传入的对象调用者是null或者undefined，call方法将把全局对象（浏览器上是window对象）作为this的值。所以，不管传入null 还是 undefined，其this都是全局对象window。所以，在浏览器上答案是输出 window 对象。</p><p>要注意的是，在严格模式中，null 就是 null，undefined 就是 undefined：</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&#39;use strict&#39;;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">function a() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(this);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">a.call(null); // null</span></span>
<span class="line"><span style="color:#A6ACCD;">a.call(undefined); // undefined</span></span></code></pre></div><h3 id="_4-函数表达式" tabindex="-1">4. 函数表达式 <a class="header-anchor" href="#_4-函数表达式" aria-label="Permalink to &quot;4. 函数表达式&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var obj = {</span></span>
<span class="line"><span style="color:#A6ACCD;">   say: function() {</span></span>
<span class="line"><span style="color:#A6ACCD;">     var f1 = () =&gt;  {</span></span>
<span class="line"><span style="color:#A6ACCD;">       console.log(&quot;1111&quot;, this);</span></span>
<span class="line"><span style="color:#A6ACCD;">     }</span></span>
<span class="line"><span style="color:#A6ACCD;">     f1();</span></span>
<span class="line"><span style="color:#A6ACCD;">   },</span></span>
<span class="line"><span style="color:#A6ACCD;">   pro: {</span></span>
<span class="line"><span style="color:#A6ACCD;">     getPro:() =&gt;  {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(this);</span></span>
<span class="line"><span style="color:#A6ACCD;">     }</span></span>
<span class="line"><span style="color:#A6ACCD;">   }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">var o = obj.say;</span></span>
<span class="line"><span style="color:#A6ACCD;">o();</span></span>
<span class="line"><span style="color:#A6ACCD;">obj.say();</span></span>
<span class="line"><span style="color:#A6ACCD;">obj.pro.getPro();</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">1111 window对象</span></span>
<span class="line"><span style="color:#A6ACCD;">1111 obj对象</span></span>
<span class="line"><span style="color:#A6ACCD;">window对象</span></span></code></pre></div><ol><li>o()，o是在全局执行的，而f1是箭头函数，它是没有绑定this的，它的this指向其父级的this，其父级say方法的this指向的是全局作用域，所以会打印出window；</li><li>obj.say()，谁调用say，say 的this就指向谁，所以此时this指向的是obj对象；</li><li>obj.pro.getPro()，我们知道，箭头函数时不绑定this的，getPro处于pro中，而对象不构成单独的作用域，所以箭头的函数的this就指向了全局作用域window。</li></ol><h3 id="_5-函数中自执行函数与匿名函数" tabindex="-1">5.函数中自执行函数与匿名函数 <a class="header-anchor" href="#_5-函数中自执行函数与匿名函数" aria-label="Permalink to &quot;5.函数中自执行函数与匿名函数&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var myObject = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    foo: &quot;bar&quot;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    func: function() {</span></span>
<span class="line"><span style="color:#A6ACCD;">        var self = this;</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(this.foo);  </span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(self.foo);  </span></span>
<span class="line"><span style="color:#A6ACCD;">        (function() {</span></span>
<span class="line"><span style="color:#A6ACCD;">            console.log(this.foo);  </span></span>
<span class="line"><span style="color:#A6ACCD;">            console.log(self.foo);  </span></span>
<span class="line"><span style="color:#A6ACCD;">        }());</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span>
<span class="line"><span style="color:#A6ACCD;">myObject.func();</span></span></code></pre></div><p>输出结果：bar bar undefined bar</p><ol><li>首先func是由myObject调用的，this指向myObject。又因为var self = this;所以self指向myObject。</li><li>这个立即执行匿名函数表达式是由window调用的，this指向window 。立即执行匿名函数的作用域处于myObject.func的作用域中，在这个作用域找不到self变量，沿着作用域链向上查找self变量，找到了指向 myObject对象的self。</li></ol><h3 id="_6-对象中自执行函数与匿名函数" tabindex="-1">6.对象中自执行函数与匿名函数 <a class="header-anchor" href="#_6-对象中自执行函数与匿名函数" aria-label="Permalink to &quot;6.对象中自执行函数与匿名函数&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">window.number = 2;</span></span>
<span class="line"><span style="color:#A6ACCD;">var obj = {</span></span>
<span class="line"><span style="color:#A6ACCD;"> number: 3,</span></span>
<span class="line"><span style="color:#A6ACCD;"> db1: (function(){</span></span>
<span class="line"><span style="color:#A6ACCD;">   console.log(this);</span></span>
<span class="line"><span style="color:#A6ACCD;">   this.number *= 4;</span></span>
<span class="line"><span style="color:#A6ACCD;">   return function(){</span></span>
<span class="line"><span style="color:#A6ACCD;">     console.log(this);</span></span>
<span class="line"><span style="color:#A6ACCD;">     this.number *= 5;</span></span>
<span class="line"><span style="color:#A6ACCD;">   }</span></span>
<span class="line"><span style="color:#A6ACCD;"> })()</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">var db1 = obj.db1;</span></span>
<span class="line"><span style="color:#A6ACCD;">db1();</span></span>
<span class="line"><span style="color:#A6ACCD;">obj.db1();</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(obj.number);     // 15</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(window.number);  // 40</span></span></code></pre></div><ol><li>执行db1()时，this指向全局作用域，所以window.number * 4 = 8，然后执行匿名函数， 所以window.number * 5 = 40；</li><li>执行obj.db1();时，this指向obj对象，执行匿名函数，所以obj.numer * 5 = 15。</li></ol><h3 id="_7-arguments" tabindex="-1">7.arguments <a class="header-anchor" href="#_7-arguments" aria-label="Permalink to &quot;7.arguments&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var length = 10;</span></span>
<span class="line"><span style="color:#A6ACCD;">function fn() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(this.length);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"> </span></span>
<span class="line"><span style="color:#A6ACCD;">var obj = {</span></span>
<span class="line"><span style="color:#A6ACCD;">  length: 5,</span></span>
<span class="line"><span style="color:#A6ACCD;">  method: function(fn) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    fn();</span></span>
<span class="line"><span style="color:#A6ACCD;">    arguments[0]();</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span>
<span class="line"><span style="color:#A6ACCD;"> </span></span>
<span class="line"><span style="color:#A6ACCD;">obj.method(fn, 1);</span></span></code></pre></div><p>输出结果： 10 2</p><ol><li>第一次执行<code>fn()</code>，<code>this</code>指向<code>window</code>对象，输出10。</li><li>第二次执行<code>arguments[0]()</code>，相当于<code>arguments</code>调用方法，<code>this</code>指向<code>arguments</code>，而这里传了两个参数，故输出<code>arguments</code>长度为2。</li></ol><h3 id="_8-对象的方法中调用方法" tabindex="-1">8.对象的方法中调用方法 <a class="header-anchor" href="#_8-对象的方法中调用方法" aria-label="Permalink to &quot;8.对象的方法中调用方法&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var a = 1;</span></span>
<span class="line"><span style="color:#A6ACCD;">function printA(){</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(this.a);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">var obj={</span></span>
<span class="line"><span style="color:#A6ACCD;">  a:2,</span></span>
<span class="line"><span style="color:#A6ACCD;">  foo:printA,</span></span>
<span class="line"><span style="color:#A6ACCD;">  bar:function(){</span></span>
<span class="line"><span style="color:#A6ACCD;">    printA();</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">obj.foo(); // 2</span></span>
<span class="line"><span style="color:#A6ACCD;">obj.bar(); // 1</span></span>
<span class="line"><span style="color:#A6ACCD;">var foo = obj.foo;</span></span>
<span class="line"><span style="color:#A6ACCD;">foo(); // 1</span></span></code></pre></div><p>输出结果： 2 1 1</p><ol><li>obj.foo()，foo 的this指向obj对象，所以a会输出2；</li><li>obj.bar()，printA在bar方法中执行，所以此时printA的this指向的是window，所以会输出1；</li><li>foo()，foo是在全局对象中执行的，所以其this指向的是window，所以会输出1；</li></ol><h3 id="_9-匿名函数" tabindex="-1">9.匿名函数 <a class="header-anchor" href="#_9-匿名函数" aria-label="Permalink to &quot;9.匿名函数&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var x = 3;</span></span>
<span class="line"><span style="color:#A6ACCD;">var y = 4;</span></span>
<span class="line"><span style="color:#A6ACCD;">var obj = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    x: 1,</span></span>
<span class="line"><span style="color:#A6ACCD;">    y: 6,</span></span>
<span class="line"><span style="color:#A6ACCD;">    getX: function() {</span></span>
<span class="line"><span style="color:#A6ACCD;">        var x = 5;</span></span>
<span class="line"><span style="color:#A6ACCD;">        return function() {</span></span>
<span class="line"><span style="color:#A6ACCD;">            return this.x;</span></span>
<span class="line"><span style="color:#A6ACCD;">        }();</span></span>
<span class="line"><span style="color:#A6ACCD;">    },</span></span>
<span class="line"><span style="color:#A6ACCD;">    getY: function() {</span></span>
<span class="line"><span style="color:#A6ACCD;">        var y = 7;</span></span>
<span class="line"><span style="color:#A6ACCD;">        return this.y;</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(obj.getX()) // 3</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(obj.getY()) // 6</span></span></code></pre></div><p>输出结果：3 6</p><ol><li>我们知道，匿名函数的this是指向全局对象的，所以this指向window，会打印出3；</li><li>getY是由obj调用的，所以其this指向的是obj对象，会打印出6。</li></ol>`,109),o=[p];function c(t,i,r,C,A,y){return n(),a("div",null,o)}const D=s(e,[["render",c]]);export{h as __pageData,D as default};
