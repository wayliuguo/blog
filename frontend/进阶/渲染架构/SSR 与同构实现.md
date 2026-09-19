# SSR 与同构实现

SSR 的「快」是浏览器视角的快，不是服务端的快。这一篇拆开服务端那份账：同一个页面树怎么做到两端各跑一遍、渲染出来的字符串里为什么还夹着数据、客户端接管这份 HTML 时要赔多少、以及流式渲染把等待摊开之后又付出了什么代价。全部数字来自配套实验台，命令写在每段代码上方。

## 一、同构的前提：一份页面树，两条渲染路径

同构（isomorphic）说的是**同一份组件代码，既能被服务端渲染成字符串，也能被浏览器渲染成 DOM**。要做到这一点，页面树本身得是「纯描述」——一个普通对象，不含任何 DOM 引用或浏览器 API。实验台里它就是一个函数返回的 `h()` 调用：

> 摘自 `./code/render-lab/src/app.mjs`（运行：`npm run ssr`）

```js
export function App({ data, reviewsSlot, recommendSlot, priceOf }) {
    return h(
        'div',
        { class: 'app' },
        h(Header, { title: data.title, city: data.city, sloganIndex: data.sloganIndex }),
        h(ProductList, { products: data.products, priceOf }),
        reviewsSlot || h(Reviews, { reviews: data.reviews }),
        recommendSlot || h(Recommend, { items: data.recommend }),
        h(Island, { name: 'like-button', props: { likes: data.likes } }, LikeButton({ likes: data.likes }))
    )
}
```

这棵树上没有任何一处去碰 `document`，所以服务端可以直接 `renderToString` 它。三个参数是留给不同路径的钩子：

- `reviewsSlot` / `recommendSlot` 不传时走默认组件（同步整棵渲染，SSR / SSG / 客户端接管都用这条）；传了就说明这两个位置要**切出流式边界**（第五节）。
- `priceOf` 不传时用服务端口径，传了就换客户端口径 —— 这是第四节点水失配实验的开关。

**同构的收益**是：页面结构只写一次，服务端渲染的产物和客户端接管时算出的树来自同一份源码，不会出现「两端各写一遍、改一处忘一处」。**同构的代价**也都从这条特性长出来：

1. 组件代码必须两端都能跑，服务端渲染时**不能有副作用**（不能写 `localStorage`、不能依赖 `window`、不能在模块顶层发起请求）；
2. 数据必须先于渲染就位，于是「取数」被提到渲染之前（第二节的那笔账）；
3. 客户端要能重建出**完全相同**的树，否则接管时就会失配 —— 这是第四节的全部内容。

## 二、服务端那份账：SSR 的耗时全压在慢接口上

三条交付路径（SSR / SSG / ISR）每一种请求四次，服务端自己在响应头里记下 `X-Render-Mode` 与 `X-Render-Ms`：

```
| 路径                     | X-Render-Mode | 服务端耗时 | 响应头到达 | HTML 字节 |
|--------------------------|---------------|------------|------------|-----------|
| SSR 第 1 次              | ssr           | 266 ms     | 273 ms     | 5.3 KB    |
| SSR 第 2 次              | ssr           | 275 ms     | 279 ms     | 5.3 KB    |
| SSR 第 3 次              | ssr           | 275 ms     | 278 ms     | 5.3 KB    |
| SSG 第 1 次              | ssg           | 0 ms       | 4 ms       | 5.3 KB    |
| SSG 第 2 次              | ssg           | 0 ms       | 3 ms       | 5.3 KB    |
| SSG 第 3 次              | ssg           | 0 ms       | 3 ms       | 5.3 KB    |
| ISR 首次（回源）         | isr-miss      | 263 ms     | 266 ms     | 5.3 KB    |
| ISR 立刻再来（命中）     | isr-hit       | 0 ms       | 2 ms       | 5.3 KB    |
| ISR 过期后（返回旧内容） | isr-stale     | 0 ms       | 4 ms       | 5.3 KB    |
| ISR 后台重建完成后       | isr-hit       | 0 ms       | 1 ms       | 5.3 KB    |
```

先读 SSR 那三行：**266 / 275 / 275ms**，连着三次一次都没省下，因为每次请求服务端都要把同样的树重渲染一遍、把慢接口重等一遍。再看 SSG：服务端耗时那列是 **0ms**，说明它连一次渲染都不做 —— 那 260ms 在 `listen()` 之前就花完了（第 1 篇的 `warm()`）。ISR 的四态（回源 / 命中 / 过期返回旧内容 / 重建后命中）在第 1 篇已经展开，这里只借用它做对照：**它省掉的正是 SSR 每次都逃不掉的那 260ms**。

那 260ms 到底花在哪？看取数形态：

> 摘自 `./code/render-lab/src/data.mjs`（运行：`npm run ssr`）

```js
export async function loadAll(latency = REVIEWS_LATENCY) {
    const [reviews, recommend] = await Promise.all([loadReviews(latency), loadRecommend(Math.round(latency / 2))])
    return { ...loadShell(), reviews, recommend }
}
```

两个慢接口是**并发**发的（评价 260ms、推荐 130ms），但 `await Promise.all` 的语义是「两个都好了才继续」，所以整体耗时等于**更慢的那个**。这里的 266ms 里，真正属于「渲染」的只有个位数毫秒，其余全是等待。

这带来一个必须记住的结论：**SSR 的响应时间与最慢的那个数据源绑定**。一个页面只要有一个慢区块（个性化推荐、实时库存、第三方接口），整页 HTML 就都发不出去 —— 哪怕其余 90% 的内容本机立即可得。这正是流式渲染存在的理由。

## 三、SSR 的产物是 HTML + 数据，注水数据是隐性成本

服务端渲染出来的字符串里，除了标记还有一份 **注水数据**（把渲染时用到的 props 序列化后塞进页面），客户端接管时要靠它重建同一棵树：

> 摘自 `./code/render-lab/harness/routes.mjs`（运行：`npm run ssr`）

```js
const scriptTag = (data) => `<script>window.__DATA__ = ${serializeData(data)}</script>`
```

> 摘自 `./code/render-lab/harness/routes.mjs`（运行：`npm run ssr`）

```js
const docTail = ({ data = '', entry }) => `</div>
${data}
<script src="/pages/lab.js"></script>
<script type="module" src="${entry}"></script>
</body>
</html>`
```

这份数据的体积不是小数目：

```
| 页面               | 总字节 | 结构（标记） | 注水数据 | 数据占比 |
|--------------------|--------|--------------|----------|----------|
| SSR（下发数据）    | 5.3 KB | 4.1 KB       | 1.2 KB   | 22.3%    |
| 岛化（不下发数据） | 4.1 KB | 4.1 KB       | 0 B      | 0.0%     |
```

**同一份标记，多带 1.2KB 数据，体积涨了 29.5%**。这 1.2KB 换到的是「客户端不必再请求一次接口」——它把一次网络往返替换成了 1.2KB 的传输，是否划算取决于数据量与接口成本：

- 数据小、接口远 → 划算，尤其省掉一次 RTT 对首屏很关键；
- 数据大（一个长列表、一棵深层树）→ 页面 HTML 会被注水数据撑大，且服务端序列化本身要耗 CPU。这时更常见的做法是**只下发「重建这棵树所必需的」字段**，其余让客户端自己取。

注意 `docTail` 里数据与入口模块的位置：它们都在 `</div>` 之后。这个位置安排的用意是**内容先到、脚本后到**，让浏览器先解析完可见内容再执行 JS；但它同时是第五节的伏笔 —— 流式渲染的数据只能在最后一个边界之后才凑齐，所以入口也只能在那之后跑。

最后看一眼 `renderToString` 的产物（评价与推荐传空数组，为了看清结构）：

```
<div class="app"><header class="hd" data-marker="header"><h1>渲染架构实验台</h1><p class="sub">杭州（CITY-005）· 共 50 个站点在运营</p><p class="tip">深圳站 · 满 99 减 20 · 次日达</p></header><section class="products" data-marker="products"><h2>在售商品 · 8 件</h2><ul><li class="card" data-id="1"><strong>手冲咖啡套装</strong><span class="price">¥19.90</span> …
```

产物总长 1.8KB，其中**不含任何事件监听器** —— 事件是客户端接管时挂的，这正是下一节要接的活。

## 四、hydrate：代价由「失配」有多大决定

`hydrate` 要做的事和 `renderDOM` 长得像，但方向相反：`renderDOM` 是「按树建 DOM」，`hydrate` 是「**拿树去认领已经存在的 DOM**」。策略只有一条，但它是全部成本的来源：

> 摘自 `./code/render-lab/src/hydrate.mjs`（运行：`npm run hydrate`）

```js
function replace(dom, next, stats) {
    stats.mismatches++
    stats.discarded += countNodes(dom)
    if (dom && dom.parentNode) dom.parentNode.replaceChild(next, dom)
    return next
}
```

> 摘自 `./code/render-lab/src/hydrate.mjs`（运行：`npm run hydrate`）

```js
    const { type, props, children } = vnode
    if (typeof type === 'function') return hydrate(resolve(vnode), dom, stats)

    // 标签名不一样：这一段没有可复用的可能，整棵重建
    if (!dom || dom.nodeType !== 1 || dom.tagName.toLowerCase() !== type) return replace(dom, createNode(vnode, stats), stats)
    stats.reused++

    applyProps(dom, props, stats)
    const have = dom.childNodes
    for (let i = 0; i < children.length; i++) hydrate(children[i], have[i], stats)
    // 服务端多出来的节点要删掉，否则下次更新时会成为幽灵节点
    for (let i = have.length - 1; i >= children.length; i--) {
        stats.discarded += countNodes(have[i])
        dom.removeChild(have[i])
        stats.mismatches++
    }
```

对齐单位是 **`childNodes` 的下标**：第 i 个虚拟子节点去认领第 i 个真实子节点。于是有三种结局：

- **标签对得上** → 复用那个 DOM，只把属性补一遍（事件监听器在这里挂上）；
- **标签对不上** → 这一段整棵重建，服务端渲染的节点被丢弃（`discarded` 计数）；
- **文本节点** → 复用它，但如果文本内容两端不一致，就**静默改写**（`patched` 计数），不报错。

还有一个容器的坑值得单独记：

> 摘自 `./code/render-lab/src/hydrate.mjs`（运行：`npm run hydrate`）

```js
export function hydrateRoot(container, vnode, stats) {
    stats = stats || newStats()
    const list = Array.isArray(vnode) ? vnode : [vnode]
    for (let i = 0; i < list.length; i++) hydrate(list[i], container.childNodes[i], stats)
    for (let i = container.childNodes.length - 1; i >= list.length; i--) {
        stats.discarded += countNodes(container.childNodes[i])
        container.removeChild(container.childNodes[i])
        stats.mismatches++
    }
    return stats
}
```

**对齐的单位是容器的 `childNodes`，不是容器自己**。服务端渲染时 `App` 的根 `div` 是挂到 `#app` 里面的，所以接管时应该让「`#app` 的第 0 个子节点」去认领「`App` 根的 `div`」。如果直接拿 `App` 树去和 `#app` 比 —— `div` 对 `div` 看似对得上，实际是把两个不同层级的东西认了亲，整棵树会从头错位、全量重建。这个坑实验台真的踩过一次，症状是「明明两端一致，却什么都没复用」。

实验台用四个变体把「失配有多贵」量出来（`variant` 参数切换）：

> 摘自 `./code/render-lab/src/entry-full.mjs`（运行：`npm run hydrate`）

```js
const treeOf = () => {
    if (variant === 'price') {
        // 两端口径不一致：服务端 toFixed(2)，客户端取整 —— 每个价格节点都要改
        return App({ data: window.__DATA__, priceOf: formatPriceLoose })
    }
    if (variant === 'tag') {
        // 标签不一致：只用 div 换掉 section，整段评价子树就没有可复用的结构
        return App({ data: window.__DATA__, reviewsSlot: h('div', { class: 'reviews', 'data-marker': 'reviews' }, '评价') })
    }
    return App({ data: window.__DATA__ })
}
```

```
| 客户端拿到的树     | 复用 | 新建 | 丢弃 | 改写 | 失配 | 突变 child/attr/char | 耗时 |
|--------------------|------|------|------|------|------|----------------------|------|
| 两端一致           | 97   | 0    | 0    | 0    | 0    | 0 / 0 / 0            | 2 ms |
| 价格口径不一致     | 97   | 0    | 0    | 8    | 0    | 0 / 0 / 8            | 2 ms |
| 标签不一致         | 83   | 2    | 14   | 2    | 1    | 1 / 0 / 0            | 2 ms |
| 不做注水，直接重建 | 0    | 97   | 97   | 57   | 0    | 1 / 0 / 0            | 2 ms |
```

前五列是 `hydrate` 自己记的账，后三列是浏览器 `MutationObserver` 数到的**真实 DOM 突变**。逐行读：

- **两端一致**：复用 97 个节点，`childList / attributes / characterData` 突变 **0 次**，页面上一个 DOM 都没被写过。按钮点得动（监听器挂上了），这就是 hydration 的理想形态 —— **它的全部动作只是挂事件，不是改 DOM**。
- **价格口径不一致**：复用 97 个，但**改写 8 处文本**，`characterData` 突变 8 次。服务端写 `¥19.90`、客户端口径写 `¥20`，8 件商品逐个被改。**不报错、不重建、只是白干** —— 服务端为这 8 个价格做的渲染工作全部作废，而且这种失配最难发现，因为它连一个警告都没有。
- **标签不一致**：`section` 换成 `div`，整段评价子树**没有可复用的结构**，丢弃 14 个节点、重建 2 个。代价比一次文本改写大一个量级 —— 它连「改一改就能用」的机会都没有。
- **不做注水，直接重建**：丢弃 97、重建 97。服务端那份 HTML 就只剩「用户先看一眼」的价值了，接管等于把它全部扔掉重来。

四个变体的耗时都是 2ms，说明**在页面这个量级上，失配的代价还不体现在时间上，而体现在「有没有写入 DOM」上**。要把失配钉死，就把「注水期不应有任何 DOM 写入」当硬指标 —— 本实验台的 clean 变体是 0 突变，`rerender` 变体是「服务端白渲染」。

失配的经典来源就那么几类，全都是**同一份数据在两端算出不同结果**：时区（服务端 UTC、客户端本地时间）、货币与数字格式化（千分位、小数位）、日期格式、随机数与 `Math.random()`、不稳定的排序（两次渲染顺序不同）。它们的共同特征是不报错，只在 `characterData` 上悄悄多出几笔改写。

## 五、流式渲染：把等慢接口的时间摊开给浏览器

流式渲染不改变「服务端渲染」这件事，它只改变**什么时候把已经渲染好的部分交出去**。机制由两件事撑起：

> 摘自 `./code/render-lab/src/render-stream.mjs`（运行：`npm run stream`）

```js
    const { type, props, children } = vnode
    if (type === AWAIT) {
        write(`<div id="s-${props.id}">${renderToString(props.fallback)}</div>`)
        const task = { id: props.id, render: props.render }
        // 立刻发起，promise 带上 task 身份，下面按「谁先完成」排序时不会认错
        task.promise = props.data().then((value) => ({ task, value }))
        tasks.push(task)
        return
    }
```

> 摘自 `./code/render-lab/src/render-stream.mjs`（运行：`npm run stream`）

```js
export async function* renderSections(root) {
    let buffer = ''
    const tasks = []
    walk(root, (s) => (buffer += s), tasks)
    yield { name: 'shell', html: buffer }

    let remaining = tasks.slice()
    while (remaining.length) {
        const done = await Promise.race(remaining.map((t) => t.promise))
        const task = done.task
        remaining = remaining.filter((t) => t !== task)
        yield { name: `${task.id}:fill`, html: fill(task.id, renderToString(task.render(done.value))) }
    }
}
```

要点是**遇到边界不阻塞，继续往下走**：`walk` 走到 `Await` 就写一段兜底（骨架）占住位置，把取数 promise 登记进 `tasks`，然后接着渲染后面的内容。第一段（`shell`）由此在毫秒级就能产出 —— 它包含页头与商品列表，而这两个根本不等慢接口。

补位顺序由 `Promise.race` 决定：**谁先好谁先补**，跟它在页面里的位置无关。服务端侧实测：

```
响应头 3 ms · 全部完成 266 ms · 总字节 6.5 KB
| 段             | 到达时刻 | 该次写入字节 |
|----------------|----------|--------------|
| shell          | 3 ms     | 1.9 KB       |
| recommend:fill | 141 ms   | 482 B        |
| reviews:fill   | 265 ms   | 776 B        |
```

**壳在 3ms 就交出去了，评价要等到 265ms** —— 中间那 262ms 是「慢接口还没回来」，不是「服务端在忙」。与非流式 SSR 对照：

```
| 交付方式   | 响应头到达 | 首个内容段到达 | 完成   | HTML 字节 |
|------------|------------|----------------|--------|-----------|
| 非流式 SSR | 264 ms     | 264 ms         | 264 ms | 5.3 KB    |
| 流式渲染   | 3 ms       | 3 ms           | 266 ms | 6.5 KB    |
```

**首个内容字节早了 261ms**，代价是 HTML 多了 1.2KB。这 1.2KB 是流式的固定开销：占位 `div`、装真内容的 `<template>`、自删的补位脚本、以及 head 里那段运行时。服务端把它写出去的代码是这样：

> 摘自 `./code/render-lab/harness/routes.mjs`（运行：`npm run stream`）

```js
        if (mode === 'stream') {
            head['X-Render-Mode'] = 'stream'
            head['X-Render-Ms'] = Math.round(performance.now() - started)
            res.writeHead(200, head)
            res.flushHeaders() // 头先走，TTFB 才反映「多久能开始说话」，而不是「多久渲染完」
            res.write(docHead({ mode, stream: true }))
```

`flushHeaders()` 是这里的关键：不调它，Node 会在第一次 `write` 时才发出响应头，于是「响应头到达」这个指标会被前面的 `await` 污染。调了它，头立刻走，TTFB 才真实反映「多久能开始说话」。

浏览器侧的首屏（`jslag=300`，模拟 JS 下载开销）：

```
| 交付方式   | FCP    | 商品列表出现 | 评价出现 | 入口模块开始执行 |
|------------|--------|--------------|----------|------------------|
| 非流式 SSR | 508 ms | 399 ms       | 399 ms   | 1679 ms          |
| 流式渲染   | 340 ms | 235 ms       | 373 ms   | 1650 ms          |
```

FCP 提前 **168ms**，商品列表提前 **164ms**。注意「评价出现」那列：流式的 373ms 比非流式的 399ms 早，但这是两个不同的东西 —— 非流式的 399ms 是「整页内容一起出现」的时刻，流式的 373ms 只是评价那一段补位的时刻，此时其余内容早在 235ms 就画出来了。**流式把「看得见」的边界提前了很多，而不是把最后一小段提前。**

## 六、流式与全量注水天然别扭

上表最后两列是最容易被忽略的一处：**流式的入口模块（1650ms）并没有比非流式（1679ms）更早**。

原因是全量 hydration 需要一个**完整**的数据对象去重建整棵树，而流式渲染下这份数据要等最后一个边界之后才凑齐：

> 摘自 `./code/render-lab/harness/routes.mjs`（运行：`npm run stream`）

```js
            for await (const segment of renderSections(app)) res.write(marker(segment.name) + segment.html)

            // 注水数据只能在最后一个边界之后才完整 —— 流式把「可交互」推迟了，这是它的代价
            const data = { ...shell, reviews: await reviewsPromise, recommend: await recommendPromise }
            res.end(docTail({ data: scriptTag(data), entry: '/src/entry-full.mjs' }))
```

`await reviewsPromise` 这一句把文档尾（注水数据 + 入口模块）压到了最后一个慢接口之后。于是流式的效果被切成两半：

- **FCP 与内容出现**：明显提前（用户先看到东西）；
- **可交互时间（TTI）**：几乎不动（用户能点之前还得等同一份数据）。

要连「点得动」也提前，有三条路，代价各不相同：

1. **分段下发注水数据**：每个边界补位时，把这一段的 props 一并塞进内联脚本。复杂度在于客户端要能接受「数据是分批到的」，重建整棵树的思路不再成立；
2. **改成岛化**：交互点自带 props（写在 `data-props` 属性里），根本不依赖全局那份 `__DATA__`，所以它的激活不必等任何东西 —— 第 3 篇量化了这条路的收益；
3. **保留流式 + 全量注水的组合**：接受「先看见、后点得动」，用骨架或 `aria-busy` 把这段等待表达清楚。

分段的边界该画在哪里，也有明确的答案：**画在「数据来源」的边界上**（评价接口一段、推荐接口一段），而不是画在「组件层级」的边界上。按组件树层级去切，一个深层列表页会切出几十个几百字节的碎片，每一片都要带自己的占位、模板与补位脚本，最后 TCP 效率被拖垮、总字节反而涨得比收益多。

## 小结

- 同构是「一份页面树两端渲染」，前提是树必须是纯描述
  - 组件两端可跑、渲染期无副作用；数据必须先于渲染就位；客户端要能重建出完全相同的树
  - 收益是结构只写一次，代价是上述三条约束贯穿整个工程
- SSR 的耗时绑定最慢的数据源，服务端反而更累
  - 实测连发三次响应头到达 266 / 275 / 275 ms，一次都没省下（渲染只占个位数毫秒）
  - `Promise.all` 并发取数，整体耗时等于更慢的那个（评价 260ms 决定一切）
  - SSG 服务端耗时 0ms、ISR 命中 1~2ms —— 省掉的正是 SSR 每次都逃不掉的那一段
- SSR 的产物是 HTML + 数据，注水数据是隐性成本
  - 实测标记 4.1KB + 数据 1.2KB，数据占 22.3%，同标记下发数据后体积涨 29.5%
  - 数据与入口模块都放在文档尾：内容先到、脚本后到
  - `renderToString` 产物里没有任何事件监听器，事件是客户端接管时挂的
- hydrate 的成本由失配决定，且失配不一定报错
  - 四种情形的（复用/新建/丢弃/改写/失配）实测：一致 97/0/0/0/0 · 价格口径 97/0/0/8/0 · 标签不一致 83/2/14/2/1 · 直接重建 0/97/97/57/0
  - 文本不一致只静默改写（`characterData` 8 次），标签不一致才整段重建（丢弃 14）
  - 真实 DOM 突变次数：一致 0 次，这才是要卡的硬指标
  - 对齐单位是容器的 `childNodes`，不是容器自己 —— 少这一层会导致整棵树从根错位
  - 经典失配来源：时区、货币与数字格式化、日期格式、随机数、不稳定排序
- 流式把「看得见」提前，不把「点得动」提前
  - 服务端壳 3ms 发出、整页 266ms 完成；首个内容字节比非流式早 261ms
  - 浏览器侧 FCP 340ms vs 508ms，商品列表 235ms vs 399ms
  - 代价是 HTML 从 5.3KB 涨到 6.5KB（占位、template、补位脚本、运行时）
  - 入口模块执行时刻几乎不变（1650ms vs 1679ms）—— 注水数据要等最后一个边界
  - 补位顺序由「谁先好」决定（推荐位 130ms 先于评价 260ms）
  - 分段边界画在数据来源上，不画在组件层级上

## 配套代码

本篇数字与代码来自 `code/render-lab`（零依赖，需要 Node 22 与本机 Chrome）。

| 文件 | 作用 | 对应小节 |
| ---- | ---- | ---- |
| `./code/render-lab/src/app.mjs` | 两端共用的页面树；`reviewsSlot` / `recommendSlot` / `priceOf` 三个钩子 | 一 |
| `./code/render-lab/scenarios/ssr.mjs` | SSR / SSG / ISR 的服务端耗时、注水数据占比、`renderToString` 产物 | 二、三 |
| `./code/render-lab/src/data.mjs` | 快慢数据分离；`loadAll` 的「最慢的决定一切」 | 二 |
| `./code/render-lab/harness/routes.mjs` | `scriptTag` 与 `docTail` 的位置安排；`stream` 分支的 `flushHeaders` 与尾部注水 | 三、五、六 |
| `./code/render-lab/src/hydrate.mjs` | `hydrate` 三种结局（复用 / 改写 / 重建）与 `hydrateRoot` 的对齐单位 | 四 |
| `./code/render-lab/src/entry-full.mjs` | 四个失配变体（clean / price / tag / rerender） | 四 |
| `./code/render-lab/scenarios/hydrate.mjs` | 四种情形的复用 / 新建 / 丢弃 / 改写与真实 DOM 突变次数 | 四 |
| `./code/render-lab/src/render-stream.mjs` | 流式的全部机制：边界节点、分段生成器、补位运行时 | 五 |
| `./code/render-lab/scenarios/stream.mjs` | 分段到达时刻、与非流式 SSR 的首字节对照、浏览器侧 FCP | 五、六 |
| `./code/render-lab/harness/probe.mjs` | 原生 `http` 客户端：分辨响应头 / 首段内容 / 完成（`fetch` 做不到） | 二、五 |
| `./code/render-lab/README.md` | 全部场景与已知边界 | 全篇 |

运行方式：在 `code/render-lab` 目录分别执行 `npm run ssr`、`npm run hydrate`、`npm run stream`。

## 参考

- 本模块总结：[总结](./总结.md)
- 本模块面试题：[面试题](./面试题.md)
- 上一篇：[渲染方案全景](./渲染方案全景.md)
- 下一篇：[新兴渲染范式](./新兴渲染范式.md)
