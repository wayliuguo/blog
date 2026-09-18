/**
 * DOM 查询与批量操作：把「读」和「写」分开，量出强制同步布局的代价
 * 页面加载后自动跑一遍并把结果打进 #probe（无头浏览器可直接 dump 出这些数字）
 */

/** 重建 host 里的 n 个 .box，返回元素数组（每次测量前都重建，避免残留影响） */
function buildBoxes(host, n) {
    host.innerHTML = ''
    for (let i = 0; i < n; i++) {
        const div = document.createElement('div')
        div.className = 'box'
        div.textContent = i
        host.appendChild(div)
    }
    return Array.from(host.children)
}

/** 写法 A：写一次就读一次——每次读都逼着浏览器立刻把样式落地成布局 */
function thrashLayout(host, n) {
    const els = buildBoxes(host, n)
    const t0 = performance.now()
    for (const el of els) {
        el.style.width = el.offsetWidth + 1 + 'px'
    }
    return performance.now() - t0
}

/** 写法 B：先把要读的都读完，再统一写——循环里一次布局都不触发 */
function batchLayout(host, n) {
    const els = buildBoxes(host, n)
    const t0 = performance.now()
    const widths = els.map(el => el.offsetWidth)
    els.forEach((el, i) => {
        el.style.width = widths[i] + 1 + 'px'
    })
    return performance.now() - t0
}

/** 逐条 appendChild 到已挂载的容器 */
function appendOneByOne(host, n) {
    host.innerHTML = ''
    const t0 = performance.now()
    for (let i = 0; i < n; i++) {
        const li = document.createElement('li')
        li.textContent = 'item ' + i
        host.appendChild(li)
    }
    return performance.now() - t0
}

/** 先攒在 DocumentFragment 里，最后一次性挂上去 */
function appendWithFragment(host, n) {
    host.innerHTML = ''
    const frag = document.createDocumentFragment()
    const t0 = performance.now()
    for (let i = 0; i < n; i++) {
        const li = document.createElement('li')
        li.textContent = 'item ' + i
        frag.appendChild(li)
    }
    host.appendChild(frag)
    return performance.now() - t0
}

/** 拼字符串交给 innerHTML 一次解析 */
function appendWithHtml(host, n) {
    const t0 = performance.now()
    const html = Array.from({ length: n }, (_, i) => '<li>item ' + i + '</li>').join('')
    host.innerHTML = html
    return performance.now() - t0
}

/** 活集合（HTMLCollection）会跟着 DOM 变，静态集合（NodeList）不会 */
function compareCollections() {
    const host = document.getElementById('live-list')
    host.innerHTML = '<li>a</li><li>b</li>'
    const live = host.getElementsByTagName('li')
    const stat = host.querySelectorAll('li')
    const before = { live: live.length, stat: stat.length }
    host.appendChild(document.createElement('li'))
    const after = { live: live.length, stat: stat.length }
    return { before, after }
}

const N_LAYOUT = 500
const N_APPEND = 3000
const N_WRITE = 200

/** 把连续 n 次写合并到下一帧：不管排多少次，每帧只落一次 style 写入 */
function coalesceToFrame(box, n) {
    let pending = null
    let scheduled = false
    const state = { scheduled: n, writes: 0 }
    for (let i = 1; i <= n; i++) {
        pending = 100 + i
        if (scheduled) continue
        scheduled = true
        requestAnimationFrame(() => {
            scheduled = false
            state.writes++
            box.style.width = pending + 'px'
        })
    }
    return state
}

function fmt(ms) {
    return ms.toFixed(1) + ' ms'
}

function run() {
    const boxHost = document.getElementById('boxes')
    const listHost = document.getElementById('big-list')

    // 各跑一遍热身轮，再取第二轮的数字，避免首次编译/解析干扰
    thrashLayout(boxHost, N_LAYOUT)
    batchLayout(boxHost, N_LAYOUT)
    appendOneByOne(listHost, N_APPEND)
    appendWithFragment(listHost, N_APPEND)
    appendWithHtml(listHost, N_APPEND)

    const thrash = thrashLayout(boxHost, N_LAYOUT)
    const batch = batchLayout(boxHost, N_LAYOUT)
    const one = appendOneByOne(listHost, N_APPEND)
    const frag = appendWithFragment(listHost, N_APPEND)
    const html = appendWithHtml(listHost, N_APPEND)
    const coll = compareCollections()

    const lines = [
        '① 强制同步布局（' + N_LAYOUT + ' 个元素，同样把宽度 +1px）',
        '   读写交替 el.style.width = el.offsetWidth + 1  -> ' + fmt(thrash),
        '   先读后写（先 map 收集再统一写）              -> ' + fmt(batch),
        '   倍数 = ' + (thrash / Math.max(batch, 0.1)).toFixed(1) + 'x',
        '',
        '② 批量插入（' + N_APPEND + ' 个 li，插入到已挂载的容器）',
        '   逐条 appendChild        -> ' + fmt(one),
        '   DocumentFragment 一次挂 -> ' + fmt(frag),
        '   innerHTML 一次解析      -> ' + fmt(html),
        '',
        '③ 两种集合',
        '   插入前：getElementsByTagName().length = ' + coll.before.live + '，querySelectorAll().length = ' + coll.before.stat,
        '   插入一个 li 后：HTMLCollection = ' + coll.after.live + '（跟着变），NodeList = ' + coll.after.stat + '（不变）'
    ]
    document.getElementById('probe').textContent = lines.join('\n')

    // ④ 合批写入：依赖渲染帧，所以先写探针、异步补上这一节（不产生帧的环境里写入数为 0）
    const rafState = coalesceToFrame(document.getElementById('raf-box'), N_WRITE)
    setTimeout(function () {
        document.getElementById('probe').textContent +=
            '\n④ 把连续写合并到下一帧（连续排 ' +
            N_WRITE +
            ' 次宽度调整）\n' +
            '   排入 requestAnimationFrame ' +
            rafState.scheduled +
            ' 次 -> 实际写入 ' +
            rafState.writes +
            ' 次' +
            (rafState.writes ? '' : '（本环境不产生渲染帧，需要在真实浏览器窗口里看）')
    }, 300)
}

document.getElementById('run-thrash').addEventListener('click', function () {
    const ms = thrashLayout(document.getElementById('boxes'), N_LAYOUT)
    document.getElementById('manual').textContent = '读写交替：' + fmt(ms)
})

document.getElementById('run-batch').addEventListener('click', function () {
    const ms = batchLayout(document.getElementById('boxes'), N_LAYOUT)
    document.getElementById('manual').textContent = '先读后写：' + fmt(ms)
})

run()
