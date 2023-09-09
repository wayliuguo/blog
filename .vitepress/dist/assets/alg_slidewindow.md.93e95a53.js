import{_ as s,o as n,c as a,U as l}from"./chunks/framework.9adb0f96.js";const y=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"alg/slidewindow.md","filePath":"alg/slidewindow.md","lastUpdated":1694185188000}'),e={name:"alg/slidewindow.md"},p=l(`<h2 id="长度最小的子数组" tabindex="-1">长度最小的子数组 <a class="header-anchor" href="#长度最小的子数组" aria-label="Permalink to &quot;长度最小的子数组&quot;">​</a></h2><h3 id="题目" tabindex="-1">题目 <a class="header-anchor" href="#题目" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>给定一个含有 n 个正整数的数组和一个正整数 target 。</p><p>找出该数组中满足其总和大于等于 target 的长度最小的 连续子数组 [numsl, numsl+1, ..., numsr-1, numsr] ，并返回其长度。如果不存在符合条件的子数组，返回 0 。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：target = 7, nums = [2,3,1,2,4,3]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：2</span></span>
<span class="line"><span style="color:#A6ACCD;">解释：子数组 [4,3] 是该条件下的长度最小的子数组。</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：target = 4, nums = [1,4,4]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：1</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：target = 11, nums = [1,1,1,1,1,1,1,1]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：0</span></span></code></pre></div><h3 id="思想" tabindex="-1">思想 <a class="header-anchor" href="#思想" aria-label="Permalink to &quot;思想&quot;">​</a></h3><ol><li>暴力法 <ul><li>枚举确定开始下标 i，从下标开始往后查找找到从i-j中大于等于 target的下标，得到 j-i+1 即为长度</li><li>取这些长度的最小值即可</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var minSubArrayLen = function(target, nums) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let result = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i=0; i&lt;nums.length; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        let sum = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">        for (let j=i; j&lt;nums.length; j++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            sum += nums[j]</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (sum &gt;= target) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                result = result ? Math.min(result, j - i + 1) : j - i + 1</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return result</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div></li><li>前缀和 + 二分查找 <ul><li>收集好下标对应的前缀和数组</li><li>遍历并找到当前下标对应的endValue,因为从前缀和中取当前下标后加起来的值需大于目标值</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var minSubArrayLen = function (target, nums) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const n = nums.length</span></span>
<span class="line"><span style="color:#A6ACCD;">    let ans = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 前缀和, 如sums[i] = nums[i-1]+...nums[0]</span></span>
<span class="line"><span style="color:#A6ACCD;">    const sums = [0]</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i = 1; i &lt;= n; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        sums[i] = sums[i - 1] + nums[i - 1]</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 利用前缀和二分查找</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i = 1; i &lt;= n; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // endValue: 当前下标前缀和+target，因为后续取值是从前缀和中取</span></span>
<span class="line"><span style="color:#A6ACCD;">        let endValue = sums[i - 1] + target</span></span>
<span class="line"><span style="color:#A6ACCD;">        let bound = binarySearch(sums, i, n, endValue)</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (bound !== -1) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            ans = ans ? Math.min(ans, bound - (i - 1)) : bound - (i - 1)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return ans</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">function binarySearch(sums, l, r, target) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    while (l &lt; r) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        let mid = Math.floor((l + r) / 2)</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (sums[mid] &lt; target) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            l = mid + 1</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">            r = mid</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return sums[l] &gt;= target ? l : -1</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div></li><li>滑动窗口（重点） <ul><li>定义滑动窗口的开始<code>start</code>和结束<code>end</code>位置</li><li>维护变量<code>sum</code>存储<code>nums[start]</code>到<code>nums[end]</code>的和</li><li>初始状态下<code>start</code>和<code>end</code>的值都是0，<code>sum</code>也是0</li><li>每一轮迭代，当<code>sum[end]</code>小于<code>sum</code>，<code>end</code>指针右移</li><li>每一轮迭代，当<code>sum[end]</code>加到大于等于<code>sum</code><ul><li>更新<code>end</code>和<code>start</code>的间隔最小值</li><li><code>start</code> 指针右移，更新 <code>sum</code>的值为减去 <code>nums[start]</code></li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var minSubArrayLen = function(target, nums) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const n = nums.length</span></span>
<span class="line"><span style="color:#A6ACCD;">    let ans = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    let start = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    let end = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    let sum = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    while(end&lt;n) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        sum += nums[end]</span></span>
<span class="line"><span style="color:#A6ACCD;">        while(sum &gt;= target) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            ans = ans ? Math.min(ans, end-start+1) : end-start+1</span></span>
<span class="line"><span style="color:#A6ACCD;">            sum -= nums[start]</span></span>
<span class="line"><span style="color:#A6ACCD;">            start++</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        end++</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return ans</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div></li></ol><h2 id="给定一个字符串-s-请你找出其中不含有重复字符的-最长子串-的长度。" tabindex="-1">给定一个字符串 s ，请你找出其中不含有重复字符的 最长子串 的长度。 <a class="header-anchor" href="#给定一个字符串-s-请你找出其中不含有重复字符的-最长子串-的长度。" aria-label="Permalink to &quot;给定一个字符串 s ，请你找出其中不含有重复字符的 最长子串 的长度。&quot;">​</a></h2><h3 id="题目-1" tabindex="-1">题目 <a class="header-anchor" href="#题目-1" aria-label="Permalink to &quot;题目&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入: s = &quot;abcabcbb&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">输出: 3 </span></span>
<span class="line"><span style="color:#A6ACCD;">解释: 因为无重复字符的最长子串是 &quot;abc&quot;，所以其长度为 3。</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入: s = &quot;bbbbb&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">输出: 1</span></span>
<span class="line"><span style="color:#A6ACCD;">解释: 因为无重复字符的最长子串是 &quot;b&quot;，所以其长度为 1。</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入: s = &quot;pwwkew&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">输出: 3</span></span>
<span class="line"><span style="color:#A6ACCD;">解释: 因为无重复字符的最长子串是 &quot;wke&quot;，所以其长度为 3。</span></span>
<span class="line"><span style="color:#A6ACCD;">     请注意，你的答案必须是 子串 的长度，&quot;pwke&quot; 是一个子序列，不是子串。</span></span></code></pre></div><h3 id="思想-1" tabindex="-1">思想 <a class="header-anchor" href="#思想-1" aria-label="Permalink to &quot;思想&quot;">​</a></h3><p>我们不妨以示例一中的字符串 abcabcbb 为例，找出从每一个字符开始的，不包含重复字符的最长子串，那么其中最长的那个字符串即为答案。对于示例一中的字符串，我们列举出这些结果，其中括号中表示选中的字符以及最长的字符串：</p><ul><li>以 (a)bcabcbb 开始的最长字符串为 (abc)abcbb；</li><li>以 a(b)cabcbb开始的最长字符串为 a(bca)bcbb；</li><li>以 ab(c)abcbb 开始的最长字符串为 ab(cab)cbb；</li><li>以 abc(a)bcbb 开始的最长字符串为 abc(abc)bb；</li><li>以 abca(b)cbb 开始的最长字符串为 abca(bc)bb；</li><li>以 abcab(c)bb 开始的最长字符串为 abcab(cb)b；</li><li>以 abcabc(b)b 开始的最长字符串为 abcabc(b)b；</li><li>以 abcabcb(b) 开始的最长字符串为 abcabcb(b);</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var lengthOfLongestSubstring = function(s) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const n = s.length</span></span>
<span class="line"><span style="color:#A6ACCD;">    let start = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    let end = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    let set = new Set()</span></span>
<span class="line"><span style="color:#A6ACCD;">    let ans =  0</span></span>
<span class="line"><span style="color:#A6ACCD;">    while(end &lt; n) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 当set中存在相同的，则从头一直移除</span></span>
<span class="line"><span style="color:#A6ACCD;">        while(set.has(s[end])) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 删除 start 下标值</span></span>
<span class="line"><span style="color:#A6ACCD;">            set.delete(s[start])</span></span>
<span class="line"><span style="color:#A6ACCD;">            // start 右移</span></span>
<span class="line"><span style="color:#A6ACCD;">            start++</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 添加到set</span></span>
<span class="line"><span style="color:#A6ACCD;">        set.add(s[end])</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 获取最大连续值</span></span>
<span class="line"><span style="color:#A6ACCD;">        ans = Math.max(ans, set.size)</span></span>
<span class="line"><span style="color:#A6ACCD;">        // end 右移</span></span>
<span class="line"><span style="color:#A6ACCD;">        end++</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return ans</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div>`,14),o=[p];function c(t,i,r,C,A,d){return n(),a("div",null,o)}const b=s(e,[["render",c]]);export{y as __pageData,b as default};
