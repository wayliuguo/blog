import{_ as s,o as a,c as n,U as l}from"./chunks/framework.9adb0f96.js";const e="/blog/assets/image-20230918110141189.be8f956c.png",p="/blog/assets/image-20230918143305143.f7010525.png",o="/blog/assets/image-20230920215158714.e47faae7.png",t="/blog/assets/image-20230927172154215.8aa7a403.png",c="/blog/assets/image-20231011113832025.f5d03558.png",i="/blog/assets/image-20231011172335743.f04185b4.png",r="/blog/assets/image-20231011172849429.7372197e.png",C="/blog/assets/image-20231011173333131.ce7e3b21.png",f=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"alg/linkedList.md","filePath":"alg/linkedList.md","lastUpdated":1697017631000}'),A={name:"alg/linkedList.md"},d=l('<h2 id="环形链表" tabindex="-1">环形链表 <a class="header-anchor" href="#环形链表" aria-label="Permalink to &quot;环形链表&quot;">​</a></h2><h3 id="题目" tabindex="-1">题目 <a class="header-anchor" href="#题目" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>给你一个链表的头节点 head ，判断链表中是否有环。</p><p>如果链表中有某个节点，可以通过连续跟踪 next 指针再次到达，则链表中存在环。 为了表示给定链表中的环，评测系统内部使用整数 pos 来表示链表尾连接到链表中的位置（索引从 0 开始）。注意：pos 不作为参数进行传递 。仅仅是为了标识链表的实际情况。</p><p>如果链表中存在环 ，则返回 true 。 否则，返回 false 。</p><p><img src="'+e+`" alt="image-20230918110141189"></p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：head = [3,2,0,-4], pos = 1</span></span>
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
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div></li></ul><h2 id="两数相加-中等" tabindex="-1">两数相加（中等） <a class="header-anchor" href="#两数相加-中等" aria-label="Permalink to &quot;两数相加（中等）&quot;">​</a></h2><h3 id="题目-2" tabindex="-1">题目 <a class="header-anchor" href="#题目-2" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>给你两个 非空 的链表，表示两个非负的整数。它们每位数字都是按照 逆序 的方式存储的，并且每个节点只能存储 一位 数字。</p><p>请你将两个数相加，并以相同形式返回一个表示和的链表。</p><p>你可以假设除了数字 0 之外，这两个数都不会以 0 开头。</p><p><img src="`+o+`" alt="image-20230920215158714"></p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：l1 = [2,4,3], l2 = [5,6,4]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：[7,0,8]</span></span>
<span class="line"><span style="color:#A6ACCD;">解释：342 + 465 = 807.</span></span></code></pre></div><h3 id="思想-2" tabindex="-1">思想 <a class="header-anchor" href="#思想-2" aria-label="Permalink to &quot;思想&quot;">​</a></h3><ul><li>创建一个头节点</li><li>两两节点相加，保存进位数给到下一次使用</li><li>可能最后一次的进一是链表末尾相加得到的，所以这里需要特殊处理</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var addTwoNumbers = function(l1, l2) {</span></span>
<span class="line"><span style="color:#A6ACCD;">	// 头节点</span></span>
<span class="line"><span style="color:#A6ACCD;">    let prehead = new ListNode(-1)</span></span>
<span class="line"><span style="color:#A6ACCD;">    let prev = prehead</span></span>
<span class="line"><span style="color:#A6ACCD;">    let carry = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    while(l1 || l2) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    	// 收集两两节点和进位数的值</span></span>
<span class="line"><span style="color:#A6ACCD;">        const num1 = l1 ? l1.val : 0</span></span>
<span class="line"><span style="color:#A6ACCD;">        const num2 = l2 ? l2.val : 0</span></span>
<span class="line"><span style="color:#A6ACCD;">        const sum = num1 + num2 + carry</span></span>
<span class="line"><span style="color:#A6ACCD;">        // prev 后移</span></span>
<span class="line"><span style="color:#A6ACCD;">        prev.next = new ListNode(sum % 10)</span></span>
<span class="line"><span style="color:#A6ACCD;">        prev = prev.next</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 进位数</span></span>
<span class="line"><span style="color:#A6ACCD;">        carry = Math.floor(sum / 10)</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (l1) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            l1 = l1.next</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (l2) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            l2 = l2.next</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (carry&gt;0) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        prev.next = new ListNode(carry)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return prehead.next</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div><h2 id="复制带随机指针的链表-中等" tabindex="-1">复制带随机指针的链表(中等) <a class="header-anchor" href="#复制带随机指针的链表-中等" aria-label="Permalink to &quot;复制带随机指针的链表(中等)&quot;">​</a></h2><h3 id="题目-3" tabindex="-1">题目 <a class="header-anchor" href="#题目-3" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>给你一个长度为 n 的链表，每个节点包含一个额外增加的随机指针 random ，该指针可以指向链表中的任何节点或空节点。</p><p>构造这个链表的 深拷贝。 深拷贝应该正好由 n 个 全新 节点组成，其中每个新节点的值都设为其对应的原节点的值。新节点的 next 指针和 random 指针也都应指向复制链表中的新节点，并使原链表和复制链表中的这些指针能够表示相同的链表状态。复制链表中的指针都不应指向原链表中的节点 。</p><p>例如，如果原链表中有 X 和 Y 两个节点，其中 X.random --&gt; Y 。那么在复制链表中对应的两个节点 x 和 y ，同样有 x.random --&gt; y 。</p><p>返回复制链表的头节点。</p><p>用一个由 n 个节点组成的链表来表示输入/输出中的链表。每个节点用一个 [val, random_index] 表示：</p><ul><li>val：一个表示 Node.val 的整数。</li><li>random_index：随机指针指向的节点索引（范围从 0 到 n-1）；如果不指向任何节点，则为 null 。 你的代码 只 接受原链表的头节点 head 作为传入参数。</li></ul><p><img src="`+t+`" alt="image-20230927172154215"></p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：head = [[7,null],[13,0],[11,4],[10,2],[1,0]]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：[[7,null],[13,0],[11,4],[10,2],[1,0]]</span></span></code></pre></div><h3 id="思想-3" tabindex="-1">思想 <a class="header-anchor" href="#思想-3" aria-label="Permalink to &quot;思想&quot;">​</a></h3><ul><li><p>回溯+哈希表</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var copyRandomList = function (head, cachedNode = new Map()) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  if (head === null) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return null;</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">  if (!cachedNode.has(head)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    cachedNode.set(head, { val: head.val });</span></span>
<span class="line"><span style="color:#A6ACCD;">    Object.assign(cachedNode.get(head), {</span></span>
<span class="line"><span style="color:#A6ACCD;">      next: copyRandomList(head.next, cachedNode),</span></span>
<span class="line"><span style="color:#A6ACCD;">      random: copyRandomList(head.random, cachedNode),</span></span>
<span class="line"><span style="color:#A6ACCD;">    });</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">  return cachedNode.get(head);</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div></li></ul><h2 id="反转链表" tabindex="-1">反转链表 <a class="header-anchor" href="#反转链表" aria-label="Permalink to &quot;反转链表&quot;">​</a></h2><h3 id="题目-4" tabindex="-1">题目 <a class="header-anchor" href="#题目-4" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>给你单链表的头节点 <code>head</code> ，请你反转链表，并返回反转后的链表。</p><p><img src="`+c+`" alt="image-20231011113832025"></p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：head = [1,2,3,4,5]</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：[5,4,3,2,1]</span></span></code></pre></div><h3 id="思想-4" tabindex="-1">思想 <a class="header-anchor" href="#思想-4" aria-label="Permalink to &quot;思想&quot;">​</a></h3><ul><li><p>迭代</p><p>假设链表为 1→2→3→∅，我们想要把它改成 ∅←1←2←3。</p><ul><li>在遍历链表时，将当前节点的 <strong>next</strong> 指针改为指向前一个节点。</li><li>由于节点没有引用其前一个节点，因此必须事先存储其前一个节点。</li><li>在更改引用之前，还需要存储后一个节点。最后返回新的头引用。</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var reverseList = function(head) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 前一个节点</span></span>
<span class="line"><span style="color:#A6ACCD;">    let prev = null</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 当前节点</span></span>
<span class="line"><span style="color:#A6ACCD;">    let curr = head</span></span>
<span class="line"><span style="color:#A6ACCD;">    while(curr) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 获取下一个节点next</span></span>
<span class="line"><span style="color:#A6ACCD;">        const next = curr.next</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 将当前节点指向前一个节点（反转）</span></span>
<span class="line"><span style="color:#A6ACCD;">        curr.next = prev</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 存储当前节点与下一节点，继续反转</span></span>
<span class="line"><span style="color:#A6ACCD;">        prev = curr</span></span>
<span class="line"><span style="color:#A6ACCD;">        curr = next</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return prev</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div><ul><li><p>递归</p><ul><li>假设链表为： n1→…→nk−1→nk→nk+1→…→nm→∅</li><li>若从节点 nk+1 到 nm 已经被反转，而我们正处于 nk，<em>n</em>1→…→nk<em>−1→</em>nk<em>→</em>nk+1←…←nm</li><li>我们希望nk+1的下一个节点指向nk，所以nk.next.next = nk</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var reverseList = function(head) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 终止条件：当链表为空或只有一个节点时，直接返回该节点</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (head === null || head.next == null) return head</span></span>
<span class="line"><span style="color:#A6ACCD;">    </span></span>
<span class="line"><span style="color:#A6ACCD;">    // 递归反转剩余部分</span></span>
<span class="line"><span style="color:#A6ACCD;">    const newHead = reverseList(head.next)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    // 将当前节点的下一个节点的 next 指针指向当前节点，实现反转</span></span>
<span class="line"><span style="color:#A6ACCD;">    head.next.next = head</span></span>
<span class="line"><span style="color:#A6ACCD;">    head.next = null</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    // 返回反转后的链表头节点</span></span>
<span class="line"><span style="color:#A6ACCD;">    return newHead</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span></code></pre></div></li></ul><h2 id="反转链表ii-中等" tabindex="-1">反转链表II(中等) <a class="header-anchor" href="#反转链表ii-中等" aria-label="Permalink to &quot;反转链表II(中等)&quot;">​</a></h2><h3 id="题目-5" tabindex="-1">题目 <a class="header-anchor" href="#题目-5" aria-label="Permalink to &quot;题目&quot;">​</a></h3><p>给你单链表的头指针 <code>head</code> 和两个整数 <code>left</code> 和 <code>right</code> ，其中 <code>left &lt;= right</code> 。请你反转从位置 <code>left</code> 到位置 <code>right</code> 的链表节点，返回 <strong>反转后的链表</strong> 。</p><p><img src="`+i+`" alt="image-20231011172335743"></p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">输入：head = [1,2,3,4,5], left = 2, right = 4</span></span>
<span class="line"><span style="color:#A6ACCD;">输出：[1,4,3,2,5]</span></span></code></pre></div><h3 id="思想-5" tabindex="-1">思想 <a class="header-anchor" href="#思想-5" aria-label="Permalink to &quot;思想&quot;">​</a></h3><ul><li><p>穿针引线</p><p><img src="`+r+'" alt="image-20231011172849429"></p><p>使用上面《反转链表》的解法，反转left到right部分以后，再拼接起来，我们还需要记录一个left的前一个prev和right的后一个节点succ</p><p><img src="'+C+`" alt="image-20231011173333131"></p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">var reverseBetween = function(head, left, right) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 因为头节点有可能发生变化，使用虚拟头节点可以避免复杂的分类讨论</span></span>
<span class="line"><span style="color:#A6ACCD;">    const dummyNode = new ListNode(null)</span></span>
<span class="line"><span style="color:#A6ACCD;">    dummyNode.next = head</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    let prev = dummyNode</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 第1步：从虚拟头节点走left-1步，来到left节点的前一个节点</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i=0; i&lt;left-1; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        prev = prev.next</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    // 第2步：从prev再走right-left+1步，来到right节点</span></span>
<span class="line"><span style="color:#A6ACCD;">    let rightNode = prev</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i=0; i&lt;right-left+1; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        rightNode = rightNode.next</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    // 第3步：切断出一个子链表（截取链表）</span></span>
<span class="line"><span style="color:#A6ACCD;">    let leftNode = prev.next</span></span>
<span class="line"><span style="color:#A6ACCD;">    // rightNode 的后继节点</span></span>
<span class="line"><span style="color:#A6ACCD;">    let curr = rightNode.next</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 切断链接</span></span>
<span class="line"><span style="color:#A6ACCD;">    prev.next = null</span></span>
<span class="line"><span style="color:#A6ACCD;">    rightNode.next =null</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    // 第4步：同206反转链表</span></span>
<span class="line"><span style="color:#A6ACCD;">    reverseLinkedList(leftNode)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    // 第5步：接回到原来的链表中</span></span>
<span class="line"><span style="color:#A6ACCD;">    prev.next = rightNode</span></span>
<span class="line"><span style="color:#A6ACCD;">    leftNode.next = curr</span></span>
<span class="line"><span style="color:#A6ACCD;">    return dummyNode.next</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">var reverseLinkedList = (head) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let prev = null</span></span>
<span class="line"><span style="color:#A6ACCD;">    let cur = head</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    while(cur) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        const next = cur.next</span></span>
<span class="line"><span style="color:#A6ACCD;">        cur.next = prev</span></span>
<span class="line"><span style="color:#A6ACCD;">        prev = cur</span></span>
<span class="line"><span style="color:#A6ACCD;">        cur = next</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div></li></ul>`,54),h=[d];function y(u,D,g,m,v,x){return a(),n("div",null,h)}const k=s(A,[["render",y]]);export{f as __pageData,k as default};
