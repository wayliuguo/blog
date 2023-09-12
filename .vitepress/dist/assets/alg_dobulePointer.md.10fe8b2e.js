import{_ as s,o as a,c as n,U as l}from"./chunks/framework.9adb0f96.js";const y=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"alg/dobulePointer.md","filePath":"alg/dobulePointer.md","lastUpdated":1694505002000}'),p={name:"alg/dobulePointer.md"},e=l(`<h2 id="验证回文串" tabindex="-1">验证回文串 <a class="header-anchor" href="#验证回文串" aria-label="Permalink to &quot;验证回文串&quot;">​</a></h2><h3 id="题目" tabindex="-1">题目 <a class="header-anchor" href="#题目" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>如果在将所有大写字符转换为小写字符、并移除所有非字母数字字符之后，短语正着读和反着读都一样。则可以认为该短语是一个 回文串 。</p><p>字母和数字都属于字母数字字符。</p><p>给你一个字符串 s，如果它是 回文串 ，返回 true ；否则，返回 false 。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入: s = &quot;A man, a plan, a canal: Panama&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：true</span></span>
<span class="line"><span style="color:#A6ACCD;">解释：&quot;amanaplanacanalpanama&quot; 是回文串。</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：s = &quot;race a car&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：false</span></span>
<span class="line"><span style="color:#A6ACCD;">解释：&quot;raceacar&quot; 不是回文串。</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：s = &quot; &quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：true</span></span>
<span class="line"><span style="color:#A6ACCD;">解释：在移除非字母数字字符之后，s 是一个空字符串 &quot;&quot; 。</span></span>
<span class="line"><span style="color:#A6ACCD;">由于空字符串正着反着读都一样，所以是回文串。</span></span></code></pre></div><h3 id="思想" tabindex="-1">思想 <a class="header-anchor" href="#思想" aria-label="Permalink to &quot;思想&quot;">​</a></h3><ul><li>使用双指针，头指针start 从头开始，尾指针从尾开始</li><li>如果是属于需要的字符就进行比较判断</li><li>否则对应指针进行移动直到字符正确</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var isPalindrome = function(s) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let start = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    let end = s.length-1</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 判断是否是需要的字符</span></span>
<span class="line"><span style="color:#A6ACCD;">    const list = [&#39;a&#39;,&#39;b&#39;,&#39;c&#39;,&#39;d&#39;,&#39;e&#39;,&#39;f&#39;,&#39;g&#39;,&#39;h&#39;,&#39;i&#39;,&#39;j&#39;,&#39;k&#39;,&#39;l&#39;,&#39;m&#39;,&#39;n&#39;,&#39;o&#39;,&#39;p&#39;,&#39;q&#39;,&#39;r&#39;,&#39;s&#39;,&#39;t&#39;,&#39;u&#39;,&#39;v&#39;,&#39;w&#39;,&#39;x&#39;,&#39;y&#39;,&#39;z&#39;,&#39;0&#39;,&#39;1&#39;,&#39;2&#39;,&#39;3&#39;,&#39;4&#39;,&#39;5&#39;,&#39;6&#39;,&#39;7&#39;,&#39;8&#39;,&#39;9&#39;]</span></span>
<span class="line"><span style="color:#A6ACCD;">    while(start &lt; end) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        let S = s[start].toLowerCase()</span></span>
<span class="line"><span style="color:#A6ACCD;">        let E = s[end].toLowerCase()</span></span>
<span class="line"><span style="color:#A6ACCD;">        while (!list.includes(S) &amp;&amp; start &lt; end) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            start++</span></span>
<span class="line"><span style="color:#A6ACCD;">            S = s[start].toLowerCase()</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        while (!list.includes(E) &amp;&amp; start &lt; end) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            end--</span></span>
<span class="line"><span style="color:#A6ACCD;">            E = s[end].toLowerCase()</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (start &gt; end) return false</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (S !== E) return false</span></span>
<span class="line"><span style="color:#A6ACCD;">        start++</span></span>
<span class="line"><span style="color:#A6ACCD;">        end--</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return true</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div><h2 id="判断子序列" tabindex="-1">判断子序列 <a class="header-anchor" href="#判断子序列" aria-label="Permalink to &quot;判断子序列&quot;">​</a></h2><h3 id="题目-1" tabindex="-1">题目 <a class="header-anchor" href="#题目-1" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>给定字符串 s 和 t ，判断 s 是否为 t 的子序列。</p><p>字符串的一个子序列是原始字符串删除一些（也可以不删除）字符而不改变剩余字符相对位置形成的新字符串。（例如，&quot;ace&quot;是&quot;abcde&quot;的一个子序列，而&quot;aec&quot;不是）。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：s = &quot;abc&quot;, t = &quot;ahbgdc&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：true</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：s = &quot;axc&quot;, t = &quot;ahbgdc&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：false</span></span></code></pre></div><h3 id="思想-1" tabindex="-1">思想 <a class="header-anchor" href="#思想-1" aria-label="Permalink to &quot;思想&quot;">​</a></h3><ul><li>利用双指针<code>l</code>指向子序列<code>s</code>的位置，<code>r</code>指向字符串<code>t</code>的位置</li><li>然后指针<code>r</code>向右移动匹配到等于子序列<code>s</code>的值，则子序列<code>s</code>指针<code>l</code>向右移动</li><li>当子序列<code>s</code>的指针<code>l</code>能移动到末尾，则代表能匹配上</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var isSubsequence = function(s, t) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let l = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    let r = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 当双指针没有超出时</span></span>
<span class="line"><span style="color:#A6ACCD;">    while(l&lt;s.length &amp;&amp; r&lt;t.length) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        const T = t[r]</span></span>
<span class="line"><span style="color:#A6ACCD;">        const S = s[l]</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 当子序列值===字符串值，则子序列向右移动</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (T === S) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            l++</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 字符串向右移动</span></span>
<span class="line"><span style="color:#A6ACCD;">        r++</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return l === s.length</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div><h2 id="两数之和-ii-输入有序数组-中等" tabindex="-1">两数之和 II - 输入有序数组（中等） <a class="header-anchor" href="#两数之和-ii-输入有序数组-中等" aria-label="Permalink to &quot;两数之和 II - 输入有序数组（中等）&quot;">​</a></h2><h3 id="题目-2" tabindex="-1">题目 <a class="header-anchor" href="#题目-2" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>给你一个下标从 1 开始的整数数组 numbers ，该数组已按 <strong>非递减顺序排列</strong> ，请你从数组中找出满足相加之和等于目标数 target 的两个数。如果设这两个数分别是 numbers[index1] 和 numbers[index2] ，则 1 &lt;= index1 &lt; index2 &lt;= numbers.length 。</p><p>以长度为 2 的整数数组 [index1, index2] 的形式返回这两个整数的下标 index1 和 index2。</p><p>你可以假设每个输入<strong>只对应唯一的答案</strong> ，而且你不<strong>可以重复使用相同的元素</strong>。</p><p>你所设计的解决方案必须<strong>只使用常量级的额外空间</strong>。</p><h3 id="思想-2" tabindex="-1">思想 <a class="header-anchor" href="#思想-2" aria-label="Permalink to &quot;思想&quot;">​</a></h3><p>已经是非递减了，则右边&gt;=左边</p><ol><li>哈希</li><li>双指针</li><li>二分法</li></ol><ul><li>哈希（不考虑其他限制条件） <ul><li>常规的两数之和加个1即可</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var twoSum = function(numbers, target) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const map = new Map()</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i=0; i&lt;numbers.length; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        const cur = numbers[i]</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (map.has(target - cur)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            return [map.get(target-cur), i+1]</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">            map.set(cur, i+1)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div><ul><li>双指针 <ul><li>使用头尾指针，当尾指针遍历完后，头指针右移重置尾指针</li><li>如果尾指针没有遍历完 <ul><li>结果小于 target，尾指针右移</li><li>结果大于 target，头指针右移，重置头指针</li><li>结果相等，得到结果</li></ul></li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var twoSum = function (numbers, target) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 头指针</span></span>
<span class="line"><span style="color:#A6ACCD;">    let start = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 尾指针</span></span>
<span class="line"><span style="color:#A6ACCD;">    let end = start + 1</span></span>
<span class="line"><span style="color:#A6ACCD;">    let length = numbers.length</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 头指针需要给后面尾指针留一个位置</span></span>
<span class="line"><span style="color:#A6ACCD;">    while (start &lt; length - 1) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 当尾指针到末尾了，头指针右移，重置尾指针</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (end === length) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            start++</span></span>
<span class="line"><span style="color:#A6ACCD;">            end = start + 1</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        const sum = numbers[start] + numbers[end]</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 结果小于 target，尾指针右移</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 结果大于 target，头指针右移，重置头指针</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 结果相等，得到结果</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (sum &lt; target) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            end++</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else if (sum &gt; target) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            start++</span></span>
<span class="line"><span style="color:#A6ACCD;">            end = start + 1</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">            return [start + 1, end + 1]</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><ul><li>二分法</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var twoSum = function (numbers, target) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 遍历取得第一项，然后使用二分法取得第二项</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i = 0; i &lt; numbers.length; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 二分法左下标</span></span>
<span class="line"><span style="color:#A6ACCD;">        let left = i + 1</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 二分法右下表</span></span>
<span class="line"><span style="color:#A6ACCD;">        let right = numbers.length - 1</span></span>
<span class="line"><span style="color:#A6ACCD;">        while (left &lt;= right) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 中间值</span></span>
<span class="line"><span style="color:#A6ACCD;">            let middle = Math.floor((left + right) / 2)</span></span>
<span class="line"><span style="color:#A6ACCD;">            const sum = numbers[i] + numbers[middle]</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 根据结果调整左右下标与中间值</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (sum &lt; target) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                left = middle + 1</span></span>
<span class="line"><span style="color:#A6ACCD;">            } else if (sum &gt; target) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                right = middle - 1</span></span>
<span class="line"><span style="color:#A6ACCD;">            } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">                return [i + 1, middle + 1]</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h2 id="盛最多水的容器" tabindex="-1">盛最多水的容器 <a class="header-anchor" href="#盛最多水的容器" aria-label="Permalink to &quot;盛最多水的容器&quot;">​</a></h2><h3 id="题目-3" tabindex="-1">题目 <a class="header-anchor" href="#题目-3" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>给定一个长度为 n 的整数数组 height 。有 n 条垂线，第 i 条线的两个端点是 (i, 0) 和 (i, height[i]) 。</p><p>找出其中的两条线，使得它们与 x 轴共同构成的容器可以容纳最多的水。</p><p>返回容器可以储存的最大水量。</p><p>说明：你不能倾斜容器</p><p><img src="https://aliyun-lc-upload.oss-cn-hangzhou.aliyuncs.com/aliyun-lc-upload/uploads/2018/07/25/question_11.jpg" alt="img"></p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：[1,8,6,2,5,4,8,3,7]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：49 </span></span>
<span class="line"><span style="color:#A6ACCD;">解释：图中垂直线代表输入数组 [1,8,6,2,5,4,8,3,7]。在此情况下，容器能够容纳水（表示为蓝色部分）的最大值为 49。</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：height = [1,1]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：1</span></span></code></pre></div><h3 id="思想-3" tabindex="-1">思想 <a class="header-anchor" href="#思想-3" aria-label="Permalink to &quot;思想&quot;">​</a></h3><ul><li>初始时指针指向两端</li><li>容器 = 较短指针*指针之间的距离</li><li>对比两个指针的值，移动较小的指针，只有这样才会出现更大的容器</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var maxArea = function(height) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let l = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    let r = height.length - 1</span></span>
<span class="line"><span style="color:#A6ACCD;">    let ans = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    while(l&lt;r) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 更新容器面积</span></span>
<span class="line"><span style="color:#A6ACCD;">        ans = Math.max(ans, Math.min(height[l], height[r]) * (r-l))</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 找到小值指针进行移动</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (height[l] &lt;= height[r]) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            ++l</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">            --r</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return ans</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div>`,43),t=[e];function o(c,i,r,C,A,u){return a(),n("div",null,t)}const h=s(p,[["render",o]]);export{y as __pageData,h as default};
