import{_ as s,o as a,c as n,U as l}from"./chunks/framework.9adb0f96.js";const y=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"alg/hash.md","filePath":"alg/hash.md","lastUpdated":1694266456000}'),p={name:"alg/hash.md"},e=l(`<h2 id="赎金信" tabindex="-1">赎金信 <a class="header-anchor" href="#赎金信" aria-label="Permalink to &quot;赎金信&quot;">​</a></h2><h3 id="题目" tabindex="-1">题目 <a class="header-anchor" href="#题目" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>给你两个字符串：ransomNote 和 magazine ，判断 ransomNote 能不能由 magazine 里面的字符构成。 如果可以，返回 true ；否则返回 false 。 magazine 中的每个字符只能在 ransomNote 中使用一次。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：ransomNote = &quot;a&quot;, magazine = &quot;b&quot;</span></span>
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
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div>`,24),t=[e];function o(c,i,r,C,A,u){return a(),n("div",null,t)}const d=s(p,[["render",o]]);export{y as __pageData,d as default};
