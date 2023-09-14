import{_ as s,o as n,c as a,U as l}from"./chunks/framework.9adb0f96.js";const D=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"alg/stack.md","filePath":"alg/stack.md","lastUpdated":1694532154000}'),p={name:"alg/stack.md"},o=l(`<h2 id="有效的括号" tabindex="-1">有效的括号 <a class="header-anchor" href="#有效的括号" aria-label="Permalink to &quot;有效的括号&quot;">​</a></h2><h3 id="题目" tabindex="-1">题目 <a class="header-anchor" href="#题目" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>给定一个只包括 &#39;(&#39;，&#39;)&#39;，&#39;{&#39;，&#39;}&#39;，&#39;[&#39;，&#39;]&#39; 的字符串 s ，判断字符串是否有效。</p><p>有效字符串需满足：</p><p>左括号必须用相同类型的右括号闭合。 左括号必须以正确的顺序闭合。 每个右括号都有一个对应的相同类型的左括号。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：s = &quot;()&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：true</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：s = &quot;()[]{}&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：true</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：s = &quot;((&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：false</span></span></code></pre></div><h3 id="思想" tabindex="-1">思想 <a class="header-anchor" href="#思想" aria-label="Permalink to &quot;思想&quot;">​</a></h3><ul><li>需要两两对应，可以判断单双数</li><li>利用栈，如果是左括号则入栈，如果是右括号则判断是否可以闭合</li><li>判断方法是取出栈顶与当前值判断是否可以闭合即可</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var isValid = function (s) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (s.length % 2 !== 0) return false</span></span>
<span class="line"><span style="color:#A6ACCD;">    const stack = []</span></span>
<span class="line"><span style="color:#A6ACCD;">    const map = new Map([</span></span>
<span class="line"><span style="color:#A6ACCD;">        [&#39;)&#39;, &#39;(&#39;],</span></span>
<span class="line"><span style="color:#A6ACCD;">        [&#39;]&#39;, &#39;[&#39;],</span></span>
<span class="line"><span style="color:#A6ACCD;">        [&#39;}&#39;, &#39;{&#39;]</span></span>
<span class="line"><span style="color:#A6ACCD;">    ])</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (const item of s) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        const last = stack[stack.length - 1]</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (map.has(item)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (last !== map.get(item)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                return false</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">            stack.pop()</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">            stack.push(item)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return !stack.length</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h2 id="简化路径-中等" tabindex="-1">简化路径（中等） <a class="header-anchor" href="#简化路径-中等" aria-label="Permalink to &quot;简化路径（中等）&quot;">​</a></h2><h3 id="题目-1" tabindex="-1">题目 <a class="header-anchor" href="#题目-1" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>给你一个字符串 path ，表示指向某一文件或目录的 Unix 风格 绝对路径 （以 &#39;/&#39; 开头），请你将其转化为更加简洁的规范路径。</p><p>在 Unix 风格的文件系统中，一个点（.）表示当前目录本身；此外，两个点 （..） 表示将目录切换到上一级（指向父目录）；两者都可以是复杂相对路径的组成部分。任意多个连续的斜杠（即，&#39;//&#39;）都被视为单个斜杠 &#39;/&#39; 。 对于此问题，任何其他格式的点（例如，&#39;...&#39;）均被视为文件/目录名称。</p><p>请注意，返回的 规范路径 必须遵循下述格式：</p><p>始终以斜杠 &#39;/&#39; 开头。 两个目录名之间必须只有一个斜杠 &#39;/&#39; 。 最后一个目录名（如果存在）不能 以 &#39;/&#39; 结尾。 此外，路径仅包含从根目录到目标文件或目录的路径上的目录（即，不含 &#39;.&#39; 或 &#39;..&#39;）。 返回简化后得到的 规范路径 。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：path = &quot;/home/&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：&quot;/home&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">解释：注意，最后一个目录名后面没有斜杠。 </span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：path = &quot;/../&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：&quot;/&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">解释：从根目录向上一级是不可行的，因为根目录是你可以到达的最高级。</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：path = &quot;/home//foo/&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：&quot;/home/foo&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">解释：在规范路径中，多个连续斜杠需要用一个斜杠替换。</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：path = &quot;/a/./b/../../c/&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：&quot;/c&quot;</span></span></code></pre></div><h3 id="思想-1" tabindex="-1">思想 <a class="header-anchor" href="#思想-1" aria-label="Permalink to &quot;思想&quot;">​</a></h3><ul><li>以 / 分隔为数组 &quot;/home/&quot;.split(&#39;/&#39;) =&gt; [&#39;&#39;, &#39;home&#39;, &#39;&#39;]</li><li>当匹配到<code>..</code>时，出栈</li><li>当不为空且非<code>.</code>时，入栈</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var simplifyPath = function(path) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 以 / 分隔为数组 &quot;/home/&quot;.split(&#39;/&#39;) =&gt; [&#39;&#39;, &#39;home&#39;, &#39;&#39;]</span></span>
<span class="line"><span style="color:#A6ACCD;">    names = path.split(&#39;/&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    const stack = []</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (const name of names) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (name === &#39;..&#39;) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 出栈</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (stack.length) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                stack.pop()</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else if (name.length &amp;&amp; name !== &#39;.&#39;) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 如果非空且不是当前目录，入栈</span></span>
<span class="line"><span style="color:#A6ACCD;">            stack.push(name)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return &quot;/&quot; + stack.join(&quot;/&quot;)</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div><h2 id="最小栈-中等" tabindex="-1">最小栈（中等） <a class="header-anchor" href="#最小栈-中等" aria-label="Permalink to &quot;最小栈（中等）&quot;">​</a></h2><h3 id="题目-2" tabindex="-1">题目 <a class="header-anchor" href="#题目-2" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>设计一个支持 push ，pop ，top 操作，并能在常数时间内检索到最小元素的栈。</p><p>实现 MinStack 类:</p><p>MinStack() 初始化堆栈对象。 void push(int val) 将元素val推入堆栈。 void pop() 删除堆栈顶部的元素。 int top() 获取堆栈顶部的元素。 int getMin() 获取堆栈中的最小元素。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：</span></span>
<span class="line"><span style="color:#A6ACCD;">[&quot;MinStack&quot;,&quot;push&quot;,&quot;push&quot;,&quot;push&quot;,&quot;getMin&quot;,&quot;pop&quot;,&quot;top&quot;,&quot;getMin&quot;]</span></span>
<span class="line"><span style="color:#A6ACCD;">[[],[-2],[0],[-3],[],[],[],[]]</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输出：</span></span>
<span class="line"><span style="color:#A6ACCD;">[null,null,null,null,-3,null,0,-2]</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">解释：</span></span>
<span class="line"><span style="color:#A6ACCD;">MinStack minStack = new MinStack();</span></span>
<span class="line"><span style="color:#A6ACCD;">minStack.push(-2);</span></span>
<span class="line"><span style="color:#A6ACCD;">minStack.push(0);</span></span>
<span class="line"><span style="color:#A6ACCD;">minStack.push(-3);</span></span>
<span class="line"><span style="color:#A6ACCD;">minStack.getMin();   --&gt; 返回 -3.</span></span>
<span class="line"><span style="color:#A6ACCD;">minStack.pop();</span></span>
<span class="line"><span style="color:#A6ACCD;">minStack.top();      --&gt; 返回 0.</span></span>
<span class="line"><span style="color:#A6ACCD;">minStack.getMin();   --&gt; 返回 -2.</span></span></code></pre></div><ul><li>-231 &lt;= val &lt;= 231 - 1</li><li>pop、top 和 getMin 操作总是在 <strong>非空栈</strong> 上调用</li><li>push, pop, top, and getMin最多被调用 3 * 104 次</li></ul><h3 id="思想-2" tabindex="-1">思想 <a class="header-anchor" href="#思想-2" aria-label="Permalink to &quot;思想&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var MinStack = function() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    this.stack = []</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">/** </span></span>
<span class="line"><span style="color:#A6ACCD;"> * @param {number} val</span></span>
<span class="line"><span style="color:#A6ACCD;"> * @return {void}</span></span>
<span class="line"><span style="color:#A6ACCD;"> */</span></span>
<span class="line"><span style="color:#A6ACCD;">MinStack.prototype.push = function(val) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    this.stack.push(val)</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">/**</span></span>
<span class="line"><span style="color:#A6ACCD;"> * @return {void}</span></span>
<span class="line"><span style="color:#A6ACCD;"> */</span></span>
<span class="line"><span style="color:#A6ACCD;">MinStack.prototype.pop = function() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    this.stack.pop()</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">/**</span></span>
<span class="line"><span style="color:#A6ACCD;"> * @return {number}</span></span>
<span class="line"><span style="color:#A6ACCD;"> */</span></span>
<span class="line"><span style="color:#A6ACCD;">MinStack.prototype.top = function() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return this.stack[this.stack.length-1]</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">/**</span></span>
<span class="line"><span style="color:#A6ACCD;"> * @return {number}</span></span>
<span class="line"><span style="color:#A6ACCD;"> */</span></span>
<span class="line"><span style="color:#A6ACCD;">MinStack.prototype.getMin = function() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let min = this.stack[0]</span></span>
<span class="line"><span style="color:#A6ACCD;">    for(const item of this.stack) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        min = Math.min(min, item)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return min</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div><h2 id="逆波兰表达式求值-中等" tabindex="-1">逆波兰表达式求值（中等） <a class="header-anchor" href="#逆波兰表达式求值-中等" aria-label="Permalink to &quot;逆波兰表达式求值（中等）&quot;">​</a></h2><h3 id="题目-3" tabindex="-1">题目 <a class="header-anchor" href="#题目-3" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>给你一个字符串数组 tokens ，表示一个根据 逆波兰表示法 表示的算术表达式。</p><p>请你计算该表达式。返回一个表示表达式值的整数。</p><ul><li>有效的算符为 &#39;+&#39;、&#39;-&#39;、&#39;*&#39; 和 &#39;/&#39; 。</li><li>每个操作数（运算对象）都可以是一个整数或者另一个表达式。</li><li>两个整数之间的除法总是 向零截断 。</li><li>表达式中不含除零运算。</li><li>输入是一个根据逆波兰表示法表示的算术表达式。</li><li>答案及所有中间计算结果可以用 32 位 整数表示。</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：tokens = [&quot;2&quot;,&quot;1&quot;,&quot;+&quot;,&quot;3&quot;,&quot;*&quot;]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：9</span></span>
<span class="line"><span style="color:#A6ACCD;">解释：该算式转化为常见的中缀算术表达式为：((2 + 1) * 3) = 9</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：tokens = [&quot;4&quot;,&quot;13&quot;,&quot;5&quot;,&quot;/&quot;,&quot;+&quot;]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：6</span></span>
<span class="line"><span style="color:#A6ACCD;">解释：该算式转化为常见的中缀算术表达式为：(4 + (13 / 5)) = 6</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：tokens = [&quot;10&quot;,&quot;6&quot;,&quot;9&quot;,&quot;3&quot;,&quot;+&quot;,&quot;-11&quot;,&quot;*&quot;,&quot;/&quot;,&quot;*&quot;,&quot;17&quot;,&quot;+&quot;,&quot;5&quot;,&quot;+&quot;]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：22</span></span>
<span class="line"><span style="color:#A6ACCD;">解释：该算式转化为常见的中缀算术表达式为：</span></span>
<span class="line"><span style="color:#A6ACCD;">  ((10 * (6 / ((9 + 3) * -11))) + 17) + 5</span></span>
<span class="line"><span style="color:#A6ACCD;">= ((10 * (6 / (12 * -11))) + 17) + 5</span></span>
<span class="line"><span style="color:#A6ACCD;">= ((10 * (6 / -132)) + 17) + 5</span></span>
<span class="line"><span style="color:#A6ACCD;">= ((10 * 0) + 17) + 5</span></span>
<span class="line"><span style="color:#A6ACCD;">= (0 + 17) + 5</span></span>
<span class="line"><span style="color:#A6ACCD;">= 17 + 5</span></span>
<span class="line"><span style="color:#A6ACCD;">= 22</span></span></code></pre></div><h3 id="思想-3" tabindex="-1">思想 <a class="header-anchor" href="#思想-3" aria-label="Permalink to &quot;思想&quot;">​</a></h3><ul><li>利用一个栈，当遇见操作符号的时候，就出栈前两个数字进行操作</li><li>特殊处理除法的时候的处理</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var evalRPN = function (tokens) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let stack = []</span></span>
<span class="line"><span style="color:#A6ACCD;">    let first, second</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (const token of tokens) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (token === &#39;+&#39; || token === &#39;-&#39; || token === &#39;*&#39; || token === &#39;/&#39;) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            first = Number(stack.pop())</span></span>
<span class="line"><span style="color:#A6ACCD;">            second = Number(stack.pop())</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        switch (token) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            case &#39;+&#39;:</span></span>
<span class="line"><span style="color:#A6ACCD;">                stack.push(second + first)</span></span>
<span class="line"><span style="color:#A6ACCD;">                break</span></span>
<span class="line"><span style="color:#A6ACCD;">            case &#39;-&#39;:</span></span>
<span class="line"><span style="color:#A6ACCD;">                stack.push(second - first)</span></span>
<span class="line"><span style="color:#A6ACCD;">                break</span></span>
<span class="line"><span style="color:#A6ACCD;">            case &#39;*&#39;:</span></span>
<span class="line"><span style="color:#A6ACCD;">                stack.push(second * first)</span></span>
<span class="line"><span style="color:#A6ACCD;">                break</span></span>
<span class="line"><span style="color:#A6ACCD;">            case &#39;/&#39;:</span></span>
<span class="line"><span style="color:#A6ACCD;">                stack.push(second/first &gt; 0 ? Math.floor(second/first) : Math.ceil(second / first))</span></span>
<span class="line"><span style="color:#A6ACCD;">                break</span></span>
<span class="line"><span style="color:#A6ACCD;">            default:</span></span>
<span class="line"><span style="color:#A6ACCD;">                stack.push(token)</span></span>
<span class="line"><span style="color:#A6ACCD;">                break</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return stack[0]</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div>`,37),e=[o];function t(c,i,C,r,A,u){return n(),a("div",null,e)}const h=s(p,[["render",t]]);export{D as __pageData,h as default};
