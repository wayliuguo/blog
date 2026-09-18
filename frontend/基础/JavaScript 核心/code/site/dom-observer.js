/**
 * 三个观察者：IntersectionObserver / ResizeObserver / MutationObserver
 *
 * 探针分两部分：
 *   可在无头环境验证的（几何量、尺寸、MutationObserver 记录）—— 直接写进 #probe；
 *   依赖合成帧的（IntersectionObserver / ResizeObserver 的**回调投递**）—— 写在 #io-log / #ro-log，
 *   需要在真实浏览器窗口里查看。无头 Chrome 不保证产生渲染帧（实测 --dump-dom 下 IO / RO 回调都不投递），
 *   所以这里不伪造它们的输出，而是把判定依据（rect 与边界）算出来供核对；
 *   MutationObserver 的回调走微任务队列，不依赖渲染帧，因此任何环境都能看到结果。
 */
const lines = []
const log = line => lines.push(line)
const sleep = ms => new Promise(r => setTimeout(r, ms))

function observeIntersection() {
    const target = document.getElementById('below-fold')
    const ioLog = document.getElementById('io-log')
    const parts = []
    // 两个观察者的回调投递顺序不保证，按下标落位再统一渲染，避免"谁后到谁把先到的覆盖掉"
    const render = () => {
        ioLog.textContent = parts.filter(Boolean).join(' ｜ ')
    }
    const observeWith = (index, label, options) => {
        new IntersectionObserver(entries => {
            const e = entries[0]
            parts[index] =
                label + '：isIntersecting = ' + e.isIntersecting + '，ratio = ' + e.intersectionRatio.toFixed(2)
            render()
        }, options).observe(target)
    }
    observeWith(0, '默认 rootMargin')
    observeWith(1, '底部扩 100px', { rootMargin: '0px 0px 100px 0px' })
}

function observeResize() {
    const box = document.getElementById('resize-box')
    const roLog = document.getElementById('ro-log')
    const sizes = []

    new ResizeObserver(entries => {
        const cr = entries[0].contentRect
        sizes.push(Math.round(cr.width) + '×' + Math.round(cr.height))
        roLog.textContent = '回调收到的尺寸序列：' + sizes.join(' -> ')
    }).observe(box)

    return box
}

function observeMutation() {
    const host = document.getElementById('mutate-host')
    const records = []
    new MutationObserver(list => records.push(...list)).observe(host, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeOldValue: true,
        characterData: true
    })

    const a = document.createElement('p')
    a.textContent = '第一段'
    a.setAttribute('data-state', 'off')
    host.appendChild(a)

    const b = document.createElement('p')
    b.textContent = '第二段'
    host.appendChild(b)

    a.remove()
    b.setAttribute('data-state', 'on')
    b.firstChild.textContent = '第二段（改过文字）'

    return new Promise(resolve => {
        // MutationObserver 的回调走微任务队列，等一轮就够；这里给两轮以防时序抖动
        setTimeout(() => resolve(records), 0)
        setTimeout(() => resolve(records), 50)
    })
}

async function main() {
    /* ------------------------------------------------ ① IntersectionObserver */
    // 先把占位块高度归零，量出目标元素上方内容的实际高度，再反推出"让目标正好落在折叠线下方 50px"的占位高度
    const spacer = document.getElementById('spacer')
    const target = document.getElementById('below-fold')
    spacer.style.height = '0px'
    const above = target.getBoundingClientRect().top
    spacer.style.height = Math.max(0, window.innerHeight + 50 - above) + 'px'
    observeIntersection()

    const top = Math.round(target.getBoundingClientRect().top)
    const vh = window.innerHeight
    log('① 视口高 ' + vh + 'px；目标元素 rect.top = ' + top + 'px，正好在折叠线下方 ' + (top - vh) + 'px')
    log('   默认 rootMargin：判定下边界 = 视口底部 = ' + vh + 'px → ' + (top < vh ? '已进入' : '还没进入'))
    log(
        '   rootMargin 底部扩 100px：判定下边界 = ' +
            (vh + 100) +
            'px → ' +
            (top < vh + 100 ? '已进入（虽然还看不见）' : '还没进入')
    )

    /* ------------------------------------------------ ② ResizeObserver */
    const box = observeResize()
    await sleep(100)
    const sizeOf = () => Math.round(box.getBoundingClientRect().width) + '×' + Math.round(box.getBoundingClientRect().height)
    log('② #resize-box 初始：' + sizeOf())
    box.style.width = '320px'
    await sleep(100)
    log('   改成 width:320px 之后：' + sizeOf())
    box.style.height = '60px'
    await sleep(100)
    log('   再改成 height:60px 之后：' + sizeOf() + '（只动高度也会触发一次回调）')

    /* ------------------------------------------------ ③ MutationObserver */
    const records = await observeMutation()
    const byType = records.reduce((acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1
        return acc
    }, {})
    log('③ MutationObserver 收到 ' + records.length + ' 条记录：' + JSON.stringify(byType))
    log('   每条都带"改了哪、改前是什么"：' + records.map(r => r.type).join(' / '))

    /* ------------------------------------------------ 回调实际输出汇总 */
    // 到这一步，真实浏览器里的 IO / RO 回调早已投递；无头环境不产生渲染帧，所以只能是占位文本
    const state = el => {
        const text = document.getElementById(el).textContent
        return text.startsWith('等待回调') ? '（本例需要在真实浏览器窗口里打开才看得到，无头环境不投递回调）' : text
    }
    log('')
    log('① 回调输出：' + state('io-log'))
    log('② 回调输出：' + state('ro-log'))

    document.getElementById('probe').textContent = lines.join('\n')
}

main()
