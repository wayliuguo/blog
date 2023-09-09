import{_ as s,o as n,c as a,U as l}from"./chunks/framework.9adb0f96.js";const p="/blog/assets/image-20230803130609147.87e0001c.png",e="/blog/assets/合并区间.1ccc5c34.png",o="/blog/assets/1.60f1aeea.gif",d=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"alg/array.md","filePath":"alg/array.md","lastUpdated":1693985677000}'),t={name:"alg/array.md"},c=l(`<h2 id="两数之和" tabindex="-1">两数之和 <a class="header-anchor" href="#两数之和" aria-label="Permalink to &quot;两数之和&quot;">​</a></h2><h3 id="题目" tabindex="-1">题目 <a class="header-anchor" href="#题目" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>给定一个整数数组 <code>nums</code> 和一个整数目标值 <code>target</code>，请你在该数组中找出 <strong>和为目标值</strong> <em><code>target</code></em> 的那 <strong>两个</strong> 整数，并返回它们的数组下标。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：nums = [2,7,11,15], target = 9</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：[0,1]</span></span>
<span class="line"><span style="color:#A6ACCD;">解释：因为 nums[0] + nums[1] == 9 ，返回 [0, 1] 。</span></span></code></pre></div><h3 id="思路" tabindex="-1">思路 <a class="header-anchor" href="#思路" aria-label="Permalink to &quot;思路&quot;">​</a></h3><p>构造一个<code>map</code>, 将遍历的数字作为key，下标作为值</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var twoSum = function(nums, target) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const map = new Map()</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i=0; i&lt;nums.length; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (map.has(target - nums[i])) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            return [map.get(target - nums[i]), i]</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">            map.set(nums[i], i)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div><h2 id="三数之和" tabindex="-1">三数之和 <a class="header-anchor" href="#三数之和" aria-label="Permalink to &quot;三数之和&quot;">​</a></h2><h3 id="题目-1" tabindex="-1">题目 <a class="header-anchor" href="#题目-1" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>给定一个包含 <code>n</code> 个整数的数组<code>nums</code>，判断 <code>nums</code> 中是否存在三个元素<code>a，b，c</code> ，使得 <code>a + b + c = 0 ？</code>找出所有满足条件且不重复的三元组。</p><p>注意：答案中不可以包含重复的三元组。</p><div class="language-js"><button title="Copy Code" class="copy"></button><span class="lang">js</span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">例如</span><span style="color:#89DDFF;">,</span><span style="color:#A6ACCD;"> 给定数组 nums </span><span style="color:#89DDFF;">=</span><span style="color:#A6ACCD;"> [</span><span style="color:#89DDFF;">-</span><span style="color:#F78C6C;">1</span><span style="color:#89DDFF;">,</span><span style="color:#A6ACCD;"> </span><span style="color:#F78C6C;">0</span><span style="color:#89DDFF;">,</span><span style="color:#A6ACCD;"> </span><span style="color:#F78C6C;">1</span><span style="color:#89DDFF;">,</span><span style="color:#A6ACCD;"> </span><span style="color:#F78C6C;">2</span><span style="color:#89DDFF;">,</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">-</span><span style="color:#F78C6C;">1</span><span style="color:#89DDFF;">,</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">-</span><span style="color:#F78C6C;">4</span><span style="color:#A6ACCD;">]，</span></span>
<span class="line"></span>
<span class="line"><span style="color:#A6ACCD;">满足要求的三元组集合为：</span></span>
<span class="line"><span style="color:#A6ACCD;">[</span></span>
<span class="line"><span style="color:#A6ACCD;">  [</span><span style="color:#89DDFF;">-</span><span style="color:#F78C6C;">1</span><span style="color:#89DDFF;">,</span><span style="color:#A6ACCD;"> </span><span style="color:#F78C6C;">0</span><span style="color:#89DDFF;">,</span><span style="color:#A6ACCD;"> </span><span style="color:#F78C6C;">1</span><span style="color:#A6ACCD;">]</span><span style="color:#89DDFF;">,</span></span>
<span class="line"><span style="color:#A6ACCD;">  [</span><span style="color:#89DDFF;">-</span><span style="color:#F78C6C;">1</span><span style="color:#89DDFF;">,</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">-</span><span style="color:#F78C6C;">1</span><span style="color:#89DDFF;">,</span><span style="color:#A6ACCD;"> </span><span style="color:#F78C6C;">2</span><span style="color:#A6ACCD;">]</span></span>
<span class="line"><span style="color:#A6ACCD;">]</span></span></code></pre></div><h3 id="思路-1" tabindex="-1">思路 <a class="header-anchor" href="#思路-1" aria-label="Permalink to &quot;思路&quot;">​</a></h3><ul><li>利用排序+双指针</li><li>先固定一个，剩余的前后作为前指针和后指针向中间移动</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var threeSum = function(nums) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let result = []</span></span>
<span class="line"><span style="color:#A6ACCD;">    nums = nums.sort((a,b) =&gt; a - b)</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i=0; i&lt;nums.length-2; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 如果全部大于0则结束</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (nums[i] &gt; 0) break</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 过滤当前和前一个一样</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (i&gt;0 &amp;&amp; nums[i] === nums[i-1]) continue</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 前指针</span></span>
<span class="line"><span style="color:#A6ACCD;">        let L = i+1</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 后指针</span></span>
<span class="line"><span style="color:#A6ACCD;">        let R = nums.length -1</span></span>
<span class="line"><span style="color:#A6ACCD;">        while(L&lt;R) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            const sum = nums[i] + nums[L] + nums[R]</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (sum === 0) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                result.push([nums[i], nums[L], nums[R]])</span></span>
<span class="line"><span style="color:#A6ACCD;">                // 前指针去重</span></span>
<span class="line"><span style="color:#A6ACCD;">                while(L&lt;R &amp;&amp; nums[L] === nums[L+1]) L++</span></span>
<span class="line"><span style="color:#A6ACCD;">                // 后指针去重</span></span>
<span class="line"><span style="color:#A6ACCD;">                while(L&lt;R &amp;&amp; nums[R] === nums[R-1]) R--</span></span>
<span class="line"><span style="color:#A6ACCD;">                L++</span></span>
<span class="line"><span style="color:#A6ACCD;">                R--</span></span>
<span class="line"><span style="color:#A6ACCD;">            } else if (sum &lt; 0) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                L++</span></span>
<span class="line"><span style="color:#A6ACCD;">            } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">                R--</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return result</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div><h2 id="四数之和" tabindex="-1">四数之和 <a class="header-anchor" href="#四数之和" aria-label="Permalink to &quot;四数之和&quot;">​</a></h2><h3 id="题目-2" tabindex="-1">题目 <a class="header-anchor" href="#题目-2" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>给定一个包含 <code>n</code> 个整数的数组<code>nums</code>，判断 <code>nums</code> 中是否存在四个元素<code>a，b，c，d</code> ，使得 <code>a + b + c + d = 0 ？</code>找出所有满足条件且不重复的四元组。</p><p>注意：答案中不可以包含重复的四元组。</p><div class="language-js"><button title="Copy Code" class="copy"></button><span class="lang">js</span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">给定数组 nums </span><span style="color:#89DDFF;">=</span><span style="color:#A6ACCD;"> [</span><span style="color:#F78C6C;">1</span><span style="color:#89DDFF;">,</span><span style="color:#A6ACCD;"> </span><span style="color:#F78C6C;">0</span><span style="color:#89DDFF;">,</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">-</span><span style="color:#F78C6C;">1</span><span style="color:#89DDFF;">,</span><span style="color:#A6ACCD;"> </span><span style="color:#F78C6C;">0</span><span style="color:#89DDFF;">,</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">-</span><span style="color:#F78C6C;">2</span><span style="color:#89DDFF;">,</span><span style="color:#A6ACCD;"> </span><span style="color:#F78C6C;">2</span><span style="color:#A6ACCD;">]，和 target </span><span style="color:#89DDFF;">=</span><span style="color:#A6ACCD;"> </span><span style="color:#F78C6C;">0</span><span style="color:#A6ACCD;">。</span></span>
<span class="line"></span>
<span class="line"><span style="color:#A6ACCD;">满足要求的四元组集合为：</span></span>
<span class="line"><span style="color:#A6ACCD;">[</span></span>
<span class="line"><span style="color:#A6ACCD;">  [</span><span style="color:#89DDFF;">-</span><span style="color:#F78C6C;">1</span><span style="color:#89DDFF;">,</span><span style="color:#A6ACCD;">  </span><span style="color:#F78C6C;">0</span><span style="color:#89DDFF;">,</span><span style="color:#A6ACCD;"> </span><span style="color:#F78C6C;">0</span><span style="color:#89DDFF;">,</span><span style="color:#A6ACCD;"> </span><span style="color:#F78C6C;">1</span><span style="color:#A6ACCD;">]</span><span style="color:#89DDFF;">,</span></span>
<span class="line"><span style="color:#A6ACCD;">  [</span><span style="color:#89DDFF;">-</span><span style="color:#F78C6C;">2</span><span style="color:#89DDFF;">,</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">-</span><span style="color:#F78C6C;">1</span><span style="color:#89DDFF;">,</span><span style="color:#A6ACCD;"> </span><span style="color:#F78C6C;">1</span><span style="color:#89DDFF;">,</span><span style="color:#A6ACCD;"> </span><span style="color:#F78C6C;">2</span><span style="color:#A6ACCD;">]</span><span style="color:#89DDFF;">,</span></span>
<span class="line"><span style="color:#A6ACCD;">  [</span><span style="color:#89DDFF;">-</span><span style="color:#F78C6C;">2</span><span style="color:#89DDFF;">,</span><span style="color:#A6ACCD;">  </span><span style="color:#F78C6C;">0</span><span style="color:#89DDFF;">,</span><span style="color:#A6ACCD;"> </span><span style="color:#F78C6C;">0</span><span style="color:#89DDFF;">,</span><span style="color:#A6ACCD;"> </span><span style="color:#F78C6C;">2</span><span style="color:#A6ACCD;">]</span></span>
<span class="line"><span style="color:#A6ACCD;">]</span></span></code></pre></div><h3 id="思路-2" tabindex="-1">思路 <a class="header-anchor" href="#思路-2" aria-label="Permalink to &quot;思路&quot;">​</a></h3><p>通过大小指针降低复杂度</p><ul><li>过滤和前一个相同的</li><li>前后指针记得去重</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var fourSum = function(nums, target) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    nums = nums.sort((a, b) =&gt; a - b)</span></span>
<span class="line"><span style="color:#A6ACCD;">    const result = []</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i=0; i&lt;nums.length-3; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 过滤和前一个重复</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (i&gt;0 &amp; nums[i] === nums[i-1]) continue</span></span>
<span class="line"><span style="color:#A6ACCD;">        for (let j=i+1; j&lt;nums.length-2; j++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 过滤和前一个重复</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (j&gt;i+1 &amp;&amp; nums[j] === nums[j-1]) continue</span></span>
<span class="line"><span style="color:#A6ACCD;">             // 前后指针</span></span>
<span class="line"><span style="color:#A6ACCD;">            let left = j+1</span></span>
<span class="line"><span style="color:#A6ACCD;">            let right = nums.length-1</span></span>
<span class="line"><span style="color:#A6ACCD;">            while(left&lt;right) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                const sum = nums[i] + nums[j] + nums[left] + nums[right]</span></span>
<span class="line"><span style="color:#A6ACCD;">                if (sum === target) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                    result.push([nums[i], nums[j], nums[left], nums[right]])</span></span>
<span class="line"><span style="color:#A6ACCD;">                    // 前指针去重</span></span>
<span class="line"><span style="color:#A6ACCD;">                    while (left&lt;right &amp;&amp; nums[left] === nums[left+1]) left++</span></span>
<span class="line"><span style="color:#A6ACCD;">                    // 后指针去重</span></span>
<span class="line"><span style="color:#A6ACCD;">                    while (left&lt;right &amp;&amp; nums[right] === nums[right-1]) right--</span></span>
<span class="line"><span style="color:#A6ACCD;">                    left++</span></span>
<span class="line"><span style="color:#A6ACCD;">                    right--</span></span>
<span class="line"><span style="color:#A6ACCD;">                } else if (sum &lt; target) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                    left++</span></span>
<span class="line"><span style="color:#A6ACCD;">                } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">                    right--</span></span>
<span class="line"><span style="color:#A6ACCD;">                }</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return result</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div><h2 id="把数组排成最小的数" tabindex="-1">把数组排成最小的数 <a class="header-anchor" href="#把数组排成最小的数" aria-label="Permalink to &quot;把数组排成最小的数&quot;">​</a></h2><h3 id="题目-3" tabindex="-1">题目 <a class="header-anchor" href="#题目-3" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>输入一个非负整数数组，把数组里所有数字拼接起来排成一个数，打印能拼接出的所有数字中最小的一个。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入: [10,2]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出: &quot;102</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入: [3,30,34,5,9]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出: &quot;3033459&quot;</span></span></code></pre></div><h3 id="思路-3" tabindex="-1">思路 <a class="header-anchor" href="#思路-3" aria-label="Permalink to &quot;思路&quot;">​</a></h3><ul><li>若拼接字符串 <code>x+y&gt;y+x</code>,则x&gt;y,否则y&gt;=x</li><li>在拼接的时候只需要做一个排序（升序）即可</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var minNumber = function(nums) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i=0; i&lt;nums.length; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        for (let j=0; j&lt;nums.length-i-1; j++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (\`\${nums[j]}\${nums[j+1]}\` &gt; \`\${nums[j+1]}\${nums[j]}\`) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                [nums[j], nums[j+1]] = [nums[j+1], nums[j]]</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return nums.join(&#39;&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div><h2 id="第一个只出现一次的字符" tabindex="-1">第一个只出现一次的字符 <a class="header-anchor" href="#第一个只出现一次的字符" aria-label="Permalink to &quot;第一个只出现一次的字符&quot;">​</a></h2><h3 id="题目-4" tabindex="-1">题目 <a class="header-anchor" href="#题目-4" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>在字符串 s 中找出第一个只出现一次的字符。如果没有，返回一个单空格。 s 只包含小写字母。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：s = &quot;abaccdeff&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：&#39;b&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：s = &quot;&quot; </span></span>
<span class="line"><span style="color:#A6ACCD;">输出：&#39; &#39;</span></span></code></pre></div><h3 id="思想" tabindex="-1">思想 <a class="header-anchor" href="#思想" aria-label="Permalink to &quot;思想&quot;">​</a></h3><ol><li>遍历维护一个map记录存在状态（多次-1），遍历返回不为-1的第一个</li><li>遍历维护一个map记录存在状态（多次-1），同时维护一个队列记录数值和状态（多次-1），当map存在的时候，如果对头中存在key映射到map为-1的，则出队</li></ol><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var firstUniqChar = function(s) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const map = new Map()</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i=0; i&lt;s.length; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (map.has(s[i])) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            map.set(s[i], -1)</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">            map.set(s[i], i)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i=0; i&lt;s.length; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (map.get(s[i]) !== -1) return s[i]</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return &#39; &#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var firstUniqChar = function(s) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const map = new Map()</span></span>
<span class="line"><span style="color:#A6ACCD;">    const queue = []</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i=0; i&lt;s.length; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (map.has(s[i])) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 如果多次状态为-1</span></span>
<span class="line"><span style="color:#A6ACCD;">            map.set(s[i], -1)</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 只要队头存在映射到map为-1 的，则出队</span></span>
<span class="line"><span style="color:#A6ACCD;">            while(queue.length &amp;&amp; map.get(queue[0][0]) === -1) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                queue.shift()</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">            map.set(s[i], i)</span></span>
<span class="line"><span style="color:#A6ACCD;">            queue.push([s[i], i])</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return queue.length ? queue[0][0] : &#39; &#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div><h2 id="调整数组顺序使奇数位于偶数前面" tabindex="-1">调整数组顺序使奇数位于偶数前面 <a class="header-anchor" href="#调整数组顺序使奇数位于偶数前面" aria-label="Permalink to &quot;调整数组顺序使奇数位于偶数前面&quot;">​</a></h2><h3 id="题目-5" tabindex="-1">题目 <a class="header-anchor" href="#题目-5" aria-label="Permalink to &quot;题目&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：nums = [1,2,3,4]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：[1,3,2,4] </span></span>
<span class="line"><span style="color:#A6ACCD;">注：[3,1,2,4] 也是正确的答案之一。</span></span></code></pre></div><h3 id="思想-1" tabindex="-1">思想 <a class="header-anchor" href="#思想-1" aria-label="Permalink to &quot;思想&quot;">​</a></h3><p>双指针 + 一次遍历，首尾往中间</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var exchange = function(nums) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let left = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    let right = nums.length-1</span></span>
<span class="line"><span style="color:#A6ACCD;">    while(left&lt;right) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        while(left&lt;right &amp;&amp; nums[left] % 2 === 1) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            left++</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        while(left&lt;right &amp;&amp; nums[right] % 2 === 0) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            right--</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (left&lt;right) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            [nums[left], nums[right]] = [nums[right], nums[left]]</span></span>
<span class="line"><span style="color:#A6ACCD;">            left++</span></span>
<span class="line"><span style="color:#A6ACCD;">            right--</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return nums</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div><h2 id="下一个队列" tabindex="-1">下一个队列 <a class="header-anchor" href="#下一个队列" aria-label="Permalink to &quot;下一个队列&quot;">​</a></h2><h3 id="题目-6" tabindex="-1">题目 <a class="header-anchor" href="#题目-6" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>整数数组的一个 排列 就是将其所有成员以序列或线性顺序排列。 例如，arr = [1,2,3] ，以下这些都可以视作 arr 的排列：[1,2,3]、[1,3,2]、[3,1,2]、[2,3,1] 。 必须 <strong>原地</strong> 修改，只允许使用额外常数空间。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：nums = [1,2,3]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：[1,3,2]</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：nums = [3,2,1]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：[1,2,3]</span></span></code></pre></div><h3 id="思想-2" tabindex="-1">思想 <a class="header-anchor" href="#思想-2" aria-label="Permalink to &quot;思想&quot;">​</a></h3><ul><li>需要将左边【较小数】与右边【较大数】交换，从而让排列变大</li><li>让【较小数】尽量靠右，【较大数】尽可能小</li><li>[4,5,2,6,3,1] <ul><li>找到符合【较小数】与【较大数】为2与3</li><li>交换后为[4,5,3,6,2,1]，此时我们可以重排「较小数」右边的序列，序列变为 [4,5,3,1,2,6]</li></ul></li><li>算法描述 <ul><li>从后向前查找第一个顺序对(i, i+1), 满足<code>a[i]&lt;a[i+1]</code>，较小数即为a[i],此时<code>[i+1, n)</code>必然是降序的</li><li>找到了顺序对，在区间<code>[i+1, n)</code> 中从后向前查找第一个元素 j 满足 a[i] &lt; a[j],较大数为a[j]</li><li>交换a[i]与a[j],<code>[i+1, n)</code>是降序的，反转使其变为升序即可</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var nextPermutation = function(nums) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let i = nums.length - 2</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 找到较小数下标</span></span>
<span class="line"><span style="color:#A6ACCD;">    while(i&gt;=0 &amp;&amp; nums[i] &gt;= nums[i+1]) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        i--</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 找到较大数下标</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (i &gt;= 0) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        let j = nums.length - 1</span></span>
<span class="line"><span style="color:#A6ACCD;">        while(j&gt;=0 &amp;&amp; nums[i] &gt;= nums[j]) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            j--</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 交换较小较大数</span></span>
<span class="line"><span style="color:#A6ACCD;">        [nums[i], nums[j]] = [nums[j], nums[i]]</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 升序交换</span></span>
<span class="line"><span style="color:#A6ACCD;">    let left = i+1</span></span>
<span class="line"><span style="color:#A6ACCD;">    let right = nums.length - 1</span></span>
<span class="line"><span style="color:#A6ACCD;">    while(left&lt;right) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        [nums[left], nums[right]] = [nums[right], nums[left]]</span></span>
<span class="line"><span style="color:#A6ACCD;">        left++</span></span>
<span class="line"><span style="color:#A6ACCD;">        right--</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div><h2 id="搜索螺旋排序数组" tabindex="-1">搜索螺旋排序数组 <a class="header-anchor" href="#搜索螺旋排序数组" aria-label="Permalink to &quot;搜索螺旋排序数组&quot;">​</a></h2><h3 id="题目-7" tabindex="-1">题目 <a class="header-anchor" href="#题目-7" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>整数数组 nums 按升序排列，数组中的值 互不相同 。</p><p>在传递给函数之前，nums 在预先未知的某个下标 k（0 &lt;= k &lt; nums.length）上进行了 旋转，使数组变为 [nums[k], nums[k+1], ..., nums[n-1], nums[0], nums[1], ..., nums[k-1]]（下标 从 0 开始 计数）。例如， [0,1,2,4,5,6,7] 在下标 3 处经旋转后可能变为 [4,5,6,7,0,1,2] 。</p><p>给你 旋转后 的数组 nums 和一个整数 target ，如果 nums 中存在这个目标值 target ，则返回它的下标，否则返回 -1 。</p><p>你必须设计一个时间复杂度为 O(log n) 的算法解决此问题。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：nums = [4,5,6,7,0,1,2], target = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：4</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：nums = [4,5,6,7,0,1,2], target = 3</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：-1</span></span></code></pre></div><h3 id="思想-3" tabindex="-1">思想 <a class="header-anchor" href="#思想-3" aria-label="Permalink to &quot;思想&quot;">​</a></h3><ul><li>利用二分查找的方法，确认哪一部分是有序的，从有序的之中再次进行查找</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var search = function (nums, target) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let left = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    let right = nums.length - 1</span></span>
<span class="line"><span style="color:#A6ACCD;">    while (left &lt;= right) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        let middle = Math.floor((left + right) / 2)</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (nums[middle] === target) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            return middle</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        // middle 在数组的左段</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (nums[0] &lt;= nums[middle]) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (nums[0] &lt;= target &amp;&amp; target &lt; nums[middle]) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                right = middle - 1</span></span>
<span class="line"><span style="color:#A6ACCD;">            } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">                left = middle + 1</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">            // middle 在数组的右段</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (nums[middle] &lt; target &amp;&amp; target &lt;= nums[nums.length - 1]) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                left = middle + 1</span></span>
<span class="line"><span style="color:#A6ACCD;">            } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">                right = middle - 1</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return -1</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h2 id="缺失的第一个正数" tabindex="-1">缺失的第一个正数 <a class="header-anchor" href="#缺失的第一个正数" aria-label="Permalink to &quot;缺失的第一个正数&quot;">​</a></h2><h3 id="题目-8" tabindex="-1">题目 <a class="header-anchor" href="#题目-8" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>给你一个未排序的整数数组 nums ，请你找出其中没有出现的最小的正整数。</p><p>请你实现时间复杂度为 O(n) 并且只使用常数级别额外空间的解决方案。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：nums = [1,2,0]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：3</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：nums = [3,4,-1,1]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：2</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：nums = [7,8,9,11,12]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：1</span></span></code></pre></div><h3 id="思想-4" tabindex="-1">思想 <a class="header-anchor" href="#思想-4" aria-label="Permalink to &quot;思想&quot;">​</a></h3><ul><li><p>使用常量</p><ul><li>构建一个数组，把源数据作为改数组下标</li><li>从1开始遍历，如果没有对应的则是最小的第一个正数</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var firstMissingPositive = function (nums) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let arr = []</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i = 0; i &lt; nums.length; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (nums[i] &gt; 0) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            arr[nums[i]] = nums[i]</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let j = 1; j &lt; arr.length; j++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (!arr[j]) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            return j</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return arr.length ? arr[arr.length - 1] + 1 : 1</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div></li><li><p>不使用常量</p><p><img src="`+p+`" alt="image-20230803130609147"></p><ul><li>长度为N的数组，没有出现的最小整数只能在[1, N+1]中</li><li>[1, N]都出现，则是N+1,否则出现在[1, N]</li><li>对数组遍历得到当前数<strong>x</strong>，如果在[1, N],则将数组中<strong>x-1</strong>（从0开始）个位置标记</li><li>遍历结束后，如果都打了标记则是N+1,否则是最小的没有打标记的位置加1</li><li>算法过程 <ul><li>将数组小于等于0的数修改为N+1</li><li>遍历数组得到<strong>x</strong>,（可能被打了标记（负号））取<code>|x|</code>如果在[1, N]，给数组中<code>|x|-1</code>个位置添加一个负号</li><li>遍历完之后，如果每一个数都是负数，那么答案是N+1,否则第一个正数位置加1</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var firstMissingPositive = function (nums) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const n = nums.length</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 小于等于0的修改为 n+1</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i=0; i&lt;n; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (nums[i]&lt;=0) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            nums[i] = n + 1</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 范围内的值将其对应下标的值变为负数</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i=0; i&lt;n; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        const num = Math.abs(nums[i])</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (num &lt;= n) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            nums[num-1] = -Math.abs(nums[num-1])</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 找到第一个不为负数的值</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i=0; i&lt;n; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (nums[i] &gt; 0) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            return i+1</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return n + 1</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div></li></ul><h2 id="合并区间" tabindex="-1">合并区间 <a class="header-anchor" href="#合并区间" aria-label="Permalink to &quot;合并区间&quot;">​</a></h2><h3 id="题目-9" tabindex="-1">题目 <a class="header-anchor" href="#题目-9" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>以数组 <code>intervals</code> 表示若干个区间的集合，其中单个区间为 <code>intervals[i] = [starti, endi]</code> 。请你合并所有重叠的区间，并返回 <em>一个不重叠的区间数组，该数组需恰好覆盖输入中的所有区间</em> 。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：intervals = [[1,3],[2,6],[8,10],[15,18]]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：[[1,6],[8,10],[15,18]]</span></span>
<span class="line"><span style="color:#A6ACCD;">解释：区间 [1,3] 和 [2,6] 重叠, 将它们合并为 [1,6].</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：intervals = [[1,4],[4,5]]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：[[1,5]]</span></span>
<span class="line"><span style="color:#A6ACCD;">解释：区间 [1,4] 和 [4,5] 可被视为重叠区间。</span></span></code></pre></div><h3 id="思想-5" tabindex="-1">思想 <a class="header-anchor" href="#思想-5" aria-label="Permalink to &quot;思想&quot;">​</a></h3><ul><li>按照区间左端点升序排序，排完序的列表中，可以合并的区间一定是连续的</li><li>如果当前区间的左端点在<code>merged</code>中最后一个区间的右端点后，则他们是不重合的</li><li>否则是重合的，更新右端点较大值即可 <img src="`+e+`" alt="合并区间"></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var merge = function (intervals) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  if (intervals.length === 0) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return [];</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 升序排序</span></span>
<span class="line"><span style="color:#A6ACCD;">  intervals.sort((interval1, interval2) =&gt; interval1[0] - interval2[0]);</span></span>
<span class="line"><span style="color:#A6ACCD;">  const merged = [];</span></span>
<span class="line"><span style="color:#A6ACCD;">  for (let i = 0; i &lt; intervals.length; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let [L, R] = intervals[i];</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (merged.length === 0 || merged[merged.length - 1][1] &lt; L) {</span></span>
<span class="line"><span style="color:#A6ACCD;">      // 如果合并数组中大值小于当前的小值,证明不属于这个区间</span></span>
<span class="line"><span style="color:#A6ACCD;">      merged.push([L, R]);</span></span>
<span class="line"><span style="color:#A6ACCD;">    } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">      // 属于这个区间，重新获取这个区间的大值</span></span>
<span class="line"><span style="color:#A6ACCD;">      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], R);</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">  return merged;</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div><h2 id="寻找峰值" tabindex="-1">寻找峰值 <a class="header-anchor" href="#寻找峰值" aria-label="Permalink to &quot;寻找峰值&quot;">​</a></h2><h3 id="题目-10" tabindex="-1">题目 <a class="header-anchor" href="#题目-10" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>峰值元素是指其值严格大于左右相邻值的元素。 给你一个整数数组 nums，找到峰值元素并返回其索引。数组可能包含多个峰值，在这种情况下，返回 任何一个峰值 所在位置即可。</p><p>你可以假设 nums[-1] = nums[n] = -∞ 。</p><p>你必须实现时间复杂度为 O(log n) 的算法来解决此问题。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：nums = [1,2,3,1]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：2</span></span>
<span class="line"><span style="color:#A6ACCD;">解释：3 是峰值元素，你的函数应该返回其索引 2。</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：nums = [1,2,1,3,5,6,4]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：1 或 5 </span></span>
<span class="line"><span style="color:#A6ACCD;">解释：你的函数可以返回索引 1，其峰值元素为 2；</span></span>
<span class="line"><span style="color:#A6ACCD;">     或者返回索引 5， 其峰值元素为 6。</span></span></code></pre></div><h3 id="思想-6" tabindex="-1">思想 <a class="header-anchor" href="#思想-6" aria-label="Permalink to &quot;思想&quot;">​</a></h3><ol><li>寻找最大值</li><li>迭代爬坡</li></ol><ul><li>在 <code>[0,n)</code> 的范围内随机一个初始位置 iii，随后根据 <code>nums[i−1],nums[i],nums[i+1]</code> 决定爬的方向</li><li><code>nums[i−1]&lt;nums[i]&gt;nums[i+1]</code>: i 就是峰值，返回i</li><li><code>nums[i−1]&lt;nums[i]&lt;nums[i+1]</code>：i 处于上坡，往右走</li><li><code>nums[i−1]&gt;nums[i]&gt;nums[i+1]</code>：i 处于下坡，往左走</li><li><code>nums[i−1]&gt;nums[i]&lt;nums[i+1]</code>：i处于山谷，两侧都是上坡，任意方向走，我们规定往右</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var findPeakElement = function(nums) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let left = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    let right = nums.length - 1</span></span>
<span class="line"><span style="color:#A6ACCD;">    while(left&lt;right) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 中间值</span></span>
<span class="line"><span style="color:#A6ACCD;">        const mid = Math.floor((left+right) / 2)</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (nums[mid] &gt; nums[mid+1]) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 当前元素大于右侧相邻元素，峰值可能在左侧</span></span>
<span class="line"><span style="color:#A6ACCD;">            right = mid</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 当前元素小于右侧相邻元素，峰值可能在右侧</span></span>
<span class="line"><span style="color:#A6ACCD;">            left = mid+1</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return left</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h2 id="合并两个有序数组" tabindex="-1">合并两个有序数组 <a class="header-anchor" href="#合并两个有序数组" aria-label="Permalink to &quot;合并两个有序数组&quot;">​</a></h2><h3 id="题目-11" tabindex="-1">题目 <a class="header-anchor" href="#题目-11" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>给你两个按 非递减顺序 排列的整数数组 nums1 和 nums2，另有两个整数 m 和 n ，分别表示 nums1 和 nums2 中的元素数目。</p><p>请你 合并 nums2 到 nums1 中，使合并后的数组同样按 非递减顺序 排列。</p><p>注意：最终，合并后数组不应由函数返回，而是存储在数组 nums1 中。为了应对这种情况，nums1 的初始长度为 m + n，其中前 m 个元素表示应合并的元素，后 n 个元素为 0 ，应忽略。nums2 的长度为 n 。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：nums1 = [1,2,3,0,0,0], m = 3, nums2 = [2,5,6], n = 3</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：[1,2,2,3,5,6]</span></span>
<span class="line"><span style="color:#A6ACCD;">解释：需要合并 [1,2,3] 和 [2,5,6] 。</span></span>
<span class="line"><span style="color:#A6ACCD;">合并结果是 [1,2,2,3,5,6] ，其中斜体加粗标注的为 nums1 中的元素。</span></span></code></pre></div><h3 id="题解" tabindex="-1">题解 <a class="header-anchor" href="#题解" aria-label="Permalink to &quot;题解&quot;">​</a></h3><ol><li><p>直接合并后排序</p></li><li><p>双指针</p><ul><li>利用双指针每次比较两者中较大的放入公共空间</li></ul><p><img src="`+o+`" alt="1"></p></li><li><p>逆向双指针</p><ul><li>把两者中较大的值放到数组的末尾</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var merge = function (nums1, m, nums2, n) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  let l = m - 1;</span></span>
<span class="line"><span style="color:#A6ACCD;">  let r = n - 1;</span></span>
<span class="line"><span style="color:#A6ACCD;">  let tail = m + n - 1;</span></span>
<span class="line"><span style="color:#A6ACCD;">  let cur;</span></span>
<span class="line"><span style="color:#A6ACCD;">  while (l &gt;= 0 || r &gt;= 0) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (l === -1) {</span></span>
<span class="line"><span style="color:#A6ACCD;">      cur = nums2[r--];</span></span>
<span class="line"><span style="color:#A6ACCD;">    } else if (r === -1) {</span></span>
<span class="line"><span style="color:#A6ACCD;">      cur = nums1[l--];</span></span>
<span class="line"><span style="color:#A6ACCD;">    } else if (nums1[l] &gt; nums2[r]) {</span></span>
<span class="line"><span style="color:#A6ACCD;">      cur = nums1[l--];</span></span>
<span class="line"><span style="color:#A6ACCD;">    } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">      cur = nums2[r--];</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    nums1[tail--] = cur;</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div></li></ol><h2 id="移除元素" tabindex="-1">移除元素 <a class="header-anchor" href="#移除元素" aria-label="Permalink to &quot;移除元素&quot;">​</a></h2><h3 id="题目-12" tabindex="-1">题目 <a class="header-anchor" href="#题目-12" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>给你一个数组 nums 和一个值 val，你需要 原地 移除所有数值等于 val 的元素，并返回移除后数组的新长度。</p><p>不要使用额外的数组空间，你必须仅使用 O(1) 额外空间并 原地 修改输入数组。</p><p>元素的顺序可以改变。你不需要考虑数组中超出新长度后面的元素。</p><h3 id="题解-1" tabindex="-1">题解 <a class="header-anchor" href="#题解-1" aria-label="Permalink to &quot;题解&quot;">​</a></h3><ol><li><p>拷贝覆盖</p><ul><li>设置下标 ans，遍历数组，当遍历元素不等于 val，则ans自增1，则得到新的数组长度</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var removeElement = function (nums, val) {</span></span>
<span class="line"><span style="color:#A6ACCD;"> let ans = 0;</span></span>
<span class="line"><span style="color:#A6ACCD;"> for (const num of nums) {</span></span>
<span class="line"><span style="color:#A6ACCD;">     if (num != val) {</span></span>
<span class="line"><span style="color:#A6ACCD;">     nums[ans] = num;</span></span>
<span class="line"><span style="color:#A6ACCD;">     ans++;</span></span>
<span class="line"><span style="color:#A6ACCD;">     }</span></span>
<span class="line"><span style="color:#A6ACCD;"> }</span></span>
<span class="line"><span style="color:#A6ACCD;"> return ans;</span></span>
<span class="line"><span style="color:#A6ACCD;"> };</span></span></code></pre></div></li><li><p>双指针原地移除</p><ul><li>如果左指针 left 指向的元素等于val，此时将右指针 right 指向的元素复制到左指针left 的位置，然后右指针 right 左移一位</li><li>如果赋值过来的元素恰好也等于 val，可以继续把右指针right 指向的元素的值赋值过来（左指针 left 指向的等于val 的元素的位置继续被覆盖），直到左指针指向的元素的值不等于val 为止</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var removeElement = function (nums, val) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  let left = 0;</span></span>
<span class="line"><span style="color:#A6ACCD;">  let right = nums.length;</span></span>
<span class="line"><span style="color:#A6ACCD;">  while (left &lt; right) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (nums[left] === val) {</span></span>
<span class="line"><span style="color:#A6ACCD;">      nums[left] = nums[right - 1];</span></span>
<span class="line"><span style="color:#A6ACCD;">      right--;</span></span>
<span class="line"><span style="color:#A6ACCD;">    } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">      left++;</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">  return left;</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div></li></ol><h2 id="删除有序数组中的重复项" tabindex="-1">删除有序数组中的重复项 <a class="header-anchor" href="#删除有序数组中的重复项" aria-label="Permalink to &quot;删除有序数组中的重复项&quot;">​</a></h2><h3 id="题目-13" tabindex="-1">题目 <a class="header-anchor" href="#题目-13" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>给你一个 升序排列 的数组 nums ，请你 原地 删除重复出现的元素，使每个元素 只出现一次 ，返回删除后数组的新长度。元素的 相对顺序 应该保持 一致 。然后返回 nums 中唯一元素的个数。</p><p>考虑 nums 的唯一元素的数量为 k ，你需要做以下事情确保你的题解可以被通过：</p><p>更改数组 nums ，使 nums 的前 k 个元素包含唯一元素，并按照它们最初在 nums 中出现的顺序排列。nums 的其余元素与 nums 的大小不重要。 返回 k 。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：nums = [0,0,1,1,1,2,2,3,3,4]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：5, nums = [0,1,2,3,4]</span></span>
<span class="line"><span style="color:#A6ACCD;">解释：函数应该返回新的长度 5 ， 并且原数组 nums 的前五个元素被修改为 0, 1, 2, 3, 4 。不需要考虑数组中超出新长度后面的元素。</span></span></code></pre></div><h3 id="思路-4" tabindex="-1">思路 <a class="header-anchor" href="#思路-4" aria-label="Permalink to &quot;思路&quot;">​</a></h3><p>拷贝覆盖，设置不重复的下标ans，由于是升序，则当目前item和前一个item不一样时则代表不重复，ans+1同时设置数组下标的新值，由于下标从0开始，则长度时ans+1</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var removeDuplicates = function(nums) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let ans = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i=1; i&lt;nums.length; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (nums[i] !== nums[i-1]) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            nums[++ans] = nums[i]</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return ans+1</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div>`,111),i=[c];function r(C,A,y,u,D,m){return n(),a("div",null,i)}const g=s(t,[["render",r]]);export{d as __pageData,g as default};
