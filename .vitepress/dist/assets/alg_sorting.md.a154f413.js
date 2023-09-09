import{_ as s,o as n,c as a,U as l}from"./chunks/framework.9adb0f96.js";const d=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"alg/sorting.md","filePath":"alg/sorting.md","lastUpdated":1690896694000}'),p={name:"alg/sorting.md"},e=l(`<h2 id="冒泡排序" tabindex="-1">冒泡排序 <a class="header-anchor" href="#冒泡排序" aria-label="Permalink to &quot;冒泡排序&quot;">​</a></h2><ul><li>从列表的第一个元素开始，依次比较相邻的两个元素，交换后冒泡到后面</li><li>由于是每次取最大，所以后面取得的最大需要在之前的最大前面</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function bubbleSort(arr) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i=0; i&lt;arr.length; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 提前退出冒泡循环的标识位</span></span>
<span class="line"><span style="color:#A6ACCD;">        let flag = false</span></span>
<span class="line"><span style="color:#A6ACCD;">        for(let j=0; j&lt;arr.length-i-1; j++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (arr[j] &gt; arr[j+1]) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                [arr[j], arr[j+1]] = [arr[j+1], arr[j]]</span></span>
<span class="line"><span style="color:#A6ACCD;">                flag = true</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (!flag) break</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">let arr = [1, 3, 2, 5, 4]</span></span>
<span class="line"><span style="color:#A6ACCD;">bubbleSort(arr)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(arr) // [1, 2, 3, 4, 5]</span></span></code></pre></div><h2 id="选择排序" tabindex="-1">选择排序 <a class="header-anchor" href="#选择排序" aria-label="Permalink to &quot;选择排序&quot;">​</a></h2><p>升序：每次从列表中取出一个元素，记录其下标<code>index</code>，把该元素后的值与其两两比较，每一次比较更新最大元素所在下标<code>index</code>，最后把index与遍历取出元素比较更新。</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function selectionSort (arr) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i=0; i&lt;arr.length; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        let index = i</span></span>
<span class="line"><span style="color:#A6ACCD;">        for (let j=i+1; j&lt;arr.length;j++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (arr[index] &gt; arr[j]) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                index = j</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (index !== i) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            [arr[index],arr[i]] = [arr[i], arr[index]]</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return arr</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(selectionSort([1, 3, 2, 5, 4]))</span></span></code></pre></div><h2 id="归并排序" tabindex="-1">归并排序 <a class="header-anchor" href="#归并排序" aria-label="Permalink to &quot;归并排序&quot;">​</a></h2><ul><li>使用分治策略，将对象分裂成一个个小数组，只要数组长度不等于0，就继续分裂</li><li>利用递归将分裂的数组合并，利用双指针，每次保证左边的小于右边的，不断递归合并即可</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function mergeSort (arr) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (arr.length === 1) return arr</span></span>
<span class="line"><span style="color:#A6ACCD;">    let middle = Math.floor(arr.length / 2)</span></span>
<span class="line"><span style="color:#A6ACCD;">    let left = []</span></span>
<span class="line"><span style="color:#A6ACCD;">    let right = []</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i=0; i&lt;arr.length; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (i&lt;middle) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            left.push(arr[i])</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">            right.push(arr[i])</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return merge(mergeSort(left), mergeSort(right))</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">function merge (left, right) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let result = []</span></span>
<span class="line"><span style="color:#A6ACCD;">    let l = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    let r = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    while(l&lt;left.length &amp;&amp; r&lt;right.length) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (left[l] &lt; right[r]) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            result.push(left[l])</span></span>
<span class="line"><span style="color:#A6ACCD;">            l++</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">            result.push(right[r])</span></span>
<span class="line"><span style="color:#A6ACCD;">            r++</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    while(l&lt;left.length) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        result.push(left[l])</span></span>
<span class="line"><span style="color:#A6ACCD;">        l++</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    while(r&lt;right.length) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        result.push(right[r])</span></span>
<span class="line"><span style="color:#A6ACCD;">        r++</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return result</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(mergeSort([1, 3, 2, 5, 4]))</span></span></code></pre></div><h2 id="快速排序" tabindex="-1">快速排序 <a class="header-anchor" href="#快速排序" aria-label="Permalink to &quot;快速排序&quot;">​</a></h2><ul><li>对冒泡排序的一种改进，利用递归不断分割排序数组并单独排序达到目的</li><li>在要排序的数组中找一个基准值</li><li>把小于基准值的数据集中到数组的左边（升序排列），把大于基准值的数据集中到数组的右边</li><li>数组的左边和右边重复上边的步骤，直到数组有序</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function quickSort(arr) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 如果长度小于等于1直接返回数组</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (arr.length &lt;= 1) return arr</span></span>
<span class="line"><span style="color:#A6ACCD;">    const left = []</span></span>
<span class="line"><span style="color:#A6ACCD;">    const right = []</span></span>
<span class="line"><span style="color:#A6ACCD;">    const middleIndex = Math.floor(arr.length / 2)</span></span>
<span class="line"><span style="color:#A6ACCD;">    const middleValue = arr[middleIndex]</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let i = 0; i &lt; arr.length; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 跳过中间下标</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (i === middleIndex) continue</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (arr[i] &lt; middleValue) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            left.push(arr[i])</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">            right.push(arr[i])</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return quickSort(left).concat(middleValue, quickSort(right))</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">let arr = [1, 3, 2, 5, 4]</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(quickSort(arr)) // [1, 2, 3, 4, 5]</span></span></code></pre></div><h2 id="二分查找" tabindex="-1">二分查找 <a class="header-anchor" href="#二分查找" aria-label="Permalink to &quot;二分查找&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function binarySearch(arr, target) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let left = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    let right = arr.length - 1</span></span>
<span class="line"><span style="color:#A6ACCD;">    while (left &lt;= right) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        let middle = Math.floor((left + right) / 2)</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (arr[middle] === target) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            return middle</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else if (arr[middle] &lt; target) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            left = middle++</span></span>
<span class="line"><span style="color:#A6ACCD;">        } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">            right = middle--</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return -1</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const array = [2, 4, 6, 8, 10]</span></span>
<span class="line"><span style="color:#A6ACCD;">const targetElement = 2</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(binarySearch(array, targetElement))</span></span></code></pre></div>`,14),o=[e];function t(r,c,i,C,A,y){return n(),a("div",null,o)}const h=s(p,[["render",t]]);export{d as __pageData,h as default};
