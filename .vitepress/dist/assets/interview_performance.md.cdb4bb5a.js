import{_ as t,o as a,c as l,U as e}from"./chunks/framework.9adb0f96.js";const i="/blog/assets/性能优化.e3c2089c.png",r="/blog/assets/image-20230712130556518.882bdefa.png",o="/blog/assets/3UhlOxRc0j8Vc4DGd4dt.1c157716.png",h="/blog/assets/image-20230712220950790.f998f5c6.png",d="/blog/assets/24Y3T5sWNuZD9fKhkuER.f5e87607.svg",s="/blog/assets/Se4TiXIdp8jtLJVScWed.30fbfb02.svg",n="/blog/assets/WZM0n4aXah67lEyZugOT.dc2dcf3a.svg",c="/blog/assets/clHG8Yv239lXsGWD6Iu6.a2eaf9ee.svg",b="/blog/assets/xKxwKagiz8RliuOI2Xtc.b3b0cc62.svg",u="/blog/assets/image-20230712224834921.a0fe385d.png",p="/blog/assets/image-20230713081150851.70acc1ae.png",m="/blog/assets/image-20230713081419032.411f6844.png",S=JSON.parse('{"title":"web 性能测试","description":"","frontmatter":{},"headers":[],"relativePath":"interview/performance.md","filePath":"interview/performance.md","lastUpdated":1691333079000}'),f={name:"interview/performance.md"},P=e('<p><img src="'+i+'" alt="性能优化"></p><h2 id="性能优化介绍" tabindex="-1">性能优化介绍 <a class="header-anchor" href="#性能优化介绍" aria-label="Permalink to &quot;性能优化介绍&quot;">​</a></h2><h2 id="什么是性能" tabindex="-1">什么是性能 <a class="header-anchor" href="#什么是性能" aria-label="Permalink to &quot;什么是性能&quot;">​</a></h2><p>MDN上的web性能定义：web性能是网站或应用程序的客观度量和可感知的用户体验。</p><ul><li>减少整体加载时间：减小文件体积、减少HTTP请求、使用预加载</li><li>使网站尽快可用：仅加载首屏内容，其他内容根据需要进行懒加载</li><li>平滑和交互性：使用css替代js动画、较少UI重绘</li><li>感知表现：你的用户可能不能做得更快，但你可以让用户感觉更快。耗时操作要给用户反馈，比如加载动画、进度条、骨架屏等提示信息</li><li>性能测定：性能指标、性能测试、性能监控持续优化</li></ul><h2 id="如何进行web性能优化" tabindex="-1">如何进行web性能优化 <a class="header-anchor" href="#如何进行web性能优化" aria-label="Permalink to &quot;如何进行web性能优化&quot;">​</a></h2><ol><li>首先需要了解性能指标——多块才算快？</li><li>使用专业的工具可量化地评估出网站或应用的性能表现</li><li>立足于网站页面响应的生命周期，分析出造成性能表现的原因</li><li>进行技术改造，可行性分析等具体的优化实施</li><li>迭代优化</li></ol><h3 id="性能指标" tabindex="-1">性能指标 <a class="header-anchor" href="#性能指标" aria-label="Permalink to &quot;性能指标&quot;">​</a></h3><ul><li>RAIL 性能模型</li><li>基于用户体验的核心指标</li><li>新一代性能指标：Web Vitals</li></ul><h3 id="性能测量" tabindex="-1">性能测量 <a class="header-anchor" href="#性能测量" aria-label="Permalink to &quot;性能测量&quot;">​</a></h3><ul><li>浏览器DevTools调试工具</li><li>网络监控分析</li><li>性能监控分析</li><li>灯塔（Lighthouse）</li><li>网站整体质量评估，并给出优化建议</li><li>WebPageTest</li><li>多测试地点</li><li>全面的性能报告</li></ul><h3 id="生命周期" tabindex="-1">生命周期 <a class="header-anchor" href="#生命周期" aria-label="Permalink to &quot;生命周期&quot;">​</a></h3><p><img src="'+r+'" alt="image-20230712130556518"></p><h3 id="优化方案" tabindex="-1">优化方案 <a class="header-anchor" href="#优化方案" aria-label="Permalink to &quot;优化方案&quot;">​</a></h3><ul><li>从请求发出到收到响应的优化：DNS查询、HTTP长连接、HTTP2、HTTP压缩、HTTP缓存</li><li>关键渲染路径优化，比如是否存在不必要的重绘和回流</li><li>加载过程的优化，比如延长加载，是否有不需要在首屏展示的非关键信息，占用了页面加载时间</li><li>资源优化，比如图片、视频等不同格式类型会有不同的使用场景，在使用过程中是否恰当</li><li>构建优化，比如压缩合并，基于 webpack 构建优化方案</li></ul><h2 id="web-性能指标" tabindex="-1">web 性能指标 <a class="header-anchor" href="#web-性能指标" aria-label="Permalink to &quot;web 性能指标&quot;">​</a></h2><h2 id="rail-性能模型" tabindex="-1">RAIL 性能模型 <a class="header-anchor" href="#rail-性能模型" aria-label="Permalink to &quot;RAIL 性能模型&quot;">​</a></h2><ul><li>响应 Response:：应该尽可能快速的响应用户(感知延迟之前接收到操作的反馈)（100ms内） <ul><li>比如在点击按钮向后台发起某项业务处理请求时，首先反馈给用户开始处理的提示，然后在处理完成的回调后反馈完成的提示</li></ul></li><li>动画 Animation：展示动画每一帧以16ms进行渲染，保持一致性避免卡顿</li><li>空闲 Idel：使用js主线程应把任务划分到执行时间小于50ms片段，这样可以释放线程进行用户交互</li><li>加载：应该小于5s的时间加载完成网站，并且可以进行交互</li></ul><h2 id="基于用户体验的性能指标" tabindex="-1">基于用户体验的性能指标 <a class="header-anchor" href="#基于用户体验的性能指标" aria-label="Permalink to &quot;基于用户体验的性能指标&quot;">​</a></h2><h3 id="fcp-first-contentful-paint-首次内容绘制" tabindex="-1">FCP(First Contentful Paint) 首次内容绘制 <a class="header-anchor" href="#fcp-first-contentful-paint-首次内容绘制" aria-label="Permalink to &quot;FCP(First Contentful Paint) 首次内容绘制&quot;">​</a></h3><p>浏览器首次绘制来自DOM的内容的时间，内容必须是文本、图片（包含背景图）、非白色的canvas或SVG，包括带有正在加载中的web字体的文本（下图二即是FCP）</p><p><img src="'+o+'" alt="来自 google.com 的 FCP 时间轴"></p><h4 id="速度指标" tabindex="-1">速度指标 <a class="header-anchor" href="#速度指标" aria-label="Permalink to &quot;速度指标&quot;">​</a></h4><table><thead><tr><th>FCP时间（m）</th><th>颜色编码</th><th>FCP分数（HTTP存档百分位数）</th></tr></thead><tbody><tr><td>0-2</td><td>绿色（快速）</td><td>75-100</td></tr><tr><td>2-4</td><td>橙色（中等）</td><td>50-74</td></tr><tr><td>&gt;4</td><td>红色（慢）</td><td>0-49</td></tr></tbody></table><h4 id="优化方案-1" tabindex="-1">优化方案 <a class="header-anchor" href="#优化方案-1" aria-label="Permalink to &quot;优化方案&quot;">​</a></h4><p><a href="https://web.dev/fcp/#how-to-improve-fcp" target="_blank" rel="noreferrer">https://web.dev/fcp/#how-to-improve-fcp</a></p><h3 id="lcp-largest-contentful-paint-最大内容绘制" tabindex="-1">LCP(Largest Contentful Paint) 最大内容绘制 <a class="header-anchor" href="#lcp-largest-contentful-paint-最大内容绘制" aria-label="Permalink to &quot;LCP(Largest Contentful Paint) 最大内容绘制&quot;">​</a></h3><p>可视区域中最大的内容元素（占用资源最大）呈现到屏幕上的时间，用以估算页面的主要内容对用户可见时间。</p><p>LCP考虑的元素</p><ul><li>Img</li><li>Video 封面图</li><li>通过 url 函数加载背景图</li><li>文本节点或其他文本元素子级块级元素</li></ul><p><img src="'+h+'" alt="image-20230712220950790"></p><ul><li>LCP随着加载是会变化的，图上绿色的就是LCP</li></ul><h4 id="速度指标-1" tabindex="-1">速度指标 <a class="header-anchor" href="#速度指标-1" aria-label="Permalink to &quot;速度指标&quot;">​</a></h4><table><thead><tr><th>LCP时间（m）</th><th>颜色编码</th></tr></thead><tbody><tr><td>0-2</td><td>绿色（快速）</td></tr><tr><td>2-4</td><td>橙色（中等）</td></tr><tr><td>&gt;4</td><td>红色（慢）</td></tr></tbody></table><h4 id="优化方案-2" tabindex="-1">优化方案 <a class="header-anchor" href="#优化方案-2" aria-label="Permalink to &quot;优化方案&quot;">​</a></h4><p><a href="https://web.dev/optimize-lcp/" target="_blank" rel="noreferrer">https://web.dev/optimize-lcp/</a></p><h3 id="fid-first-input-delay-首次输入延迟" tabindex="-1">FID(First Input Delay) 首次输入延迟 <a class="header-anchor" href="#fid-first-input-delay-首次输入延迟" aria-label="Permalink to &quot;FID(First Input Delay) 首次输入延迟&quot;">​</a></h3><p>从用户第一次与页面交互到浏览器能够响应交互（单击链接、按钮）等到浏览器实际能够响应交互的时间</p><p>输入延迟是因为浏览器的主线程在忙于其他事情，如解析和执行大量计算的JavaScript</p><p>第一次输入延迟通常发生在第一次内容绘制(FCP)和可持续交互时间(TTI)之间，因为页面已经呈现了一些内容，但还不能可靠交互</p><p><img src="'+d+'" alt="带有 FCP 和 TTI 的示例页面加载跟踪"></p><h4 id="速度指标-2" tabindex="-1">速度指标 <a class="header-anchor" href="#速度指标-2" aria-label="Permalink to &quot;速度指标&quot;">​</a></h4><p><img src="'+s+'" alt="好的 fid 值为 2.5 秒，差的值大于 4.0 秒，中间的任何值都需要改进"></p><h4 id="优化方案-3" tabindex="-1">优化方案 <a class="header-anchor" href="#优化方案-3" aria-label="Permalink to &quot;优化方案&quot;">​</a></h4><p><a href="https://web.dev/fid/#how-to-imporve-fid" target="_blank" rel="noreferrer">https://web.dev/fid/#how-to-imporve-fid</a></p><h3 id="tti-time-to-interactive-完全达到可交互状态" tabindex="-1">TTI(Time to Interactive)完全达到可交互状态 <a class="header-anchor" href="#tti-time-to-interactive-完全达到可交互状态" aria-label="Permalink to &quot;TTI(Time to Interactive)完全达到可交互状态&quot;">​</a></h3><p>第一次达到完全可交互状态，可以持续响应用户输入。完全达到可交互状态的时间点是在最后一个长任务完成的时间，并在随后的5s内网络和主线程是空闲的。</p><p><img src="'+n+'" alt="显示 TTI 计算方式的页面加载时间轴"></p><h4 id="速度指标-3" tabindex="-1">速度指标 <a class="header-anchor" href="#速度指标-3" aria-label="Permalink to &quot;速度指标&quot;">​</a></h4><table><thead><tr><th>TTI时间（m）</th><th>颜色编码</th></tr></thead><tbody><tr><td>0-3.8</td><td>绿色（快速）</td></tr><tr><td>3.8-7.3</td><td>橙色（中等）</td></tr><tr><td>&gt;7.3</td><td>红色（慢）</td></tr></tbody></table><h4 id="优化方案-4" tabindex="-1">优化方案 <a class="header-anchor" href="#优化方案-4" aria-label="Permalink to &quot;优化方案&quot;">​</a></h4><p><a href="https://web.dev/tti/#how-to-improve-tti" target="_blank" rel="noreferrer">https://web.dev/tti/#how-to-improve-tti</a></p><h3 id="tbt-total-block-time-总阻塞时间" tabindex="-1">TBT(Total Block Time)总阻塞时间 <a class="header-anchor" href="#tbt-total-block-time-总阻塞时间" aria-label="Permalink to &quot;TBT(Total Block Time)总阻塞时间&quot;">​</a></h3><p>度量了FCP和TTI之间的总时间，在该时间范围内，主线程被阻塞足够长的时间以防止输入响应。</p><p>我们说主线程“被阻止”是因为浏览器无法中断正在进行的任务，如果用户在较长的任务中间与页面进行交互，则浏览器必须等待任务完成才能响应。给定的长任务的阻止时间是其持续时间超过50ms，页面的总阻塞时间=FCP+TTI之间发生的每个长任务的阻塞时间的总和。</p><p><img src="'+c+'" alt="主线程上的任务时间轴"></p><p>上方的时间轴上有五个任务，其中三个是长任务，因为这些任务的持续时间超过 50 毫秒。下图显示了各个长任务的阻塞时间：</p><p><img src="'+b+'" alt="显示阻塞时间的主线程任务时间轴"></p><p>因此，虽然在主线程上运行任务的总时间为 560 毫秒，但其中只有 345 毫秒被视为阻塞时间。</p><h4 id="速度指标-4" tabindex="-1">速度指标 <a class="header-anchor" href="#速度指标-4" aria-label="Permalink to &quot;速度指标&quot;">​</a></h4><table><thead><tr><th>TBT时间（ms）</th><th>颜色编码</th></tr></thead><tbody><tr><td>0-300</td><td>绿色（快速）</td></tr><tr><td>300-600</td><td>橙色（中等）</td></tr><tr><td>&gt;600</td><td>红色（慢）</td></tr></tbody></table><h4 id="优化方案-5" tabindex="-1">优化方案 <a class="header-anchor" href="#优化方案-5" aria-label="Permalink to &quot;优化方案&quot;">​</a></h4><p><a href="https://web.dev/tbt/#how-to-improve-tbt" target="_blank" rel="noreferrer">https://web.dev/tbt/#how-to-improve-tbt</a></p><h3 id="cls-cumulative-layout-shift-累计布局偏移" tabindex="-1"><strong>CLS(Cumulative Layout Shift) 累计布局偏移</strong> <a class="header-anchor" href="#cls-cumulative-layout-shift-累计布局偏移" aria-label="Permalink to &quot;**CLS(Cumulative Layout Shift) 累计布局偏移**&quot;">​</a></h3><p>CLS会测量在页面整个生命周期中发生的每个意外的布局移位的所有单独布局移位分数的总和，它是一种保证页面的视觉稳定性，从而提高用户体验的指标方案。</p><p><img src="'+u+'" alt="image-20230712224834921"></p><p>页面内容的意外移动通常是由于异步加载资源或将DOM元素动态添加到现有内容上方的页面而发生的。可以使用加载占位符使布局不变。</p><h4 id="速度指标-5" tabindex="-1">速度指标 <a class="header-anchor" href="#速度指标-5" aria-label="Permalink to &quot;速度指标&quot;">​</a></h4><table><thead><tr><th>CLS</th><th>颜色编码</th></tr></thead><tbody><tr><td>0-0.1</td><td>绿色（快速）</td></tr><tr><td>0.1-0.25</td><td>橙色（中等）</td></tr><tr><td>&gt;0.25</td><td>红色（慢）</td></tr></tbody></table><h4 id="优化方案-6" tabindex="-1">优化方案 <a class="header-anchor" href="#优化方案-6" aria-label="Permalink to &quot;优化方案&quot;">​</a></h4><p><a href="https://web.dev/cls/#how-to-improve-cls" target="_blank" rel="noreferrer">https://web.dev/cls/#how-to-improve-cls</a></p><h3 id="speed-index-速度指数" tabindex="-1">Speed Index 速度指数 <a class="header-anchor" href="#speed-index-速度指数" aria-label="Permalink to &quot;Speed Index 速度指数&quot;">​</a></h3><p>页面可视区域中内容的填充速度的指标，可以通过计算页面可见区域内容显示的平均时间来衡量。</p><h3 id="速度指标-6" tabindex="-1">速度指标 <a class="header-anchor" href="#速度指标-6" aria-label="Permalink to &quot;速度指标&quot;">​</a></h3><table><thead><tr><th>TBT时间（s）</th><th>颜色编码</th></tr></thead><tbody><tr><td>0-4.3</td><td>绿色（快速）</td></tr><tr><td>4.3-5.8</td><td>橙色（中等）</td></tr><tr><td>&gt;5.8</td><td>红色（慢）</td></tr></tbody></table><h2 id="web-vitals" tabindex="-1">web Vitals <a class="header-anchor" href="#web-vitals" aria-label="Permalink to &quot;web Vitals&quot;">​</a></h2><p>精简版性能指标，包括：</p><ul><li>加载体验</li><li>交互性</li><li>页面内容的视觉稳定性</li></ul><h3 id="core-web-vitals-与-web-vitals" tabindex="-1">core web Vitals 与 web Vitals <a class="header-anchor" href="#core-web-vitals-与-web-vitals" aria-label="Permalink to &quot;core web Vitals 与 web Vitals&quot;">​</a></h3><p><img src="'+p+'" alt="image-20230713081150851"></p><p>Core web Vitals 是应用所有web页面的子集，是其最重要的核心</p><p><img src="'+m+'" alt="image-20230713081419032"></p><ul><li>加载性能（LCP）-显示最大内容元素所需的时间</li><li>交互性（FID）-首次输入延迟时间</li><li>视觉稳定性（CLS）-累积布局配置偏移</li></ul><h3 id="测量web-vitals" tabindex="-1">测量Web Vitals <a class="header-anchor" href="#测量web-vitals" aria-label="Permalink to &quot;测量Web Vitals&quot;">​</a></h3><ul><li>性能测试工具，比如Lighthouse</li><li>使用web-vitals库</li><li>使用浏览器插件Web Vitals</li></ul><h1 id="web-性能测试" tabindex="-1">web 性能测试 <a class="header-anchor" href="#web-性能测试" aria-label="Permalink to &quot;web 性能测试&quot;">​</a></h1><ul><li>Lighthouse</li><li>Performance</li><li>Memory</li></ul><h1 id="网页生命周期" tabindex="-1">网页生命周期 <a class="header-anchor" href="#网页生命周期" aria-label="Permalink to &quot;网页生命周期&quot;">​</a></h1><ul><li>浏览器接收到 URL,到网络请求线程的开启</li><li>一个完整的 HTTP 请求的发出</li><li>服务器接收到请求并转到具体的处理后台</li><li>前后台之前的 HTTP 交互和涉及的缓存机制</li><li>浏览器接收到数据包后的关键渲染路径</li><li>JS 引擎的解析过程</li></ul><h2 id="网络请求线程开启" tabindex="-1">网络请求线程开启 <a class="header-anchor" href="#网络请求线程开启" aria-label="Permalink to &quot;网络请求线程开启&quot;">​</a></h2><p>浏览器会创建一个网络请求线程去下载所需的资源。</p><h3 id="进程与线程" tabindex="-1">进程与线程 <a class="header-anchor" href="#进程与线程" aria-label="Permalink to &quot;进程与线程&quot;">​</a></h3><ul><li>只要某个线程执行出错，将会导致进程崩溃</li><li>进程与进程之间相互隔离，保证了一个进程崩溃不影响另一个</li><li>线程之间共享所属进程数据</li><li>进程所占用的资源会在关闭后由操作系统回收</li></ul><h3 id="多进程浏览器" tabindex="-1">多进程浏览器 <a class="header-anchor" href="#多进程浏览器" aria-label="Permalink to &quot;多进程浏览器&quot;">​</a></h3><p>浏览器是多进程的，可以避免线程的崩溃影响进程</p><ul><li>GUI渲染进程</li><li>js 引擎线程</li><li>事件触发线程</li><li>定时器触发线程</li><li>异步 http 线程</li></ul><h2 id="建立http请求" tabindex="-1">建立HTTP请求 <a class="header-anchor" href="#建立http请求" aria-label="Permalink to &quot;建立HTTP请求&quot;">​</a></h2><p>主要工作分为两部分：DNS 解析和通信链路的建立</p><ul><li>首先发起请求的客户端浏览器要明确知道所访问的服务器地址</li><li>然后建立通往该服务器地址的路径</li></ul><h3 id="dns-解析" tabindex="-1">DNS 解析 <a class="header-anchor" href="#dns-解析" aria-label="Permalink to &quot;DNS 解析&quot;">​</a></h3><ol><li>浏览器缓存=》浏览器自身DNS缓存=》hosts 文件（递归查询）</li><li>本地域名=》根域名=》顶级域名=》权威域名（迭代查询）</li></ol><h3 id="网络模型" tabindex="-1">网络模型 <a class="header-anchor" href="#网络模型" aria-label="Permalink to &quot;网络模型&quot;">​</a></h3><ol><li>应用层：负责应用程序提供接口，使其可以使用网络服务，HTTP位于该层</li><li>表示层：负责数据的编码与解码，加密和解密，压缩与解压缩</li><li>会话层：负责协调系统之间的通信过程</li><li>传输层：负责端到端的建立，使报文能在端到端进行传输，TCP/UDP协议位于改层</li><li>数据链路层：在不可靠的物理链路上提供可靠的数据传输服务。包括组帧、物理编址、流量控制、差错控制、接入控制</li><li>物理层：定义网络物理拓扑、定义物理设备标准、比特的表示和信号传输模式</li></ol><h3 id="tcp-连接" tabindex="-1">TCP 连接 <a class="header-anchor" href="#tcp-连接" aria-label="Permalink to &quot;TCP 连接&quot;">​</a></h3><ul><li>TCP 三次握手</li><li>TCP 四次挥手</li></ul><h2 id="前后端的交互" tabindex="-1">前后端的交互 <a class="header-anchor" href="#前后端的交互" aria-label="Permalink to &quot;前后端的交互&quot;">​</a></h2><ul><li>反向代理服务器</li><li>后端处理流程</li><li>HTTP 相关协议特性</li><li>浏览器缓存</li></ul><h2 id="关键路径渲染" tabindex="-1">关键路径渲染 <a class="header-anchor" href="#关键路径渲染" aria-label="Permalink to &quot;关键路径渲染&quot;">​</a></h2><ol><li>解析文档，构建DOM树</li><li>解析css，构建 CSSOM 对象模型</li><li>渲染绘制：将上面两个对象模型合并为渲染树，该渲染树只包含渲染可见的节点 <ol><li>从所生成的DOM树根节点向下遍历每个节点，忽略所有不可见的节点</li><li>在CSSOM 中为每个可见的子节点找到对应规则应用</li><li>布局阶段：根据所得到的渲染树，计算他们在设备视图中的具体位置和大小，输出一个“盒模型”</li><li>绘制阶段：将每个节点的具体绘制方式转化为屏幕上的实际像素</li></ol></li></ol><h2 id="优化总结" tabindex="-1">优化总结 <a class="header-anchor" href="#优化总结" aria-label="Permalink to &quot;优化总结&quot;">​</a></h2><ol><li>DNS解析： <ul><li>当用户在浏览器中输入URL时，浏览器首先会进行DNS解析，将域名转换为服务器的IP地址。</li><li>优化方法：使用CDN（内容分发网络）来加速DNS解析过程，设置合理的DNS缓存时间。</li></ul></li><li>网络连接与传输： <ul><li>浏览器与服务器建立TCP连接，并通过HTTP请求获取页面资源。</li><li>优化方法：使用HTTP/2或HTTP/3协议以实现多路复用、头部压缩和服务器推送等特性，减少网络延迟和提高传输效率。</li></ul></li><li>服务器响应： <ul><li>服务器接收到HTTP请求后，处理请求并返回相应的资源。</li><li>优化方法：使用服务器端缓存和CDN来加速资源的响应，优化数据库查询和服务器代码以提高响应速度。</li></ul></li><li>页面构建： <ul><li>浏览器接收到服务器返回的HTML文件后，开始解析HTML结构，并构建DOM树。</li><li>优化方法：减小HTML文件的大小，避免嵌套过深的标签结构，移除不必要的标签和属性。</li></ul></li><li>资源加载： <ul><li>浏览器解析HTML时，会遇到CSS和JavaScript文件，并开始下载这些文件。</li><li>优化方法：压缩和合并CSS和JavaScript文件，使用异步加载或延迟加载技术，减少请求次数和文件大小。</li></ul></li><li>页面渲染： <ul><li>浏览器根据DOM树和CSS样式表计算布局，将页面元素绘制到屏幕上。</li><li>优化方法：避免使用强制同步布局（如频繁的<code>offsetTop</code>、<code>offsetLeft</code>等），减少重绘和回流操作，使用CSS动画而不是JavaScript实现动画效果。</li></ul></li><li>首次内容绘制（First Contentful Paint）： <ul><li>首次内容绘制是浏览器渲染页面的过程中，第一次将内容绘制到屏幕上的时间点。</li><li>优化方法：通过以上各个方面的优化，减少页面加载时间和资源大小，以加速首次内容绘制。</li></ul></li></ol>',111),q=[P];function T(g,w,k,_,v,x){return a(),l("div",null,q)}const D=t(f,[["render",T]]);export{S as __pageData,D as default};