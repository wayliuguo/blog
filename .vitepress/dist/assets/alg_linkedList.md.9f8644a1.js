import{_ as s,o as a,c as n,U as l}from"./chunks/framework.9adb0f96.js";const e="/blog/assets/image-20230918110141189.be8f956c.png",p="/blog/assets/image-20230918143305143.f7010525.png",D=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"alg/linkedList.md","filePath":"alg/linkedList.md","lastUpdated":1695025447000}'),t={name:"alg/linkedList.md"},o=l('<h2 id="环形链表" tabindex="-1">环形链表 <a class="header-anchor" href="#环形链表" aria-label="Permalink to &quot;环形链表&quot;">​</a></h2><h3 id="题目" tabindex="-1">题目 <a class="header-anchor" href="#题目" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>给你一个链表的头节点 head ，判断链表中是否有环。</p><p>如果链表中有某个节点，可以通过连续跟踪 next 指针再次到达，则链表中存在环。 为了表示给定链表中的环，评测系统内部使用整数 pos 来表示链表尾连接到链表中的位置（索引从 0 开始）。注意：pos 不作为参数进行传递 。仅仅是为了标识链表的实际情况。</p><p>如果链表中存在环 ，则返回 true 。 否则，返回 false 。</p><p><img src="'+e+`" alt="image-20230918110141189"></p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：head = [3,2,0,-4], pos = 1</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：true</span></span>
<span class="line"><span style="color:#A6ACCD;">解释：链表中有一个环，其尾部连接到第二个节点。</span></span></code></pre></div><h3 id="思想" tabindex="-1">思想 <a class="header-anchor" href="#思想" aria-label="Permalink to &quot;思想&quot;">​</a></h3><ul><li><p>哈希</p><ul><li>遍历一遍记录是否出现过</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var hasCycle = function(head) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const set = new Set()</span></span>
<span class="line"><span style="color:#A6ACCD;">    while(head !== null) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (set.has(head)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            return true</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        set.add(head)</span></span>
<span class="line"><span style="color:#A6ACCD;">        head = head.next</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return false</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div></li><li><p>快慢指针</p><ul><li>利用快慢指针，慢指针走一步，快指针走两步</li><li>如果快指针为null或者其next为null则代表没有环，其走到了尽头</li><li>否则快慢指针一定会相遇</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var hasCycle = function(head) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (head === null || head.next === null) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        return false </span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    let slow = head</span></span>
<span class="line"><span style="color:#A6ACCD;">    let fast = head.next</span></span>
<span class="line"><span style="color:#A6ACCD;">    while (slow !== fast) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (fast === null || fast.next === null) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            return false</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        slow = slow.next</span></span>
<span class="line"><span style="color:#A6ACCD;">        fast = fast.next.next</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return true</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div></li></ul><h2 id="合并两个有序链表" tabindex="-1">合并两个有序链表 <a class="header-anchor" href="#合并两个有序链表" aria-label="Permalink to &quot;合并两个有序链表&quot;">​</a></h2><h3 id="题目-1" tabindex="-1">题目 <a class="header-anchor" href="#题目-1" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>将两个升序链表合并为一个新的 <strong>升序</strong> 链表并返回。新链表是通过拼接给定的两个链表的所有节点组成的。</p><p><img src="`+p+`" alt="image-20230918143305143"></p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：l1 = [1,2,4], l2 = [1,3,4]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：[1,1,2,3,4,4]</span></span></code></pre></div><h3 id="思想-1" tabindex="-1">思想 <a class="header-anchor" href="#思想-1" aria-label="Permalink to &quot;思想&quot;">​</a></h3><ul><li><p>迭代</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var mergeTwoLists = function(list1, list2) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 头节点</span></span>
<span class="line"><span style="color:#A6ACCD;">    let prehead = new ListNode(-1)</span></span>
<span class="line"><span style="color:#A6ACCD;">    let prev = prehead</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 从做到右两两比较</span></span>
<span class="line"><span style="color:#A6ACCD;">    while(list1 !== null &amp;&amp; list2!== null) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 取小的节点</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (list1.val &lt;= list2.val) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            prev.next = list1</span></span>
<span class="line"><span style="color:#A6ACCD;">            list1 = list1.next</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">            prev.next = list2</span></span>
<span class="line"><span style="color:#A6ACCD;">            list2 = list2.next</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        prev = prev.next</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 剩下其中一条没有遍历完的</span></span>
<span class="line"><span style="color:#A6ACCD;">    prev.next = list1 === null ? list2 : list1</span></span>
<span class="line"><span style="color:#A6ACCD;">    return prehead.next</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div></li></ul>`,16),i=[o];function c(r,C,A,d,h,u){return a(),n("div",null,i)}const g=s(t,[["render",c]]);export{D as __pageData,g as default};
