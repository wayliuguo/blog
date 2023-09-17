import{_ as s,o as n,c as a,U as l}from"./chunks/framework.9adb0f96.js";const e="/blog/assets/前端监控.8155ee43.png",p="/blog/assets/1587821977023-bc304e9a-3b0f-488f-b5a4-6173daf65d04.2e7a2f90.png",o="/blog/assets/image-20230917214740454.d0840085.png",D=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"interview/monitor.md","filePath":"interview/monitor.md","lastUpdated":1694958545000}'),t={name:"interview/monitor.md"},i=l('<p><img src="'+e+`" alt="前端监控"></p><h2 id="介绍" tabindex="-1">介绍 <a class="header-anchor" href="#介绍" aria-label="Permalink to &quot;介绍&quot;">​</a></h2><p>前端监控（Frontend Monitoring）是一种用于捕获、分析和报告网站或应用程序中的异常、错误和性能问题的方法。通过前端监控，我们可以实时了解用户在使用我们的产品时可能遇到的问题，从而快速响应和解决这些问题。</p><h2 id="目标" tabindex="-1">目标 <a class="header-anchor" href="#目标" aria-label="Permalink to &quot;目标&quot;">​</a></h2><ol><li><p>稳定性</p><ul><li>监测前端应用程序中的异常情况，如 JavaScript 错误、未捕获的异常、网络错误等</li><li>通过监控异常，及时定位并解决问题，提高应用程序稳定性和用户体验</li><li>错误列表 <ul><li>js错误：js执行错误或者promise异常</li><li>资源异常：script、link等资源加载异常</li><li>接口错误：ajax或者fetch接口请求异常</li><li>白屏：页面空白</li></ul></li></ul></li><li><p>用户体验</p><ul><li>监测应用程序的性能指标，目的是识别潜在的性能瓶颈，优化应用程序的加载速度和响应时间</li><li>TTFB(time to first byte）(首字节时间)：发送请求到接收返回首个字节时间</li><li>FP(first paint)(首次绘制)：浏览器首次将向上绘制到屏幕上的时间</li><li>FCP(first content paint)(首次内容绘制)：将第一个dom渲染到dom的时间</li><li>FMP(First Meaningful pain)（首次有意义绘制）：网页加载过长中可以看到有意义内容时间点</li><li>FID(first input delay)（首次输入延迟）：用户首次和页面交互到页面响应交互时间</li><li>卡顿：超过50ms的长任务</li></ul></li><li><p>业务</p><ul><li>PV: page view,页面浏览量或点击量</li><li>UV: 访问某个站点的不同ip地址人数</li><li>页面停留时长</li></ul></li></ol><h2 id="监控流程" tabindex="-1">监控流程 <a class="header-anchor" href="#监控流程" aria-label="Permalink to &quot;监控流程&quot;">​</a></h2><ol><li>目标设定：确定需要监控的指标和目标，例如页面加载时间、错误率、用户行为等。</li><li>数据采集：使用适当的工具或技术来收集监控数据、或者自己封装函数进行监控数据</li><li>数据传输：将采集到的监控数据传输到监控系统或后端服务器。数据传输可以使用HTTP请求、WebSocket等方式进行</li><li>数据存储和处理：将传输过来的监控数据进行存储和处理。可以使用数据库、日志文件或数据分析平台进行存储和处理，以便后续的分析和展示</li><li>数据分析和可视化：对存储的监控数据进行分析和展示，生成可视化报表、图表或仪表盘，以帮助开发人员和运营人员了解系统的性能和用户行为</li><li>告警和预警：根据设定的监控指标和阈值，当监控数据超过或达到预设阈值时，触发告警或预警机制，通知相关人员进行处理</li><li>问题定位和优化：问题定位和优化：根据监控数据和告警信息，定位问题的具体原因和位置，进行优化和改进，提升系统的性能和用户体验</li></ol><h2 id="错误收集" tabindex="-1">错误收集 <a class="header-anchor" href="#错误收集" aria-label="Permalink to &quot;错误收集&quot;">​</a></h2><ul><li><p><code>try/catch</code> 中手动捕获</p></li><li><p><code>window.onerror()</code> 捕捉运行时错误</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">window.onerror = () =&gt; {...}</span></span></code></pre></div></li><li><p>监听<code>unhandledrejection</code>事件</p><ul><li>当 Promise 被 reject 冰球额没有得到处理的时候会触发</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">window.addEventListener(&#39;unhandledrejection&#39;, (e) =&gt; {...})</span></span></code></pre></div></li><li><p>资源加载错误：<code>window.addEventListener(&#39;error&#39;, e =&gt; {...})</code></p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">window.addEventListener(&quot;error&quot;, (event) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">	...</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span></code></pre></div></li><li><p>其他技术栈——vue.js</p><p>Vue 项目中有自带的错误不错机制：Vue.config.errorHandler(errorCaptured)，这里可以通过劫持Vue.config.errorHandler,当发生错误时，进行上报</p><p><img src="`+p+`" alt="image.png"></p></li></ul><h2 id="上报方式" tabindex="-1">上报方式 <a class="header-anchor" href="#上报方式" aria-label="Permalink to &quot;上报方式&quot;">​</a></h2><ul><li><p>手动上报</p><ul><li>优点：可控性强，可以自定义上报具体的数据</li><li>缺点：对业务代码侵入性强</li></ul></li><li><p>自动上报</p><ul><li>通过监听浏览器或应用程序内的内置事件来自动采集数据</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">window.onerror = function() {</span></span>
<span class="line"><span style="color:#A6ACCD;">	monitor.trackError(...)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div></li><li><p>使用1x1git上报</p><ul><li>防止跨域</li><li>不会携带当前域名 cookie</li><li>防止阻塞页面加载，影响用户体验</li><li>相比png、jpg，gif体积最小</li></ul></li></ul><h2 id="监控实现-监控指标" tabindex="-1">监控实现-监控指标 <a class="header-anchor" href="#监控实现-监控指标" aria-label="Permalink to &quot;监控实现-监控指标&quot;">​</a></h2><ol><li><p>环境信息</p><ul><li>用户id或者用户token</li><li>操作系统、浏览器类型、版本：记录userAgent 信息</li><li>url：正在监控的页面地址</li></ul></li><li><p>页面性能信息</p><ul><li><p>网络层面</p><ul><li>DNS解析时间、TCP连接时间、SSL握手时间等：页面加载过程中的各个阶段所需的时间。</li><li>资源加载时间：各个资源（如图片、CSS、JavaScript文件）的加载时间。</li><li>缓存命中率：页面加载时资源的缓存命中率。</li><li>数据传输耗时：浏览器接受内容所耗费的时间。</li><li>重定向耗时：页面请求重定向所耗费时间。</li><li>TTFB网络请求耗时：从发送请求到接收到服务器返回的首个字节所花费的时间，这个时间包含了网络请求时间、后端处理时间等等。</li></ul></li><li><p>页面展示层面</p><ul><li><p>页面大小：通常以字节数表示</p></li><li><p>卡顿：超过50ms的长任务</p></li><li><p>性能指标</p><p><img src="`+o+`" alt="image-20230917214740454"></p></li></ul></li></ul></li><li><p>错误信息</p><ul><li>错误类型（type）：错误的类型，如JavaScript错误、网络请求错误等。</li><li>错误消息（message）：错误的具体信息。</li><li>错误文件（filename）：错误发生的文件或URL。</li><li>错误行号（colno）、列号（lineno）：错误发生的行号和列号</li></ul></li><li><p>用户行为信息</p><ul><li>事件类型：用户进行的具体操作，如点击、滚动、输入等。</li><li>事件元素（srcElement）：操作发生在哪个元素上。</li><li>触发时间（timeStamp）：操作发生的时间。</li><li>事件参数：某些特定事件可能会带有额外的参数，如输入事件可能会有输入的内容</li></ul></li></ol><h2 id="监控实现——指标获取" tabindex="-1">监控实现——指标获取 <a class="header-anchor" href="#监控实现——指标获取" aria-label="Permalink to &quot;监控实现——指标获取&quot;">​</a></h2><ol><li><p>错误信息</p><p>window.addEventListener(&quot;error&quot;, (event) =&gt; {}) 中 <code>event</code> 的错误信息解析：（通过这个 <code>errorEvent</code> 我们可以获取到大多数需要的错误信息指标）</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">ErrorEvent {</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    isTrusted: true, // 表示事件是否由用户操作触发。当事件是由用户操作触发时，它的值为 \`true\`，否则为 \`false\`。</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    bubbles: false, // 指示事件是否会向上传播到父元素。当事件可以冒泡时，它的值为 \`true\`，否则为 \`false\`。</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    cancelBubble: false, // 表示是否取消进一步的事件传播。如果将 \`cancelBubble\` 设置为 \`true\`，则事件不会进一步冒泡到父元素。</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    cancelable: true, // 指示事件是否可以被取消。当事件可以取消时，它的值为 \`true\`，否则为 \`false\`。</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    colno: 34, // 表示发生错误的列号。</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    composed: false, // 指示事件是否可以穿过Shadow DOM边界传播。当事件可以穿过Shadow DOM边界时，它的值为 \`true\`，否则为 \`false\`。</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    currentTarget:Window {0: Window, window: Window, self: Window, document: document, name: &#39;&#39;, location: Location, …}, // 表示正在处理事件的当前元素。</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    defaultPrevented: false, // 指示事件的默认行为是否已经被取消。如果默认行为已经被取消，它的值为 \`true\`，否则为 \`false\`</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    error: { // 一个包含有关错误的对象。它可能包含错误的类型、消息和堆栈信息等。</span></span>
<span class="line"><span style="color:#A6ACCD;">    </span></span>
<span class="line"><span style="color:#A6ACCD;">        **message**: &quot;Cannot set properties of undefined (setting &#39;error&#39;)&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">        **stack**: &quot;TypeError: Cannot set properties of undefined (setting &#39;error&#39;)\\n    at errorClick (http://localhost:8080/:17:34)\\n    at HTMLInputElement.onclick (http://localhost:8080/:11:72)&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">        [[Prototype]]: Error</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    </span></span>
<span class="line"><span style="color:#A6ACCD;">    eventPhase: 0, // 表示事件传播的当前阶段。它的值可以是 0（无事件阶段）、1（捕获阶段）或 2（冒泡阶段）。</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    filename: &quot;http://localhost:8080/&quot;, // 表示发生错误的文件名或 URL。</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    lineno: 17, // 表示发生错误的行号。</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    message: &quot;Uncaught TypeError: Cannot set properties of undefined (setting &#39;error&#39;)&quot;, // 表示事件的错误消息。</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    returnValue: true, // 指示在事件处理完成后是否应继续执行事件的默认操作。如果应该继续执行默认操作，它的值为 \`true\`，否则为 \`false\`。</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    srcElement:Window {0: Window, window: Window, self: Window, document: document, name: &#39;&#39;, location: Location, …}, // 表示触发事件的元素。</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    target:Window {0: Window, window: Window, self: Window, document: document, name: &#39;&#39;, location: Location, …}, // 表示触发事件的元素。</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    timeStamp: 3406, // 表示事件生成的时间戳。</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    type: &quot;error&quot;, // 表示事件的类型。</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    [[Prototype]]: ErrorEvent</span></span>
<span class="line"><span style="color:#A6ACCD;">    </span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div></li><li><p>页面性能指标</p><p><code>Performance</code> 是 Web API 中的一个接口，提供了访问和测量网页性能数据的功能。通过 <code>Performance</code> 接口，你可以获取与网页加载、资源下载、执行时间等相关的性能指标。</p><p>以下是一些常用的 <code>Performance</code> 接口提供的属性和方法：</p><ul><li><code>performance.timing</code>: 返回包含与页面导航过程相关的时间戳的对象。可以通过该对象获取例如页面加载开始时间、DNS 解析时间、DOM 完全加载时间等。</li><li><code>performance.navigation</code>: 返回一个包含有关页面导航类型和重定向次数的对象。</li><li><code>performance.now()</code>: 返回当前时间相对于导航开始时的毫秒数。可用于测量执行时间和性能优化。</li><li><code>performance.mark(name)</code>: 创建一个用户定义的时间戳标记，用于测量代码执行的不同阶段或事件。</li><li><code>performance.measure(name, startMark, endMark)</code>: 根据给定的开始和结束时间戳标记计算两个时间点之间的时间差，并将结果存储为一个性能测量。</li><li><code>performance.getEntries()</code>: 返回一个数组，包含所有类型的性能条目（entries），如导航、资源、标记和测量。</li><li><code>performance.getEntriesByName(name, type)</code>: 返回一个数组，包含与指定名称和类型的性能条目匹配的条目。</li></ul><p>PerformanceObserver：一种异步方式监控网页的性能指标，主要获取页面动态性能指标</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const observer = new PerformanceObserver((list) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">  const entries = list.getEntries();</span></span>
<span class="line"><span style="color:#A6ACCD;">  entries.forEach((entry) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;加载时间:&#39;, entry.duration);</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 处理和记录性能数据</span></span>
<span class="line"><span style="color:#A6ACCD;">  });</span></span>
<span class="line"><span style="color:#A6ACCD;">});</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 指定要观察的性能指标类型（此处为导航相关）</span></span>
<span class="line"><span style="color:#A6ACCD;">observer.observe({ entryTypes: [&#39;navigation&#39;] });</span></span></code></pre></div><ol><li><p>网络层面</p><ul><li><p>DNS 解析时间</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const { </span></span>
<span class="line"><span style="color:#A6ACCD;">    domainLookupEnd, </span></span>
<span class="line"><span style="color:#A6ACCD;">    domainLookupStart </span></span>
<span class="line"><span style="color:#A6ACCD;">} = performance.getEntriesByType(&quot;navigation&quot;)[0];</span></span>
<span class="line"><span style="color:#A6ACCD;">let DNS = domainLookupEnd - domainLookupStart;</span></span></code></pre></div></li><li><p>TCP 连接时间</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const { </span></span>
<span class="line"><span style="color:#A6ACCD;">    connectEnd, </span></span>
<span class="line"><span style="color:#A6ACCD;">    secureConnectionStart </span></span>
<span class="line"><span style="color:#A6ACCD;">} = performance.getEntriesByType(&quot;navigation&quot;)[0];</span></span>
<span class="line"><span style="color:#A6ACCD;">let TCP = connectEnd - secureConnectionStart;</span></span></code></pre></div></li><li><p>SSL 握手时间</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const { </span></span>
<span class="line"><span style="color:#A6ACCD;">    connectEnd, </span></span>
<span class="line"><span style="color:#A6ACCD;">    connectStart </span></span>
<span class="line"><span style="color:#A6ACCD;">} = performance.getEntriesByType(&quot;navigation&quot;)[0];</span></span>
<span class="line"><span style="color:#A6ACCD;">let SSL = connectEnd - connectStart;</span></span></code></pre></div></li><li><p>资源加载时间</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const { </span></span>
<span class="line"><span style="color:#A6ACCD;">    loadEventStart, </span></span>
<span class="line"><span style="color:#A6ACCD;">    domContentLoadedEventStart </span></span>
<span class="line"><span style="color:#A6ACCD;">} = performance.getEntriesByType(&quot;navigation&quot;)[0];</span></span>
<span class="line"><span style="color:#A6ACCD;">let resourceLoadTime = loadEventStart - domContentLoadedEventStart;</span></span></code></pre></div></li><li><p>数据传输耗时</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const { </span></span>
<span class="line"><span style="color:#A6ACCD;">    responseEnd, </span></span>
<span class="line"><span style="color:#A6ACCD;">    responseStart </span></span>
<span class="line"><span style="color:#A6ACCD;">} = performance.getEntriesByType(&quot;navigation&quot;)[0];</span></span>
<span class="line"><span style="color:#A6ACCD;">let dataResponseTime = responseEnd - responseStart;</span></span></code></pre></div></li><li><p>重定向耗时</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const { </span></span>
<span class="line"><span style="color:#A6ACCD;">    redirectEnd, </span></span>
<span class="line"><span style="color:#A6ACCD;">    redirectStart </span></span>
<span class="line"><span style="color:#A6ACCD;">} = performance.getEntriesByType(&quot;navigation&quot;)[0];</span></span>
<span class="line"><span style="color:#A6ACCD;">let redirect = redirectEnd - redirectStart;</span></span></code></pre></div></li><li><p>TTFB 网络请求耗时</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const { </span></span>
<span class="line"><span style="color:#A6ACCD;">    responseStart, </span></span>
<span class="line"><span style="color:#A6ACCD;">    requestStart </span></span>
<span class="line"><span style="color:#A6ACCD;">} = performance.getEntriesByType(&quot;navigation&quot;)[0];</span></span>
<span class="line"><span style="color:#A6ACCD;">let TTFB = responseStart - requestStart;</span></span></code></pre></div></li></ul></li><li><p>页面展示层面</p><p>使用PerformanceObserver进行监测</p></li></ol></li></ol>`,15),c=[i];function r(C,d,A,u,y,m){return n(),a("div",null,c)}const h=s(t,[["render",r]]);export{D as __pageData,h as default};
