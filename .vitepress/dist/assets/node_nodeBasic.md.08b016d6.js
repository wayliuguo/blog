import{_ as s,o as l,c as a,U as n}from"./chunks/framework.9adb0f96.js";const e="/blog/assets/buffer.c8e793ef.png",g=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"node/nodeBasic.md","filePath":"node/nodeBasic.md","lastUpdated":1692011772000}'),p={name:"node/nodeBasic.md"},o=n(`<h2 id="全局对象" tabindex="-1">全局对象 <a class="header-anchor" href="#全局对象" aria-label="Permalink to &quot;全局对象&quot;">​</a></h2><ul><li>Global 的作用就是作为属主</li><li>常见全局变量 <ul><li>__filename: 返回正在执行脚本文件的觉得路径</li><li>__dirname: 返回正在执行脚本所在目录</li><li>timer类函数： 执行顺序与事件循环间的关系</li><li>process： 提供与当前进程互动的接口</li><li>require：实现模块的加载</li><li>module、exports：处理模块的导出</li></ul></li><li>process<div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&quot;start&quot;: &quot;set NODE_ENV=production &amp;&amp;  node ./1.globalObject.js&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">&quot;start&quot;: &quot;cross-env NODE_ENV=production node ./1.globalObject.js&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(p<wbr>rocess.env.NODE_ENV) // production</span></span></code></pre></div></li></ul><h2 id="核心模块-path" tabindex="-1">核心模块 path <a class="header-anchor" href="#核心模块-path" aria-label="Permalink to &quot;核心模块 path&quot;">​</a></h2><ul><li>path.basename(path, suffix):获取路径中的基础名称 <ul><li>path: 路径</li><li>suffix: 扩展名,如果扩展名相同结果则省略扩展名</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">console.log(path.basename(__filename, &#39;.js&#39;)) // 2.path</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(path.basename(__filename)) // 2.path.js</span></span></code></pre></div></li><li>path.dirname(): 获取路径中最后一个部分的上一次目录所在路径<div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">console.log(path.dirname(&#39;/a/b/c&#39;)) // /a/b</span></span></code></pre></div></li><li>path.extname(): 获取路径的扩展名<div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// extname</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(path.extname(&#39;/a/b.css&#39;)) // .css</span></span></code></pre></div></li><li>path.parse(): 解析路径 <ul><li>返回一个对象</li><li>root: 根路径（如果有）</li><li>dir: 目录路径</li><li>base: 文件名+扩展名</li><li>ext: 文件名（不包括扩展名）</li><li>name: 文件扩展名（包括点号）</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">console.log(path.parse(&#39;/a/b/c/index.html&#39;))</span></span>
<span class="line"><span style="color:#A6ACCD;">/* {</span></span>
<span class="line"><span style="color:#A6ACCD;">    root: &#39;/&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    dir: &#39;/a/b/c&#39;,     </span></span>
<span class="line"><span style="color:#A6ACCD;">    base: &#39;index.html&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    ext: &#39;.html&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: &#39;index&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">} */</span></span></code></pre></div></li><li>path.format(): 序列化路径<div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">console.log(</span></span>
<span class="line"><span style="color:#A6ACCD;">  path.format({</span></span>
<span class="line"><span style="color:#A6ACCD;">      root: &#39;/&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">      dir: &#39;/a/b/c&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">      base: &#39;index.html&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">      ext: &#39;.html&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">      name: &#39;index&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">  })</span></span>
<span class="line"><span style="color:#A6ACCD;">) // /a/b/c\\index.html</span></span></code></pre></div></li><li>path.isAbsolute(): 判断参数是否为绝对路径<div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">console.log(path.isAbsolute(&#39;foo&#39;)) // false</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(path.isAbsolute(&#39;/foo&#39;)) // true</span></span></code></pre></div></li><li>path.join(): 拼接路径<div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">console.log(path.join(&#39;a/b&#39;, &#39;c&#39;, &#39;../&#39;, &#39;index.html&#39;)) // a\\b\\index.html</span></span></code></pre></div></li><li>path.normalize(): 规范化路径<div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">console.log(path.normalize(&#39;a/b/c/d&#39;)) // a\\b\\c\\d</span></span></code></pre></div></li><li><code>path.resolve([from], to)</code>: 获取绝对路径<div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">console.log(path.resolve()) // E:\\working\\blog\\code\\node\\nodeBasic</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(path.resolve(&#39;a&#39;, &#39;b&#39;)) //  E:\\working\\blog\\code\\node\\nodeBasic\\a\\b</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(path.resolve(&#39;/a&#39;, &#39;b&#39;)) // E:\\a\\b</span></span></code></pre></div></li></ul><h2 id="全局变量-buffer" tabindex="-1">全局变量 Buffer <a class="header-anchor" href="#全局变量-buffer" aria-label="Permalink to &quot;全局变量 Buffer&quot;">​</a></h2><ul><li><p>作用</p><ul><li><p>处理二进制数据的机制，适用于文件系统，网络通信，加密等场景</p></li><li><p>不占据V8堆内存大小，内存大小由node控制，由v8GC来回收</p></li><li><p>一般配合Stream流使用，充当数据缓冲区</p><p><img src="`+e+`" alt="buffer"></p></li></ul></li><li><p>创建 Buffer</p><ul><li>创建时即指定了长度，后续不能改变空间大小，这是和js数组不同的</li><li>Buffer.alloc(size, fill[, encoding]) 创建指定大小的已初始化 Buffer</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const buf1 = Buffer.alloc(5, &#39;abc&#39;, &#39;utf-8&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(buf1) // &lt;Buffer 61 62 63 61 62&gt;</span></span></code></pre></div><ul><li>Buffer.allocUnsafe: 创建指定大小的未初始化Buffer，需要手动初始化</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const buf2 = Buffer.allocUnsafe(5)</span></span>
<span class="line"><span style="color:#A6ACCD;">buf2.fill(&#39;abc&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(buf2) // &lt;Buffer 61 62 63 61 62&gt;</span></span></code></pre></div><ul><li><code>Buffer.from(value[,encodingOrOffset[,length]])</code>：根据给定的值创建新的Buffer对象</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const buf3 = Buffer.from(&#39;abc&#39;, &#39;utf-8&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(buf3) // &lt;Buffer 61 62 63&gt;</span></span></code></pre></div></li><li><p>Buffer 实例方法</p><ul><li>fill(value, offset[,end][,encoding]) <ul><li>用指定的值填充 Buffer，可以指定开始和结束位置，默认会重复写入</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const bufFill = Buffer.alloc(6)</span></span>
<span class="line"><span style="color:#A6ACCD;">bufFill.fill(&#39;abc&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(bufFill) // &lt;Buffer 61 62 63 61 62 63&gt;</span></span></code></pre></div><ul><li>write(string[, offset[, length]][, encoding]) <ul><li>将字符串写入Buffer并返回写入的字数</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const bufWrite = Buffer.alloc(10)</span></span>
<span class="line"><span style="color:#A6ACCD;">bufWrite.write(&#39;hello&#39;, 0, 5, &#39;utf-8&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(bufWrite) // &lt;Buffer 68 65 6c 6c 6f 00 00 00 00 00&gt;</span></span></code></pre></div><ul><li>slice([start[, end]]) <ul><li>创建一个新的Buffer，包含原始Buffer的指定部分</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const bufSlice = Buffer.from(&#39;hello&#39;, &#39;utf-8&#39;).slice(1, 4)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(bufSlice) // &lt;Buffer 65 6c 6c&gt;</span></span></code></pre></div><ul><li>indexOf(value[, byteOffset][, encoding]) <ul><li>在 Buffer 中查找指定值的第一个出现位置，并返回其索引</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">console.log(Buffer.from(&#39;hello&#39;, &#39;utf8&#39;).indexOf(&#39;e&#39;)) // 1</span></span></code></pre></div><ul><li>copy(targetBuffer[, targetStart[, sourceStart[, sourceEnd]]]) <ul><li>将当前 Buffer 的内容复制到目标 Buffer 中</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const bufCopy1 = Buffer.alloc(5)</span></span>
<span class="line"><span style="color:#A6ACCD;">const bufCopy2 = Buffer.from(&#39;hello&#39;, &#39;utf-8&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">bufCopy2.copy(bufCopy1)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(bufCopy1) // &lt;Buffer 68 65 6c 6c 6f&gt;</span></span></code></pre></div><ul><li>toString() <ul><li>从 Buffer 中提取数据</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">console.log(Buffer.from(&#39;liuguowei&#39;, &#39;utf-8&#39;).toString()) // liuguowei</span></span></code></pre></div></li><li><p>Buffer 静态方法</p><ul><li>concat： 将多个buffer拼接成一个新的buffer</li><li>isBuffer：判断当前数据是否为buffer</li></ul></li></ul><h2 id="核心模块-fs" tabindex="-1">核心模块 FS <a class="header-anchor" href="#核心模块-fs" aria-label="Permalink to &quot;核心模块 FS&quot;">​</a></h2><ul><li>权限位 <ul><li>每个文件或目录都由一个9位的权限位组合，用来指定不同用户对该文件或目录的读取、写入和执行权限</li><li>9位权限位组合包括三组权限：所有者权限、群组权限和其他用户权限 <ul><li>每组权限由三个字符表示</li><li>r: 读取</li><li>w：写入</li><li>x：执行</li></ul></li><li>-rwxr-wr-- <ul><li>第一个字符-表示该条目是一个文件（如果是d则表示是一个目录）</li><li>接下来的三个字符rwx表示所有者具有读取、写入和执行权限</li><li>然后的三个字符r-x表示群组用户具有读取和执行权限</li><li>最后的三个字符r--表示其他用户只具有读取权限</li></ul></li></ul></li><li>操作符 flag <ul><li>&#39;w&#39;：覆盖模式，如果文件存在，则先清空文件内容再写入新内容</li><li>&#39;a&#39;：追加模式，如果文件存在，则将新内容追加到文件末尾</li><li>&#39;wx&#39;：排他模式下的写入，只有当文件不存在时才创建文件并写入内容</li><li>&#39;ax&#39;：排他模式下的追加，只有当文件不存在时才创建文件并追加内容</li></ul></li><li>文件操作 API <ul><li>readFile: 从指定文件中读取数据</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">fs.readFile(path.resolve(&#39;data.txt&#39;), { encoding: &#39;utf-8&#39; }, (err, data) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(data) // 我是一只程序猿</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span></code></pre></div><ul><li>writeFile(file, data[, options], callback)：向指定文件中写入数据 <ul><li>options <ul><li>encoding</li><li>mode: 权限位</li><li>flag：操作符</li></ul></li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const options = {</span></span>
<span class="line"><span style="color:#A6ACCD;">  flag: &#39;a&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">fs.writeFile(path.resolve(&#39;data.txt&#39;), &#39;我不是一只程序员&#39;, options, (err, data) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (!err) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(&#39;操作成功&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span></code></pre></div><ul><li>appendFile: 追加的方式向指定文件中写入数据</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">fs.appendFile(path.resolve(&#39;data.txt&#39;), &#39;hello world&#39;, (err, data) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;追加成功&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span></code></pre></div><ul><li>copyFile：将某个文件中的数据拷贝至另一文件</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">fs.copyFile(path.resolve(&#39;data.txt&#39;), &#39;test.txt&#39;, () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(&#39;拷贝成功&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span></code></pre></div><ul><li>fs.watchFile(file[, options], listener)：对指定文件进行监控 <ul><li>options <ul><li>persistent：指定监视是否持续运行，默认为 true。设置为 false 后，当回调函数执行完毕时会停止监视</li><li>interval：设置轮询间隔（以毫秒为单位），即检查文件变化的频率。默认为 5007 毫秒（约为 5 秒）</li><li>bigint：指示是否将 mtime 和 ctime 字段作为 BigInt 类型返回。默认为 false</li></ul></li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">fs.watchFile(&#39;data.txt&#39;, { interval: 20 }, (curr, prev) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(curr)</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(prev)</span></span>
<span class="line"><span style="color:#A6ACCD;">  if (curr.mtime !== prev.mtime) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;文件被修改了&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    fs.unwatchFile(&#39;data.txt&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span></code></pre></div></li><li>文件打开与关闭 <ul><li>fs.open(path, flags, mode, callback) <ul><li>flags: <ul><li>r：只读模式</li><li>w：写入模式，如果文件不存在则创建，如果存在则截断</li><li>a：追加模式，如果文件不存在则创建</li></ul></li></ul></li><li>fs.close</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">fs.open(path.resolve(&#39;bigFile.txt&#39;), &#39;r&#39;, (err, fd) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(fd)</span></span>
<span class="line"><span style="color:#A6ACCD;">  fs.close(fd, () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">      console.log(&#39;关闭成功&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">  })</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span></code></pre></div></li><li>目录操作API <ul><li>access：判断文件或目录是否具有操作权限</li><li>stat：获取目录及文件信息</li><li>mkdir：创建目录</li><li>rmdir：删除目录</li><li>readdir：读取目录中内容</li><li>unlink：删除指定文件</li></ul></li></ul><h2 id="事件模块-events" tabindex="-1">事件模块 events <a class="header-anchor" href="#事件模块-events" aria-label="Permalink to &quot;事件模块 events&quot;">​</a></h2><ul><li>EventEmitter <ul><li>nodejs 是基于事件驱动的异步操作架构，内置 events 模块</li><li>events 模块提供了 EventEmitter 类</li><li>nodejs 中很多内置核心模块继承了 EventEmitter</li></ul></li><li>EventEmitter 常见API <ul><li>on: 添加当事件被触发时调用的回调函数</li><li>emit：触发事件，按照注册的顺序同步调用每个事件监听器</li><li>once：添加当事件在注册之后首次被触发时调用的回调函数</li><li>off：移除特定的监听器</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const EventEmitter = require(&#39;events&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">const ev = new EventEmitter()</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">ev.on(&#39;e1&#39;, () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;e1&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;">ev.emit(&#39;e1&#39;)</span></span></code></pre></div></li></ul><h2 id="核心模块-stream" tabindex="-1">核心模块-stream <a class="header-anchor" href="#核心模块-stream" aria-label="Permalink to &quot;核心模块-stream&quot;">​</a></h2><ul><li>避免同步读取文件的等待时长和开销问题</li><li>分类 <ul><li>Readable（createReadStream）: 可读流，能够实现数据的读取</li><li>Writeable（createWriteStream）: 可写流，能够实现数据的写操作</li><li>Duplex: 双工流，既可读又可写</li><li>ransform: 转换流，可读可写，还能实现数据转换</li></ul></li><li>createReadStream 为例 <ul><li>path：字符串，表示要读取的文件的路径</li><li>options <ul><li>flags：字符串，指定文件打开的方式，默认为 &#39;r&#39;</li><li>encoding：字符串，指定文件的编码，默认为 null</li><li>highWaterMark：整数，指定内部缓冲区的大小（以字节为单位），用于控制每次读取的数据量，默认为 64 KB</li><li>autoClose：布尔值，指示是否在读取完毕后自动关闭文件描述符，默认为 true</li><li>start：整数，指定文件开始读取位置的偏移量（以字节为单位）</li><li>end：整数，指定文件结束读取位置的偏移量（以字节为单位）</li><li>fd：整数，指定一个已经打开的文件描述符来创建可读流，与 path 参数互斥</li><li>mode：整数，指定文件的权限，仅在使用 fd 参数时有效</li></ul></li></ul></li><li>pipe 通过管道传输</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const fs = require(&#39;fs&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const readableStream = fs.createReadStream(&#39;readStream.txt&#39;, {</span></span>
<span class="line"><span style="color:#A6ACCD;">    highWaterMark: 1024</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;">const writeableStream = fs.createWriteStream(&#39;./writeStream.txt&#39;, {</span></span>
<span class="line"><span style="color:#A6ACCD;">    highWaterMark: 10</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">readableStream.pipe(writeableStream)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 监听可读流的结束事件</span></span>
<span class="line"><span style="color:#A6ACCD;">readableStream.on(&#39;end&#39;, () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;File copy completed.&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;">// 监听可写流的结束事件</span></span>
<span class="line"><span style="color:#A6ACCD;">writeableStream.on(&#39;finish&#39;, () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;Data written to the file.&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span></code></pre></div>`,13),i=[o];function t(c,r,u,C,d,A){return l(),a("div",null,i)}const h=s(p,[["render",t]]);export{g as __pageData,h as default};