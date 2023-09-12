import{_ as s,o as a,c as n,U as l}from"./chunks/framework.9adb0f96.js";const p="/blog/assets/202_fig1.54f44fa0.png",e="/blog/assets/202_fig2.28bcd06d.png",d=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"alg/hash.md","filePath":"alg/hash.md","lastUpdated":1694430550000}'),o={name:"alg/hash.md"},t=l(`<h2 id="赎金信" tabindex="-1">赎金信 <a class="header-anchor" href="#赎金信" aria-label="Permalink to &quot;赎金信&quot;">​</a></h2><h3 id="题目" tabindex="-1">题目 <a class="header-anchor" href="#题目" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>给你两个字符串：ransomNote 和 magazine ，判断 ransomNote 能不能由 magazine 里面的字符构成。 如果可以，返回 true ；否则返回 false 。 magazine 中的每个字符只能在 ransomNote 中使用一次。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：ransomNote = &quot;a&quot;, magazine = &quot;b&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：false</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：ransomNote = &quot;aa&quot;, magazine = &quot;aab&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：true</span></span></code></pre></div><h3 id="思想" tabindex="-1">思想 <a class="header-anchor" href="#思想" aria-label="Permalink to &quot;思想&quot;">​</a></h3><ul><li>对 magazine 里的字符使用 map 记录其每个字符的个数</li><li>遍历 ransomNote，其出现的字符就把对应的map中减1，如果小于1或者没有这个字符则返回false</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var canConstruct = function(ransomNote, magazine) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const map = new Map()</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i=0; i&lt;magazine.length; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (map.has(magazine[i])) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            map.set(magazine[i], map.get(magazine[i])+1)</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">            map.set(magazine[i], 1)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let j=0; j&lt;ransomNote.length; j++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (!map.has(ransomNote[j]) || map.get(ransomNote[j]) &lt; 1) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            return false</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">            map.set(ransomNote[j], map.get(ransomNote[j])-1)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return true</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div><h2 id="同构字符串" tabindex="-1">同构字符串 <a class="header-anchor" href="#同构字符串" aria-label="Permalink to &quot;同构字符串&quot;">​</a></h2><h3 id="题目-1" tabindex="-1">题目 <a class="header-anchor" href="#题目-1" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>给定两个字符串 s 和 t ，判断它们是否是同构的。</p><p>如果 s 中的字符可以按某种映射关系替换得到 t ，那么这两个字符串是同构的。</p><p>每个出现的字符都应当映射到另一个字符，同时不改变字符的顺序。不同字符不能映射到同一个字符上，相同字符只能映射到同一个字符上，字符可以映射到自己本身。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：s = &quot;egg&quot;, t = &quot;add&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：true</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：s = &quot;foo&quot;, t = &quot;bar&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：false</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：s = &quot;paper&quot;, t = &quot;title&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：true</span></span></code></pre></div><h3 id="思想-1" tabindex="-1">思想 <a class="header-anchor" href="#思想-1" aria-label="Permalink to &quot;思想&quot;">​</a></h3><ul><li>成立条件 <ul><li>s 中任意一个字符被 t 中唯一字符对应</li><li>t 中任意一个字符被 s 中唯一字符对应</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var isIsomorphic = function(s, t) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const s2t = {}</span></span>
<span class="line"><span style="color:#A6ACCD;">    const t2s = {}</span></span>
<span class="line"><span style="color:#A6ACCD;">    const len = s.length</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i=0; i&lt;len; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        const S = s[i]</span></span>
<span class="line"><span style="color:#A6ACCD;">        const T = t[i]</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 先判断是否存在再判断是否一致</span></span>
<span class="line"><span style="color:#A6ACCD;">        if ((s2t[S] &amp;&amp; s2t[S] !== T) || (t2s[T] &amp;&amp; t2s[T] !== S)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            return false</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        s2t[S] = T</span></span>
<span class="line"><span style="color:#A6ACCD;">        t2s[T] = S</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return true</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div><h2 id="单词规律" tabindex="-1">单词规律 <a class="header-anchor" href="#单词规律" aria-label="Permalink to &quot;单词规律&quot;">​</a></h2><h3 id="题目-2" tabindex="-1">题目 <a class="header-anchor" href="#题目-2" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>给定一种规律 pattern 和一个字符串 s ，判断 s 是否遵循相同的规律。</p><p>这里的 遵循 指完全匹配，例如， pattern 里的每个字母和字符串 s 中的每个非空单词之间存在着双向连接的对应规律。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入: pattern = &quot;abba&quot;, s = &quot;dog cat cat dog&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">输出: true</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入:pattern = &quot;abba&quot;, s = &quot;dog cat cat fish&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">输出: false</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入: pattern = &quot;aaaa&quot;, s = &quot;dog cat cat dog&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">输出: false</span></span></code></pre></div><h3 id="思想-2" tabindex="-1">思想 <a class="header-anchor" href="#思想-2" aria-label="Permalink to &quot;思想&quot;">​</a></h3><p>注意不仅 pattern 的任意唯一字符与 t 中单词对应，t中任意单词也要跟 pattern 中任意字符对应，所以需要两个 map</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var wordPattern = function(pattern, s) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    s = s.split(&#39; &#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    let index = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (pattern.length !== s.length) return false</span></span>
<span class="line"><span style="color:#A6ACCD;">    length = pattern.length</span></span>
<span class="line"><span style="color:#A6ACCD;">    const p2sMap = new Map()</span></span>
<span class="line"><span style="color:#A6ACCD;">    const s2pMap = new Map()</span></span>
<span class="line"><span style="color:#A6ACCD;">    while(index &lt; length) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        const P = pattern[index]</span></span>
<span class="line"><span style="color:#A6ACCD;">        const S = s[index]</span></span>
<span class="line"><span style="color:#A6ACCD;">        if ((p2sMap.has(P) &amp;&amp; p2sMap.get(P) !== S) || (s2pMap.has(S) &amp;&amp; s2pMap.get(S) !== P)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            return false</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        p2sMap.set(P, S)</span></span>
<span class="line"><span style="color:#A6ACCD;">        s2pMap.set(S, P)</span></span>
<span class="line"><span style="color:#A6ACCD;">        index++</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return true</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div><h2 id="有效的字母异位词" tabindex="-1">有效的字母异位词 <a class="header-anchor" href="#有效的字母异位词" aria-label="Permalink to &quot;有效的字母异位词&quot;">​</a></h2><h3 id="题目-3" tabindex="-1">题目 <a class="header-anchor" href="#题目-3" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>给定两个字符串 s 和 t ，编写一个函数来判断 t 是否是 s 的字母异位词。</p><p>注意：若 s 和 t 中每个字符出现的次数都相同，则称 s 和 t 互为字母异位词。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入: s = &quot;anagram&quot;, t = &quot;nagaram&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">输出: true</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入: s = &quot;rat&quot;, t = &quot;car&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">输出: false</span></span></code></pre></div><h3 id="思想-3" tabindex="-1">思想 <a class="header-anchor" href="#思想-3" aria-label="Permalink to &quot;思想&quot;">​</a></h3><ul><li>只需要s和t中字符出现的次数相等即可</li><li>可以使用排序加对比，也可以使用 hash 记录字符对比</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var isAnagram = function (s, t) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const sMap = new Map()</span></span>
<span class="line"><span style="color:#A6ACCD;">    const tMap = new Map()</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (s.length !== t.length) return false</span></span>
<span class="line"><span style="color:#A6ACCD;">    let index = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    while (index &lt; s.length) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        const S = s[index]</span></span>
<span class="line"><span style="color:#A6ACCD;">        const T = t[index]</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (sMap.has(S)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            sMap.set(S, sMap.get(S) + 1)</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">            sMap.set(S, 1)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (tMap.has(T)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            tMap.set(T, tMap.get(T) + 1)</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">            tMap.set(T, 1)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        index++</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (const [key, value] of sMap.entries()) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (tMap.get(key) !== value) return false</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return true</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h2 id="快乐数" tabindex="-1">快乐数 <a class="header-anchor" href="#快乐数" aria-label="Permalink to &quot;快乐数&quot;">​</a></h2><h3 id="题目-4" tabindex="-1">题目 <a class="header-anchor" href="#题目-4" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>编写一个算法来判断一个数 n 是不是快乐数。 快乐数」 定义为：</p><ul><li>对于一个正整数，每一次将该数替换为它每个位置上的数字的平方和。</li><li>然后重复这个过程直到这个数变为 1，也可能是 无限循环 但始终变不到 1。</li><li>如果这个过程 结果为 1，那么这个数就是快乐数。 如果 n 是 快乐数 就返回 true ；不是，则返回 false 。</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：n = 19</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：true</span></span>
<span class="line"><span style="color:#A6ACCD;">解释：</span></span>
<span class="line"><span style="color:#A6ACCD;">12 + 92 = 82</span></span>
<span class="line"><span style="color:#A6ACCD;">82 + 22 = 68</span></span>
<span class="line"><span style="color:#A6ACCD;">62 + 82 = 100</span></span>
<span class="line"><span style="color:#A6ACCD;">12 + 02 + 02 = 1</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：n = 2</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：false</span></span></code></pre></div><h3 id="思想-4" tabindex="-1">思想 <a class="header-anchor" href="#思想-4" aria-label="Permalink to &quot;思想&quot;">​</a></h3><p><img src="`+p+'" alt="fig1"></p><p><img src="'+e+`" alt="fig2"></p><p>存在三种可能</p><ul><li>最终会得到1</li><li>最终会进入循环</li><li>值会越来越大，最后接近无穷大（不会发生）</li></ul><p>解决方案：</p><ol><li>哈希记录是否循环</li><li>快慢指针判断是否循环 <ul><li>如果是一个快乐数，那么没有循环，快跑者会比慢跑者先到达1</li><li>如果不是一个快乐数，那么快跑者和慢跑者将在同一个数字上相遇</li></ul></li></ol><ul><li><p>哈希</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var isHappy = function(n) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const set = new Set()</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 如果不是快乐数字且哈希没有记录</span></span>
<span class="line"><span style="color:#A6ACCD;">    while(n !== 1 &amp;&amp; !set.has(n)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        set.add(n)</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 下一次平方和</span></span>
<span class="line"><span style="color:#A6ACCD;">        n = getNext(n)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return n === 1</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const getNext = function(n) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let total = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    while(n&gt;0) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        const d = n % 10</span></span>
<span class="line"><span style="color:#A6ACCD;">        n = Math.floor(n / 10)</span></span>
<span class="line"><span style="color:#A6ACCD;">        total += d*d</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return total</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div></li><li><p>快慢指针</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var isHappy = function(n) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 慢指针在第一个</span></span>
<span class="line"><span style="color:#A6ACCD;">    let slowRunner = n</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 快指针在第二个</span></span>
<span class="line"><span style="color:#A6ACCD;">    let fastRunner = getNext(n)</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 只要快指针还不是1且快慢指针没有重叠</span></span>
<span class="line"><span style="color:#A6ACCD;">    while(fastRunner !== 1 &amp;&amp; slowRunner !== fastRunner) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 慢指针走一个</span></span>
<span class="line"><span style="color:#A6ACCD;">        slowRunner = getNext(slowRunner)</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 快指针走两个</span></span>
<span class="line"><span style="color:#A6ACCD;">        fastRunner = getNext(getNext(fastRunner))</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return fastRunner === 1</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const getNext = function(n) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let total = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    while(n&gt;0) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        const d = n % 10</span></span>
<span class="line"><span style="color:#A6ACCD;">        n = Math.floor(n / 10)</span></span>
<span class="line"><span style="color:#A6ACCD;">        total += d*d</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return total</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div></li></ul><h2 id="存在重复元素-ii" tabindex="-1">存在重复元素 II <a class="header-anchor" href="#存在重复元素-ii" aria-label="Permalink to &quot;存在重复元素 II&quot;">​</a></h2><h3 id="题目-5" tabindex="-1">题目 <a class="header-anchor" href="#题目-5" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>给你一个整数数组 nums 和一个整数 k ，判断数组中是否存在两个 不同的索引 i 和 j ，满足 nums[i] == nums[j] 且 abs(i - j) &lt;= k 。如果存在，返回 true ；否则，返回 false 。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：nums = [1,2,3,1], k = 3</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：true</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：nums = [1,0,1,1], k = 1</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：true</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：nums = [1,2,3,1,2,3], k = 2</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：false</span></span></code></pre></div><h3 id="思想-5" tabindex="-1">思想 <a class="header-anchor" href="#思想-5" aria-label="Permalink to &quot;思想&quot;">​</a></h3><ul><li><p>只要存在两个相同的值且索引的差值在k的范围内即可</p></li><li><p>可以使用 map 记录每个值的索引</p><ul><li>如果map记录过，则比较索引差值 <ul><li>如果索引差值在范围内，则符合</li><li>否则更新map记录的索引</li></ul></li><li>否则记录</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var containsNearbyDuplicate = function(nums, k) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const map = new Map()</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i=0; i&lt;nums.length; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        const cur = nums[i]</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (map.has(cur)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            if(i - map.get(cur) &lt;= k) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                return true</span></span>
<span class="line"><span style="color:#A6ACCD;">            } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">                map.set(cur, i)</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">            map.set(cur, i)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return false</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div></li></ul><h2 id="两数之和" tabindex="-1">两数之和 <a class="header-anchor" href="#两数之和" aria-label="Permalink to &quot;两数之和&quot;">​</a></h2><h3 id="题目-6" tabindex="-1">题目 <a class="header-anchor" href="#题目-6" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>给定一个整数数组 <code>nums</code> 和一个整数目标值 <code>target</code>，请你在该数组中找出 <strong>和为目标值</strong> <em><code>target</code></em> 的那 <strong>两个</strong> 整数，并返回它们的数组下标。</p><p>你可以假设每种输入只会对应一个答案。但是，数组中同一个元素在答案里不能重复出现。</p><p>你可以按任意顺序返回答案。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：nums = [2,7,11,15], target = 9</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：[0,1]</span></span>
<span class="line"><span style="color:#A6ACCD;">解释：因为 nums[0] + nums[1] == 9 ，返回 [0, 1] 。</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：nums = [3,2,4], target = 6</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：[1,2]</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：nums = [3,3], target = 6</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：[0,1]</span></span></code></pre></div><h3 id="思想-6" tabindex="-1">思想 <a class="header-anchor" href="#思想-6" aria-label="Permalink to &quot;思想&quot;">​</a></h3><ul><li>遍历数组，如果map中存在target-item 的值，则获取其下标返回</li><li>否则，存储item与对应的下标</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var twoSum = function(nums, target) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const map = new Map()</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i=0; i&lt;nums.length; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        const num = nums[i]</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (map.has(target - num)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            return [i, map.get(target-num)]</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">            map.set(num, i)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div><h2 id="字母异位词分组-中等" tabindex="-1">字母异位词分组（中等） <a class="header-anchor" href="#字母异位词分组-中等" aria-label="Permalink to &quot;字母异位词分组（中等）&quot;">​</a></h2><h3 id="题目-7" tabindex="-1">题目 <a class="header-anchor" href="#题目-7" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>给你一个字符串数组，请你将 字母异位词 组合在一起。可以按任意顺序返回结果列表。</p><p>字母异位词 是由重新排列源单词的所有字母得到的一个新单词。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入: strs = [&quot;eat&quot;, &quot;tea&quot;, &quot;tan&quot;, &quot;ate&quot;, &quot;nat&quot;, &quot;bat&quot;]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出: [[&quot;bat&quot;],[&quot;nat&quot;,&quot;tan&quot;],[&quot;ate&quot;,&quot;eat&quot;,&quot;tea&quot;]]</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入: strs = [&quot;&quot;]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出: [[&quot;&quot;]]</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入: strs = [&quot;a&quot;]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出: [[&quot;a&quot;]]</span></span></code></pre></div><h3 id="思想-7" tabindex="-1">思想 <a class="header-anchor" href="#思想-7" aria-label="Permalink to &quot;思想&quot;">​</a></h3><ol><li>排序</li><li>计数</li></ol><ul><li><p>排序</p><ul><li>第一种写法</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var groupAnagrams = function (strs) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const map = new Map()</span></span>
<span class="line"><span style="color:#A6ACCD;">    const result = []</span></span>
<span class="line"><span style="color:#A6ACCD;">    let index = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i = 0; i &lt; strs.length; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 对字符串排序</span></span>
<span class="line"><span style="color:#A6ACCD;">        const cur = strs[i].split(&#39;&#39;).sort().join(&#39;&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (map.has(cur)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 如果map已经存在这个key，则获取下标加入结果集</span></span>
<span class="line"><span style="color:#A6ACCD;">            const index = map.get(cur)</span></span>
<span class="line"><span style="color:#A6ACCD;">            result[index].push(strs[i])</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">            map.set(cur, index)</span></span>
<span class="line"><span style="color:#A6ACCD;">            result.push([strs[i]])</span></span>
<span class="line"><span style="color:#A6ACCD;">            index++</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return result</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><ul><li>第二种写法</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var groupAnagrams = function (strs) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const map = new Map()</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let str of strs) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 转成数组进行排序</span></span>
<span class="line"><span style="color:#A6ACCD;">        let array = Array.from(str)</span></span>
<span class="line"><span style="color:#A6ACCD;">        array.sort()</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 转成字符串</span></span>
<span class="line"><span style="color:#A6ACCD;">        let key = array.toString()</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 如果map存在key对应的值则使用否则新建数组</span></span>
<span class="line"><span style="color:#A6ACCD;">        let list = map.get(key) ? map.get(key) : new Array()</span></span>
<span class="line"><span style="color:#A6ACCD;">        list.push(str)</span></span>
<span class="line"><span style="color:#A6ACCD;">        map.set(key, list)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    // map 转成数组即可</span></span>
<span class="line"><span style="color:#A6ACCD;">    return Array.from(map.values())</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div></li><li><p>计数</p><ul><li>js 中使用 <code>charCodeAt()</code> 方法用于返回指定索引处字符的 Unicode 码点值</li><li>使用数组配合 <code>charCodeAt()</code> 记录下标位置，这样的话即使是不一样的排序，其数组都是相同的</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var groupAnagrams = function (strs) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const map = {}</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let str of strs) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        const count = new Array(26).fill(0)</span></span>
<span class="line"><span style="color:#A6ACCD;">        for (let c of str) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 减去 a的差值减少长度，记录下标出现个数</span></span>
<span class="line"><span style="color:#A6ACCD;">            count[c.charCodeAt() - &#39;a&#39;.charCodeAt()]++</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        map[count] ? map[count].push(str) : map[count] = [str]</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 对象转成数组</span></span>
<span class="line"><span style="color:#A6ACCD;">    return Object.values(map)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div></li></ul><h2 id="最长连续序列-中等" tabindex="-1">最长连续序列(中等) <a class="header-anchor" href="#最长连续序列-中等" aria-label="Permalink to &quot;最长连续序列(中等)&quot;">​</a></h2><h3 id="题目-8" tabindex="-1">题目 <a class="header-anchor" href="#题目-8" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>给定一个未排序的整数数组 nums ，找出数字连续的最长序列（不要求序列元素在原数组中连续）的长度。</p><p>请你设计并实现时间复杂度为 <strong>O(n)</strong> 的算法解决此问题。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：nums = [100,4,200,1,3,2]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：4</span></span>
<span class="line"><span style="color:#A6ACCD;">解释：最长数字连续序列是 [1, 2, 3, 4]。它的长度为 4。</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">输入：nums = [0,3,7,2,5,8,4,6,0,1]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：9</span></span></code></pre></div><h3 id="思想-8" tabindex="-1">思想 <a class="header-anchor" href="#思想-8" aria-label="Permalink to &quot;思想&quot;">​</a></h3><ul><li>枚举数组中每个数 x, 不断尝试 x+1,x+2... 是否存在，即以升序的方式查找是否连续，更新连续长度即可</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var longestConsecutive = function(nums) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 使用set存储nums，也可以使用数组的方式通过存储，后续通过下标判断是否存在即可</span></span>
<span class="line"><span style="color:#A6ACCD;">    const set = new Set()</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (const num of nums) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        set.add(num)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    let longestStreak = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (const num of nums) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 优化：即如果其前一个存在，则可以跳过，因为我们以升序的方式查找一定会找到</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (!set.has(num - 1)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            let currentStreak = 1</span></span>
<span class="line"><span style="color:#A6ACCD;">            let currentNum = num</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 以升序的方式查找，更新当前连续值</span></span>
<span class="line"><span style="color:#A6ACCD;">            while(set.has(currentNum+1)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                currentNum++</span></span>
<span class="line"><span style="color:#A6ACCD;">                currentStreak++</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">            longestStreak = Math.max(longestStreak, currentStreak)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return longestStreak</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div>`,76),c=[t];function i(r,C,A,u,y,D){return a(),n("div",null,c)}const m=s(o,[["render",i]]);export{d as __pageData,m as default};
