import{_ as s,o as n,c as a,U as l}from"./chunks/framework.9adb0f96.js";const D=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"alg/range.md","filePath":"alg/range.md","lastUpdated":1694616803000}'),e={name:"alg/range.md"},p=l(`<h2 id="汇总区间" tabindex="-1">汇总区间 <a class="header-anchor" href="#汇总区间" aria-label="Permalink to &quot;汇总区间&quot;">​</a></h2><h3 id="题目" tabindex="-1">题目 <a class="header-anchor" href="#题目" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>给定一个 无重复元素 的 有序 整数数组 nums 。</p><p>返回 恰好覆盖数组中所有数字 的 最小有序 区间范围列表 。也就是说，nums 的每个元素都恰好被某个区间范围所覆盖，并且不存在属于某个范围但不属于 nums 的数字 x 。</p><p>列表中的每个区间范围 [a,b] 应该按如下格式输出：</p><p>&quot;a-&gt;b&quot; ，如果 a != b &quot;a&quot; ，如果 a == b</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：nums = [0,1,2,4,5,7]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：[&quot;0-&gt;2&quot;,&quot;4-&gt;5&quot;,&quot;7&quot;]</span></span>
<span class="line"><span style="color:#A6ACCD;">解释：区间范围是：</span></span>
<span class="line"><span style="color:#A6ACCD;">[0,2] --&gt; &quot;0-&gt;2&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">[4,5] --&gt; &quot;4-&gt;5&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">[7,7] --&gt; &quot;7&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：nums = [0,2,3,4,6,8,9]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：[&quot;0&quot;,&quot;2-&gt;4&quot;,&quot;6&quot;,&quot;8-&gt;9&quot;]</span></span>
<span class="line"><span style="color:#A6ACCD;">解释：区间范围是：</span></span>
<span class="line"><span style="color:#A6ACCD;">[0,0] --&gt; &quot;0&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">[2,4] --&gt; &quot;2-&gt;4&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">[6,6] --&gt; &quot;6&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">[8,9] --&gt; &quot;8-&gt;</span></span></code></pre></div><h3 id="思想" tabindex="-1">思想 <a class="header-anchor" href="#思想" aria-label="Permalink to &quot;思想&quot;">​</a></h3><ul><li>从数组位置 0 出发，向右遍历，每次遇到相邻元素之间差值大于1时，就找到了另一个区间</li><li>维护下标 low 和 high 分别记录区间的起点和终点</li><li>当 low &lt; higt 时，区间字符串表示 <code>low-&gt;hight</code></li><li>当 low = higt 时，区间字符串表示 <code>low</code></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var summaryRanges = function(nums) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const ret = []</span></span>
<span class="line"><span style="color:#A6ACCD;">    let i = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    const length = nums.length</span></span>
<span class="line"><span style="color:#A6ACCD;">    while(i&lt;length) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        const low = i</span></span>
<span class="line"><span style="color:#A6ACCD;">        i++</span></span>
<span class="line"><span style="color:#A6ACCD;">        while(i&lt;length &amp;&amp; nums[i] === nums[i-1] + 1) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            i++</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        const high = i - 1</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (low &lt; high) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            ret.push(\`\${nums[low]}-&gt;\${nums[high]}\`)</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">            ret.push(\`\${nums[low]}\`)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return ret</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div><h2 id="合并区间" tabindex="-1">合并区间 <a class="header-anchor" href="#合并区间" aria-label="Permalink to &quot;合并区间&quot;">​</a></h2><h3 id="题目-1" tabindex="-1">题目 <a class="header-anchor" href="#题目-1" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>以数组 intervals 表示若干个区间的集合，其中单个区间为 intervals[i] = [starti, endi] 。请你合并所有重叠的区间，并返回 一个不重叠的区间数组，该数组需恰好覆盖输入中的所有区间 。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：intervals = [[1,3],[2,6],[8,10],[15,18]]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：[[1,6],[8,10],[15,18]]</span></span>
<span class="line"><span style="color:#A6ACCD;">解释：区间 [1,3] 和 [2,6] 重叠, 将它们合并为 [1,6]</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：intervals = [[1,4],[4,5]]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：[[1,5]]</span></span>
<span class="line"><span style="color:#A6ACCD;">解释：区间 [1,4] 和 [4,5] 可被视为重叠区间。</span></span></code></pre></div><h3 id="思想-1" tabindex="-1">思想 <a class="header-anchor" href="#思想-1" aria-label="Permalink to &quot;思想&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var merge = function(intervals) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 升序排序，保证前一项的[0] &lt;= 后一项的[0]</span></span>
<span class="line"><span style="color:#A6ACCD;">    intervals.sort((intervals1, intervals2) =&gt; intervals1[0] - intervals2[0])</span></span>
<span class="line"><span style="color:#A6ACCD;">    const merged = []</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i=0; i&lt;intervals.length; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        let [L, R] = intervals[i]</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (merged.length === 0 || merged[merged.length-1][1] &lt; L) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 当前没有合并过或者合并数组的大值小于item的小值，则属于一个新的区间</span></span>
<span class="line"><span style="color:#A6ACCD;">            merged.push([L, R])</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 属于同一个区间，更新区间的大值</span></span>
<span class="line"><span style="color:#A6ACCD;">            merged[merged.length - 1][1] = Math.max(merged[merged.length-1][1], R)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return merged</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div><h2 id="插入区间" tabindex="-1">插入区间 <a class="header-anchor" href="#插入区间" aria-label="Permalink to &quot;插入区间&quot;">​</a></h2><h3 id="题目-2" tabindex="-1">题目 <a class="header-anchor" href="#题目-2" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>给你一个 无重叠的 ，按照区间起始端点排序的区间列表。</p><p>在列表中插入一个新的区间，你需要确保列表中的区间仍然有序且不重叠（如果有必要的话，可以合并区间）。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：intervals = [[1,3],[6,9]], newInterval = [2,5]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：[[1,5],[6,9]]</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：intervals = [[1,2],[3,5],[6,7],[8,10],[12,16]], newInterval = [4,8]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：[[1,2],[3,10],[12,16]]</span></span>
<span class="line"><span style="color:#A6ACCD;">解释：这是因为新的区间 [4,8] 与 [3,5],[6,7],[8,10] 重叠。</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：intervals = [], newInterval = [5,7]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：[[5,7]]</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：intervals = [[1,5]], newInterval = [2,3]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：[[1,5]]</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：intervals = [[1,5]], newInterval = [2,7]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：[[1,7]]</span></span></code></pre></div><h3 id="思想-2" tabindex="-1">思想 <a class="header-anchor" href="#思想-2" aria-label="Permalink to &quot;思想&quot;">​</a></h3><ul><li>合并区间 <ul><li>把新的区间加到到老区间中，就可以直接用上面合并区间的解法</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var insert = function(intervals, newInterval) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const list = [...intervals, newInterval].sort((interval1, interval2) =&gt; interval1[0] - interval2[0])</span></span>
<span class="line"><span style="color:#A6ACCD;">    const merged = []</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i=0; i&lt;list.length; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        const [L, R] = list[i]</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (merged.length === 0 || merged[merged.length-1][1] &lt; L) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            merged.push([L, R])</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">            merged[merged.length-1][1] = Math.max(merged[merged.length-1][1], R)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return merged</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div><ul><li>模拟 对于区间<code>S1=[l1,r1]</code>和区间<code>S2=[l2,r2]</code>，如果他们之间没有重叠（没有交集），此时有两种情况 <ul><li>S1在S2的左侧，此时 <code>r1 &lt; l2</code></li><li>S1在S2的右侧，此时 <code>r2 &lt; l1</code></li><li>两者没满足，S1与S2有一定有交集，交集为[max(l1,l2), min(r1, r2)],并集为[min(l1,l2),max(r1,r2)]</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var insert = function(intervals, newInterval) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  let left = newInterval[0];</span></span>
<span class="line"><span style="color:#A6ACCD;">  let right = newInterval[1];</span></span>
<span class="line"><span style="color:#A6ACCD;">  let placed = false;</span></span>
<span class="line"><span style="color:#A6ACCD;">  let ansList = [];</span></span>
<span class="line"><span style="color:#A6ACCD;">  </span></span>
<span class="line"><span style="color:#A6ACCD;">  for (let interval of intervals) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (interval[0] &gt; right) {</span></span>
<span class="line"><span style="color:#A6ACCD;">      // 在插入区间的右侧且无交集</span></span>
<span class="line"><span style="color:#A6ACCD;">      if (!placed) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        ansList.push([left, right]);</span></span>
<span class="line"><span style="color:#A6ACCD;">        placed = true;</span></span>
<span class="line"><span style="color:#A6ACCD;">      }</span></span>
<span class="line"><span style="color:#A6ACCD;">      ansList.push(interval);</span></span>
<span class="line"><span style="color:#A6ACCD;">    } else if (interval[1] &lt; left) {</span></span>
<span class="line"><span style="color:#A6ACCD;">      // 在插入区间的左侧且无交集</span></span>
<span class="line"><span style="color:#A6ACCD;">      ansList.push(interval);</span></span>
<span class="line"><span style="color:#A6ACCD;">    } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">      // 与插入区间有交集，计算它们的并集</span></span>
<span class="line"><span style="color:#A6ACCD;">      left = Math.min(left, interval[0]);</span></span>
<span class="line"><span style="color:#A6ACCD;">      right = Math.max(right, interval[1]);</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">  </span></span>
<span class="line"><span style="color:#A6ACCD;">  if (!placed) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    ansList.push([left, right]);</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">  </span></span>
<span class="line"><span style="color:#A6ACCD;">  return ansList;</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div>`,26),t=[p];function o(c,i,r,C,A,y){return n(),a("div",null,t)}const u=s(e,[["render",o]]);export{D as __pageData,u as default};
