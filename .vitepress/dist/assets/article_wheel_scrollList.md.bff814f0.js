import{_ as s,o as n,c as a,U as l}from"./chunks/framework.9adb0f96.js";const p="/blog/assets/virtualList.3734ad49.png",u=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"article/wheel/scrollList.md","filePath":"article/wheel/scrollList.md","lastUpdated":1693127769000}'),e={name:"article/wheel/scrollList.md"},t=l(`<h2 id="实现原理" tabindex="-1">实现原理 <a class="header-anchor" href="#实现原理" aria-label="Permalink to &quot;实现原理&quot;">​</a></h2><ul><li><p>两种实现思路</p><ol><li><p>使用定位+translate3d实现</p><ul><li>remain: 展示个数</li><li>items: 数据</li><li>size: 元素高度</li><li>vl：显示框，其高度等于 remain*size,这里设置为relative</li><li>scroll-bar: 总高度，其高度等于 items.length*remain</li><li>scroll-list: 渲染区，其设置translate3d 用于标识滚动位置</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;div class=&quot;vl&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">	&lt;div class=&quot;scroll-bar&quot;&gt;&lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">	&lt;div class=&quot;scroll-list&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">		&lt;div&gt;&lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">	&lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/div&gt;</span></span></code></pre></div></li><li><p>使用上下padding</p><ul><li>dataSource: 总数据</li><li>keeps： 展示个数</li><li>estimateSize: 元素高度</li><li>dataKey: 元素标识</li><li>buffer: 缓存区，这里设置为keeps/3</li><li>这里的padding用于撑起整个数据的高度，例如dataSource:100,keeps: 30, estimateSize: 80,则默认展示30个数据，剩下的70个数据的高度需要用70*estimateSize 的结果赋值为下padding撑开</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;div class=&quot;virtual-list&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;"> &lt;div style=&quot;padding:×××&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;"> 	&lt;div&gt;&lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;"> &lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;div&gt;</span></span></code></pre></div></li></ol></li></ul><p><img src="`+p+`" alt="virtualList"></p><h2 id="translate-实现" tabindex="-1">translate 实现 <a class="header-anchor" href="#translate-实现" aria-label="Permalink to &quot;translate 实现&quot;">​</a></h2><ul><li><p>render函数</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;div class={bem.b()} ref={wrapperRef} onScroll={handleScroll}&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">	{/* 模拟总长度，感觉有很多数据 */}</span></span>
<span class="line"><span style="color:#A6ACCD;">	&lt;div class={bem.e(&#39;scroll-bar&#39;)} ref={barRef}&gt;&lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">	&lt;div</span></span>
<span class="line"><span style="color:#A6ACCD;">		class={bem.e(&#39;scroll-list&#39;)}</span></span>
<span class="line"><span style="color:#A6ACCD;">		style={{ transform: \`translate3d(0, \${offset.value}px, 0)\` }}</span></span>
<span class="line"><span style="color:#A6ACCD;">	&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">		{visibleData.value.map((node, idx) =&gt; slots.default!({ node }))}</span></span>
<span class="line"><span style="color:#A6ACCD;">	&lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/div&gt;</span></span></code></pre></div></li><li><p>核心逻辑</p><ul><li>prev：前置缓冲区数量，取最小值确保不超过需要的数量</li><li>next：后置缓冲区数量，取最小值确保不超过剩余数据量</li><li>visibleData <ul><li>state.start - prev.value: 开始-前置缓冲</li><li>state.end+next.value: 开始+后置缓冲</li><li>这样就可以展示的时候多加上缓冲区，在快速滚动的时候不会导致白屏</li></ul></li><li>handleScroll <ul><li>scrollTop: 获取滚动条偏移量</li><li>state.start: 根据滚动条偏移量/子项高度即得到开始下标</li><li>state.end: 开始下标+展示个数得到结束下标</li><li>offset：（ 开始下标-前置数量）* 子项高度等到需要translate3d的值</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const wrapperRef = ref&lt;HTMLElement&gt;()</span></span>
<span class="line"><span style="color:#A6ACCD;">const barRef = ref&lt;HTMLElement&gt;()</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 计算显示的区域</span></span>
<span class="line"><span style="color:#A6ACCD;">const state = reactive({</span></span>
<span class="line"><span style="color:#A6ACCD;">    start: 0,</span></span>
<span class="line"><span style="color:#A6ACCD;">    end: props.remain</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;">// 偏移量：滚动过去了多少个</span></span>
<span class="line"><span style="color:#A6ACCD;">const offset = ref(0)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const prev = computed(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">	return Math.min(state.start, props.remain)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;">const next = computed(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">	return Math.min(props.remain, props.items.length - state.end)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 这里应该多展示上八条和下八条(两屏)，保证快速滚动不会白屏</span></span>
<span class="line"><span style="color:#A6ACCD;">const visibleData = computed(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">	return props.items.slice(state.start - prev.value, state.end + next.value)</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 监听滚动</span></span>
<span class="line"><span style="color:#A6ACCD;">const handleScroll = throttle(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 根据当前滚动的距离来算过去了几个数据</span></span>
<span class="line"><span style="color:#A6ACCD;">    const scrollTop = wrapperRef.value!.scrollTop</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 滚动后的开始位置</span></span>
<span class="line"><span style="color:#A6ACCD;">    state.start = Math.floor(scrollTop / props.size)</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 滚动后的结束位置</span></span>
<span class="line"><span style="color:#A6ACCD;">    state.end = state.start + props.remain</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 滚动过去了多少个（- props.size * prev.value）：减去前面补的</span></span>
<span class="line"><span style="color:#A6ACCD;">    offset.value = state.start * props.size - props.size * prev.value</span></span>
<span class="line"><span style="color:#A6ACCD;">}, 17)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const initWrapper = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    wrapperRef.value!.style.height = \`\${props.remain * props.size}px\`</span></span>
<span class="line"><span style="color:#A6ACCD;">    barRef.value!.style.height = \`\${props.items.length * props.size}px\`</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">watch(</span></span>
<span class="line"><span style="color:#A6ACCD;">    () =&gt; props.items,</span></span>
<span class="line"><span style="color:#A6ACCD;">    () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    	initWrapper()</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">onMounted(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">	initWrapper()</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span></code></pre></div></li></ul><h2 id="padding-实现固定高度" tabindex="-1">padding 实现固定高度 <a class="header-anchor" href="#padding-实现固定高度" aria-label="Permalink to &quot;padding 实现固定高度&quot;">​</a></h2><ul><li><p>render 函数</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">return () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 从范围变量中获取上下padding并设置</span></span>
<span class="line"><span style="color:#A6ACCD;">    const { padBehind, padFront } = range.value!</span></span>
<span class="line"><span style="color:#A6ACCD;">    const paddingStyle = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    	padding: \`\${padFront}px 0 \${padBehind}px\`</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return (</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;div onScroll={onScroll} ref={root}&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        	&lt;div style={paddingStyle}&gt;{genRenderComponent()}&lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    )</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div></li><li><p>核心逻辑</p><ul><li>installVirtual 中传入初始数据和更新函数，返回一个对象一个对象virtual，包括了处理滚动等方法</li><li>滚动事件使用virtual.handleScroll 处理</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 定义范围变量</span></span>
<span class="line"><span style="color:#A6ACCD;">const range = ref&lt;RangeOptions | null&gt;(null)</span></span>
<span class="line"><span style="color:#A6ACCD;">// 方法对象</span></span>
<span class="line"><span style="color:#A6ACCD;">let virtual: ReturnType&lt;typeof initVirtual&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">// 列表 ref</span></span>
<span class="line"><span style="color:#A6ACCD;">const root = ref&lt;HTMLElement | null&gt;(null)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 获取数据源id数组</span></span>
<span class="line"><span style="color:#A6ACCD;">const getUniqueIdFromDataSources = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const { dataSources, dataKey } = props</span></span>
<span class="line"><span style="color:#A6ACCD;">    return dataSources.map(dataSource =&gt; dataSource[dataKey])</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 更新范围</span></span>
<span class="line"><span style="color:#A6ACCD;">const update: updateType = newRange =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">	range.value = newRange</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 初始化范围</span></span>
<span class="line"><span style="color:#A6ACCD;">const installVirtual = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 初始化范围</span></span>
<span class="line"><span style="color:#A6ACCD;">    virtual = initVirtual(</span></span>
<span class="line"><span style="color:#A6ACCD;">    {</span></span>
<span class="line"><span style="color:#A6ACCD;">        keeps: props.keeps,</span></span>
<span class="line"><span style="color:#A6ACCD;">        buffer: Math.round(props.keeps / 3),</span></span>
<span class="line"><span style="color:#A6ACCD;">        uniqueIds: getUniqueIdFromDataSources(),</span></span>
<span class="line"><span style="color:#A6ACCD;">        estimateSize: props.estimateSize</span></span>
<span class="line"><span style="color:#A6ACCD;">    },</span></span>
<span class="line"><span style="color:#A6ACCD;">    	update</span></span>
<span class="line"><span style="color:#A6ACCD;">    )</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">// 根据范围更新渲染的组件</span></span>
<span class="line"><span style="color:#A6ACCD;">function genRenderComponent() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const slots = []</span></span>
<span class="line"><span style="color:#A6ACCD;">    const { start, end } = range.value!</span></span>
<span class="line"><span style="color:#A6ACCD;">    const { dataSources, dataComponent, dataKey } = props</span></span>
<span class="line"><span style="color:#A6ACCD;">    for (let index = start; index &lt;= end; index++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        const dataSource = dataSources[index]</span></span>
<span class="line"><span style="color:#A6ACCD;">        const uniqueKey = dataSource[dataKey]</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (dataComponent) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            slots.push(</span></span>
<span class="line"><span style="color:#A6ACCD;">            &lt;dataComponent key={uniqueKey} source={dataSource}&gt;&lt;/dataComponent&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            )</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return slots</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">// 滚动事件</span></span>
<span class="line"><span style="color:#A6ACCD;">const onScroll = throttle(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (root.value) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 获取滚动卷去的高度</span></span>
<span class="line"><span style="color:#A6ACCD;">        const offset = root.value.scrollTop</span></span>
<span class="line"><span style="color:#A6ACCD;">        virtual.handleScroll(offset)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}, 16.7)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 挂载前计算范围</span></span>
<span class="line"><span style="color:#A6ACCD;">onBeforeMount(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">	installVirtual()</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span></code></pre></div></li><li><p>核心逻辑-virtual</p><ul><li>handleScroll <ul><li>handleFront: 向上滑动</li><li>handleBehind：向下滑动</li></ul></li><li>getScrollOvers：通过滚动条偏移量/元素高度=滚动过的个数</li><li>getEndByStart: 根据开始下标计算结束下标</li><li>handleFront <ul><li>如果滚动的个数&gt;开始下标，则表示没有超出不用处理</li><li>如果超出了开始下标，则减去缓冲区数量得到新的开始下标</li><li>通过checkRange 检查范围</li></ul></li><li>handleBehind <ul><li>如果划过的还在缓冲区里则不用处理</li><li>一旦草住缓冲区，把偏移量作为开始下标重新计算</li></ul></li><li>checkRange <ul><li>如果数据长度达不到结束下标，则调整结束下标为数据长度</li><li>如果结尾的下标与开始下标达不到渲染个数，重新赋值开始下标</li><li>调用updateRange 更新范围</li></ul></li><li>updateRange <ul><li>调用 getPadFront（预估高度*开始下标）得到上padding</li><li>调用getPadBehind(剩余数据长度*预估高度)得到下padding</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">import { RangeOptions, VirtualOptions, updateType } from &#39;./props&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">export function initVirtual(param: VirtualOptions, update: updateType) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 初始化范围参数</span></span>
<span class="line"><span style="color:#A6ACCD;">  const range: RangeOptions = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    start: 0,</span></span>
<span class="line"><span style="color:#A6ACCD;">    end: 0,</span></span>
<span class="line"><span style="color:#A6ACCD;">    padFront: 0,</span></span>
<span class="line"><span style="color:#A6ACCD;">    padBehind: 0</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">  let offsetValue: number = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 获取上paddining</span></span>
<span class="line"><span style="color:#A6ACCD;">  function getPadFront() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // padding-top = 预估高度 * 显示开始下标</span></span>
<span class="line"><span style="color:#A6ACCD;">    return param.estimateSize * range.start</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 获取下padding</span></span>
<span class="line"><span style="color:#A6ACCD;">  function getPadBehind() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 全部数据末尾下标</span></span>
<span class="line"><span style="color:#A6ACCD;">    const lastIndex = param.uniqueIds.length - 1</span></span>
<span class="line"><span style="color:#A6ACCD;">    // padding-bottom = (全部数据末尾下标-显示结束下标) * 预估高度</span></span>
<span class="line"><span style="color:#A6ACCD;">    return (lastIndex - range.end) * param.estimateSize</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">  function checkRange(start: number, end: number) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 所有的数据长度</span></span>
<span class="line"><span style="color:#A6ACCD;">    const total = param.uniqueIds.length</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 页面渲染的个数</span></span>
<span class="line"><span style="color:#A6ACCD;">    const keeps = param.keeps</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 如果所有的数据长度还达不到渲染的个数，则结束下标是数据长度结束下标</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (total &lt; keeps) {</span></span>
<span class="line"><span style="color:#A6ACCD;">      start = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">      end = total - 1</span></span>
<span class="line"><span style="color:#A6ACCD;">    } else if (end - start &lt; keeps - 1) {</span></span>
<span class="line"><span style="color:#A6ACCD;">      // 如果结尾下标与开始下标的差值达不到渲染个数，重新赋值开始下标</span></span>
<span class="line"><span style="color:#A6ACCD;">      start = end - keeps + 1</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    updateRange(start, end)</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 根据开始与结束下标更新范围</span></span>
<span class="line"><span style="color:#A6ACCD;">  function updateRange(start: number, end: number) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    range.start = start</span></span>
<span class="line"><span style="color:#A6ACCD;">    range.end = end</span></span>
<span class="line"><span style="color:#A6ACCD;">    range.padFront = getPadFront()</span></span>
<span class="line"><span style="color:#A6ACCD;">    range.padBehind = getPadBehind()</span></span>
<span class="line"><span style="color:#A6ACCD;">    update({ ...range })</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 获取滑动的个数</span></span>
<span class="line"><span style="color:#A6ACCD;">  function getScrollOvers() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 通过 滚动条滚动长度/预估高度 向下取整得到滑动的元素个数</span></span>
<span class="line"><span style="color:#A6ACCD;">    return Math.floor(offsetValue / param.estimateSize)</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 向上滚动处理函数</span></span>
<span class="line"><span style="color:#A6ACCD;">  function handleFront() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 获取划过个数</span></span>
<span class="line"><span style="color:#A6ACCD;">    const overs = getScrollOvers()</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 如果上滑时滑动的没有超过开始下标，无需更新，比如start： 0， 上一次overs是5这次滑动到4</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (overs &gt; range.start) {</span></span>
<span class="line"><span style="color:#A6ACCD;">      return</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 如果超出了开始下标，则减去缓冲区数量得到开始下标，不能小于0</span></span>
<span class="line"><span style="color:#A6ACCD;">    const start = Math.max(overs - param.buffer, 0)</span></span>
<span class="line"><span style="color:#A6ACCD;">    checkRange(start, getEndByStart(start))</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 向下滚动处理函数</span></span>
<span class="line"><span style="color:#A6ACCD;">  function handleBehind() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 获取划过个数</span></span>
<span class="line"><span style="color:#A6ACCD;">    const overs = getScrollOvers()</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (overs &lt; range.start + param.buffer) {</span></span>
<span class="line"><span style="color:#A6ACCD;">      // 如果划过的还在缓冲区里则不用处理</span></span>
<span class="line"><span style="color:#A6ACCD;">      return</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 一旦超出了缓存区，则把滚动的个数作为开始下标计算即可</span></span>
<span class="line"><span style="color:#A6ACCD;">    checkRange(overs, getEndByStart(overs))</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 根据开始下标计算结束下标</span></span>
<span class="line"><span style="color:#A6ACCD;">  function getEndByStart(start: number) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 计算后的结束下标 = 开始下标 + 渲染个数</span></span>
<span class="line"><span style="color:#A6ACCD;">    const computedEnd = start + param.keeps - 1</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 由总数可能小于计算出来的结束下标，所以需要取二者较小值</span></span>
<span class="line"><span style="color:#A6ACCD;">    const end = Math.min(computedEnd, param.uniqueIds.length - 1)</span></span>
<span class="line"><span style="color:#A6ACCD;">    return end</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 滚动处理函数</span></span>
<span class="line"><span style="color:#A6ACCD;">  function handleScroll(offset: number) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 和上一次滚动的高度对比确定方向，FRONT: 向上滚动 BEHIND: 向下滚动</span></span>
<span class="line"><span style="color:#A6ACCD;">    const direction = offset &lt; offsetValue ? &#39;FRONT&#39; : &#39;BEHIND&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">    offsetValue = offset</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (direction === &#39;FRONT&#39;) {</span></span>
<span class="line"><span style="color:#A6ACCD;">      handleFront()</span></span>
<span class="line"><span style="color:#A6ACCD;">    } else if (direction === &#39;BEHIND&#39;) {</span></span>
<span class="line"><span style="color:#A6ACCD;">      handleBehind()</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 初始化检查范围</span></span>
<span class="line"><span style="color:#A6ACCD;">  checkRange(0, param.keeps - 1)</span></span>
<span class="line"><span style="color:#A6ACCD;">  return {</span></span>
<span class="line"><span style="color:#A6ACCD;">    handleScroll</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div></li></ul><h2 id="padding-进一步实现动态高度" tabindex="-1">padding 进一步实现动态高度 <a class="header-anchor" href="#padding-进一步实现动态高度" aria-label="Permalink to &quot;padding 进一步实现动态高度&quot;">​</a></h2><ul><li><p>原理</p><ul><li>在每个item渲染完成后收集其id与高度映射，如果是动态高度的，则更新平均值</li><li>在获取滑动的个数时，如果是动态高度，则使用二分查找最近的那个即可</li></ul></li><li><p>render 函数</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function onItemResize(id: string | number, size: number) {</span></span>
<span class="line"><span style="color:#A6ACCD;">	virtual.saveSize(id, size)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">function genRenderComponent() {</span></span>
<span class="line"><span style="color:#A6ACCD;">     ...</span></span>
<span class="line"><span style="color:#A6ACCD;">          </span></span>
<span class="line"><span style="color:#A6ACCD;">     slots.push(</span></span>
<span class="line"><span style="color:#A6ACCD;">         &lt;VirtualItem</span></span>
<span class="line"><span style="color:#A6ACCD;">         uniqueKey={uniqueKey}</span></span>
<span class="line"><span style="color:#A6ACCD;">         source={dataSource}</span></span>
<span class="line"><span style="color:#A6ACCD;">         component={dataComponent}</span></span>
<span class="line"><span style="color:#A6ACCD;">         onItemResize={onItemResize}</span></span>
<span class="line"><span style="color:#A6ACCD;">         &gt;&lt;/VirtualItem&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">     )</span></span>
<span class="line"><span style="color:#A6ACCD;">      return slots</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div></li><li><p>VirtualItem</p><ul><li>在挂载和更新完毕后重新派发<code>itemResize</code></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">import { defineComponent, onMounted, onUpdated, ref } from &#39;vue&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">import { virtualItemProps } from &#39;./props&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">export default defineComponent({</span></span>
<span class="line"><span style="color:#A6ACCD;">  name: &#39;virtual-item&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">  props: virtualItemProps,</span></span>
<span class="line"><span style="color:#A6ACCD;">  emits: [&#39;itemResize&#39;],</span></span>
<span class="line"><span style="color:#A6ACCD;">  setup(props, { emit }) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const root = ref&lt;HTMLElement | null&gt;(null)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    const dispatchEvent = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">      emit(&#39;itemResize&#39;, props.uniqueKey, root.value?.offsetHeight)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    onMounted(dispatchEvent)</span></span>
<span class="line"><span style="color:#A6ACCD;">    onUpdated(dispatchEvent)</span></span>
<span class="line"><span style="color:#A6ACCD;">    return () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">      const { component: Com, source, uniqueKey } = props</span></span>
<span class="line"><span style="color:#A6ACCD;">      return (</span></span>
<span class="line"><span style="color:#A6ACCD;">        Com &amp;&amp; (</span></span>
<span class="line"><span style="color:#A6ACCD;">          &lt;div key={uniqueKey} ref={root}&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            &lt;Com source={source}&gt;&lt;/Com&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">          &lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        )</span></span>
<span class="line"><span style="color:#A6ACCD;">      )</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span></code></pre></div></li><li><p>核心逻辑</p><ul><li>saveSize： 保存id-&gt;高度的映射 <ul><li>初始化时记录第一个为固定高度</li><li>如果存在高度有变化的，为动态高度</li><li>如果是动态高度的，使用映射表计算其平均高度</li></ul></li><li>getScrollOvers <ul><li>如果是固定高度则返回（滚动条偏移量/定值）</li><li>否则使用二分法，获取最接近的下标，这个作为滚动到的个数</li></ul></li><li>getIndexOffSet <ul><li>如果映射表中有对应的id高度，则使用对应的，否则使用平均或者预估的</li><li>这样就能得出精确的上padding</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">const enum CALC_TYPE {</span></span>
<span class="line"><span style="color:#A6ACCD;">  INIT = &#39;INIT&#39;, // 初始</span></span>
<span class="line"><span style="color:#A6ACCD;">  FIXED = &#39;FIXED&#39;, // 固定</span></span>
<span class="line"><span style="color:#A6ACCD;">  DYNAMIC = &#39;DYNAMIC&#39; // 动态</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">export function initVirtual(param: VirtualOptions, update: updateType) {</span></span>
<span class="line"><span style="color:#A6ACCD;">	...</span></span>
<span class="line"><span style="color:#A6ACCD;">	// 初始化元素方式</span></span>
<span class="line"><span style="color:#A6ACCD;">    let calcType = CALC_TYPE.INIT</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 默认元素固定高度</span></span>
<span class="line"><span style="color:#A6ACCD;">    let fixedSizeVal = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 初始化滚动条偏移量</span></span>
<span class="line"><span style="color:#A6ACCD;">    let offsetValue: number = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 收集id=&gt;高度 映射</span></span>
<span class="line"><span style="color:#A6ACCD;">    const sizes = new Map&lt;string | number, number&gt;()</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 元素渲染后的高度平均值</span></span>
<span class="line"><span style="color:#A6ACCD;">    let firstRangeAvg = 0</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    // 判断是否是固定高度</span></span>
<span class="line"><span style="color:#A6ACCD;">    function isFixed() {</span></span>
<span class="line"><span style="color:#A6ACCD;">      return calcType === CALC_TYPE.FIXED</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    // 获取单个元素高度</span></span>
<span class="line"><span style="color:#A6ACCD;">    function getEstimateSize() {</span></span>
<span class="line"><span style="color:#A6ACCD;">      // 如果是固定高度，则使用固定高度</span></span>
<span class="line"><span style="color:#A6ACCD;">      // 否则使用平均值或者预期值</span></span>
<span class="line"><span style="color:#A6ACCD;">      return isFixed() ? fixedSizeVal : firstRangeAvg || param.estimateSize</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 获取上paddining</span></span>
<span class="line"><span style="color:#A6ACCD;">    function getPadFront() {</span></span>
<span class="line"><span style="color:#A6ACCD;">      // padding-top = 预估高度 * 显示开始下标</span></span>
<span class="line"><span style="color:#A6ACCD;">      // 准确计算上偏移量</span></span>
<span class="line"><span style="color:#A6ACCD;">      if (isFixed()) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        return getEstimateSize() * range.start</span></span>
<span class="line"><span style="color:#A6ACCD;">      } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 将滚动后的元素累加一遍计算上高度</span></span>
<span class="line"><span style="color:#A6ACCD;">        return getIndexOffSet(range.start)</span></span>
<span class="line"><span style="color:#A6ACCD;">      }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 累计计算上偏移量</span></span>
<span class="line"><span style="color:#A6ACCD;">    function getIndexOffSet(idx: number) {</span></span>
<span class="line"><span style="color:#A6ACCD;">      if (!idx) return 0</span></span>
<span class="line"><span style="color:#A6ACCD;">      let offset = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">      for (let i = 0; i &lt; idx; i++) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        let indexSize = sizes.get(param.uniqueIds[i])</span></span>
<span class="line"><span style="color:#A6ACCD;">        offset += typeof indexSize === &#39;number&#39; ? indexSize : getEstimateSize()</span></span>
<span class="line"><span style="color:#A6ACCD;">      }</span></span>
<span class="line"><span style="color:#A6ACCD;">      return offset</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 获取下padding</span></span>
<span class="line"><span style="color:#A6ACCD;">    function getPadBehind() {</span></span>
<span class="line"><span style="color:#A6ACCD;">      // 全部数据末尾下标</span></span>
<span class="line"><span style="color:#A6ACCD;">      const lastIndex = param.uniqueIds.length - 1</span></span>
<span class="line"><span style="color:#A6ACCD;">      // padding-bottom = (全部数据末尾下标-显示结束下标) * 预估高度</span></span>
<span class="line"><span style="color:#A6ACCD;">      return (lastIndex - range.end) * getEstimateSize()</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    function saveSize(id: string | number, size: number) {</span></span>
<span class="line"><span style="color:#A6ACCD;">      // 保存id=&gt;size 映射</span></span>
<span class="line"><span style="color:#A6ACCD;">      sizes.set(id, size)</span></span>
<span class="line"><span style="color:#A6ACCD;">      if (calcType === CALC_TYPE.INIT) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 如果是初始化，则记录 fixedSizeVal</span></span>
<span class="line"><span style="color:#A6ACCD;">        fixedSizeVal = size</span></span>
<span class="line"><span style="color:#A6ACCD;">        calcType = CALC_TYPE.FIXED</span></span>
<span class="line"><span style="color:#A6ACCD;">      } else if (calcType === CALC_TYPE.FIXED &amp;&amp; fixedSizeVal !== size) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 如果不是初始化且高度变化则是动态高度</span></span>
<span class="line"><span style="color:#A6ACCD;">        calcType = CALC_TYPE.DYNAMIC</span></span>
<span class="line"><span style="color:#A6ACCD;">        fixedSizeVal = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">      }</span></span>
<span class="line"><span style="color:#A6ACCD;">      if (calcType === CALC_TYPE.DYNAMIC) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 如果是动态高度,根据已经加载的数据算一个平均值来撑开滚动条</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 根据当前展示的数据，来计算一个滚动条的值</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (sizes.size &lt; Math.min(param.keeps, param.uniqueIds.length)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">          firstRangeAvg = Math.round(</span></span>
<span class="line"><span style="color:#A6ACCD;">            [...sizes.values()].reduce((acc, val) =&gt; acc + val, 0) / sizes.size</span></span>
<span class="line"><span style="color:#A6ACCD;">          )</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">      }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div></li></ul><h2 id="使用" tabindex="-1">使用 <a class="header-anchor" href="#使用" aria-label="Permalink to &quot;使用&quot;">​</a></h2><ul><li><p>playVirtualScrollList.vue</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;script setup lang=&quot;ts&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">import { Random } from &#39;mockjs&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">import { ref } from &#39;vue&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">import playItem from &#39;./playItem.vue&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">import { DefineComponent } from &#39;vue&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">const totalCount = 100</span></span>
<span class="line"><span style="color:#A6ACCD;">interface DataType {</span></span>
<span class="line"><span style="color:#A6ACCD;">  id: number,</span></span>
<span class="line"><span style="color:#A6ACCD;">  name: string,</span></span>
<span class="line"><span style="color:#A6ACCD;">  desc: string,</span></span>
<span class="line"><span style="color:#A6ACCD;">  index: number</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const data: Array&lt;DataType&gt; = []</span></span>
<span class="line"><span style="color:#A6ACCD;">let index = 0</span></span>
<span class="line"><span style="color:#A6ACCD;">while (index++ !== totalCount) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  data.push({</span></span>
<span class="line"><span style="color:#A6ACCD;">    id: index,</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: Random.name(),</span></span>
<span class="line"><span style="color:#A6ACCD;">    desc: Random.csentence(20, 120),</span></span>
<span class="line"><span style="color:#A6ACCD;">    index</span></span>
<span class="line"><span style="color:#A6ACCD;">  })</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">const items = ref&lt;Array&lt;DataType&gt;&gt;(data)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(items)</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/script&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;template&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">  &lt;z-virtual-scroll-list class=&quot;virtual-list&quot; :data-sources=&quot;items&quot; data-key=&quot;id&quot; :keeps=&quot;30&quot; :estimateSize=&quot;80&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">    :data-component=&quot;(playItem as DefineComponent&lt;{}, {}, any&gt;)&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">  &lt;/z-virtual-scroll-list&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/template&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;style lang=&quot;scss&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">.virtual-list {</span></span>
<span class="line"><span style="color:#A6ACCD;">  width: 100%;</span></span>
<span class="line"><span style="color:#A6ACCD;">  height: 500px;</span></span>
<span class="line"><span style="color:#A6ACCD;">  overflow-y: scroll;</span></span>
<span class="line"><span style="color:#A6ACCD;">  border: 1px solid red;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/style&gt;</span></span></code></pre></div></li><li><p>playItem.vue</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;template&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">  &lt;div class=&quot;item&quot; :data-index=&quot;source.index&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;div class=&quot;head&quot; :style=&quot;{ color: &#39;red&#39;, fontWeight: &#39;bold&#39;, fontSize: &#39;35px&#39; }&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">      &lt;span&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        {{ source.index }}</span></span>
<span class="line"><span style="color:#A6ACCD;">      &lt;/span&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">      &lt;span&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        {{ source.name }}</span></span>
<span class="line"><span style="color:#A6ACCD;">      &lt;/span&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;div class=&quot;body&quot; :style=&quot;{ fontSize: &#39;18px&#39; }&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">      &lt;span&gt;{{ source.desc }}&lt;/span&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">  &lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/template&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;script lang=&quot;ts&quot; setup&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">defineProps({</span></span>
<span class="line"><span style="color:#A6ACCD;">  source: {</span></span>
<span class="line"><span style="color:#A6ACCD;">    type: Object,</span></span>
<span class="line"><span style="color:#A6ACCD;">    default: () =&gt; { }</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">})</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/script&gt;</span></span></code></pre></div></li></ul>`,11),o=[t];function c(i,r,C,A,y,D){return n(),a("div",null,o)}const g=s(e,[["render",c]]);export{u as __pageData,g as default};
