const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
/** 替换元素：有尺寸就算内容，不需要文字 */
const REPLACED = new Set([
    'img',
    'svg',
    'canvas',
    'video',
    'iframe',
    'picture',
    'input',
    'button',
    'textarea',
    'select'
])
const IGNORED = new Set(['script', 'style', 'link', 'meta', 'title', 'head'])
// 输入：插件配置（容器选择器 / 采样参数 / 骨架屏豁免）
// 输出：白屏插件（米字 33 点采样 + 空白占比判定 + 二次复检）
// 过程：initialDelay 后首采 → 命中白屏则 recheckDelay 后复检 → 仍空白才上报，并附 recent 上下文
// 偏置：阈值刻意设高（默认 0.9），主动偏向漏报——误报会摧毁白屏指标的可信度
export function createWhiteScreenPlugin(options) {
    let ctxRef = null
    /** 取第一个有实际尺寸的容器：html 恒在，但可能没有被内容撑开 */
    function pickContainer() {
        for (const selector of options.containerSelectors) {
            const el = document.querySelector(selector)
            if (!el) continue
            const rect = el.getBoundingClientRect()
            if (rect.width >= 100 && rect.height >= 100) return el
        }
        return null
    }
    // 输入：容器矩形
    // 输出：米字采样点（横、竖、两条对角线各 pointsPerLine 个点，去重后 33 个）
    // 过程：四条线按比例取点 → 坐标取整后去重 → 中心点只留一个
    function buildPoints(rect) {
        const padX = rect.width * 0.06
        const padY = rect.height * 0.06
        const left = rect.left + padX
        const right = rect.right - padX
        const top = rect.top + padY
        const bottom = rect.bottom - padY
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        const line = Math.max(3, options.pointsPerLine)
        const unique = new Map()
        const put = (x, y) => unique.set(`${Math.round(x)},${Math.round(y)}`, [x, y])
        for (let i = 0; i < line; i++) {
            const t = i / (line - 1)
            put(left + (right - left) * t, centerY)
            put(centerX, top + (bottom - top) * t)
            put(left + (right - left) * t, top + (bottom - top) * t)
            put(left + (right - left) * t, bottom - (bottom - top) * t)
        }
        return [...unique.values()]
    }
    /** 骨架屏节点沿祖先链都算"空白"：它恰恰是白屏的常见伪装 */
    function isGuarded(el) {
        let node = el
        while (node) {
            if (node.hasAttribute(options.safeAttribute)) return true
            node = node.parentElement
        }
        return false
    }
    // 输入：命中的一个元素
    // 输出：这个元素自身是否有"已绘制的内容"
    // 过程：排除脚本样式/骨架屏/不可见 → 替换元素看尺寸 → 直接文本 → 背景色/背景图/边框/阴影等绘制信号
    // 取舍：只看直接文本会让"白底卡片里的稀疏文字"被判成空白（wrapper 命中时无文本），
    //      所以补上绘制信号。代价是白底空卡片不算白屏——那是数据问题，交给错误与接口监控，白屏只管渲染链路
    function ownContent(el) {
        const tag = el.tagName.toLowerCase()
        if (IGNORED.has(tag) || isGuarded(el)) return false
        const style = getComputedStyle(el)
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false
        if (REPLACED.has(tag)) {
            const rect = el.getBoundingClientRect()
            return rect.width > 0 && rect.height > 0
        }
        for (const node of Array.from(el.childNodes)) {
            if (node.nodeType === 3 && (node.textContent || '').trim().length > 0) return true
        }
        // 绘制信号：背景、边框、阴影任一存在，说明这块区域已经渲染出来了，不是"白屏"
        if (style.backgroundImage !== 'none') return true
        if (style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent') return true
        if (style.boxShadow !== 'none') return true
        return (
            style.borderTopWidth !== '0px' ||
            style.borderRightWidth !== '0px' ||
            style.borderBottomWidth !== '0px' ||
            style.borderLeftWidth !== '0px'
        )
    }
    // 输入：采样点命中的一个元素 + 本轮采样的缓存
    // 输出：它是不是"有效内容"
    // 过程：同一个元素会被多个采样点命中，按元素缓存 getComputedStyle 的结果，避免 33 点重复计算
    function hasContent(el, cache) {
        const cached = cache.get(el)
        if (cached !== undefined) return cached
        const result = ownContent(el)
        cache.set(el, result)
        return result
    }
    // 输入：无
    // 输出：一次采样的结论
    // 过程：选容器 → 生成 33 个米字点 → elementsFromPoint 逐点判内容 → 空白占比超阈值即疑似白屏
    function sample() {
        const container = pickContainer()
        if (!container) return { blank: false, ratio: 0, blankPoints: 0, totalPoints: 0, container: '' }
        const points = buildPoints(container.getBoundingClientRect())
        const cache = new Map()
        let blankPoints = 0
        for (const [x, y] of points) {
            let content = false
            for (const el of Array.from(document.elementsFromPoint(x, y))) {
                if (el !== container && container.contains(el) && hasContent(el, cache)) {
                    content = true
                    break
                }
            }
            if (!content) blankPoints += 1
        }
        const ratio = points.length ? blankPoints / points.length : 0
        return {
            blank: ratio > options.blankRatio,
            ratio: Math.round(ratio * 100) / 100,
            blankPoints,
            totalPoints: points.length,
            container: container.id ? `#${container.id}` : container.tagName.toLowerCase()
        }
    }
    // 输入：采样结论 + 当前阶段（initial / recheck）
    // 输出：一条带上下文的 white-screen 事件
    // 过程：事件 data 附 errors/resources/requests/routes 快照——白屏从来不是孤立现象
    function report(ctx, result, stage) {
        const recent = ctx.context.recent
        ctx.emit({
            type: 'white-screen',
            subtype: stage,
            message: `疑似白屏：空白点 ${result.blankPoints}/${result.totalPoints}（${Math.round(
                result.ratio * 100
            )}%）`,
            data: {
                container: result.container,
                ratio: result.ratio,
                blank: result.blankPoints,
                total: result.totalPoints,
                stage,
                // 白屏从来不是孤立现象：把最近的错误、失败资源、失败请求一起带上去
                recent: {
                    errors: recent.errors.slice(),
                    resources: recent.resources.slice(),
                    requests: recent.requests.slice(),
                    routes: recent.routes.slice()
                }
            }
        })
    }
    // 输入：检测阶段
    // 输出：最终结论
    // 过程：首采命中 → 等 recheckDelay 再采一次（首屏渲染慢会误判）→ 仍空白才上报
    async function detect(stage) {
        const first = sample()
        if (!first.blank) return first
        const ctx = ctxRef
        if (!ctx) return first
        if (stage === 'manual') {
            report(ctx, first, 'manual')
            return first
        }
        await sleep(options.recheckDelay)
        const again = sample()
        if (again.blank) report(ctx, again, 'recheck')
        return again
    }
    return {
        name: 'white-screen',
        setup(ctx) {
            ctxRef = ctx
            const run = () => {
                void detect('first')
            }
            const onLoad = () => window.setTimeout(run, options.initialDelay)
            if (document.readyState === 'complete') onLoad()
            else window.addEventListener('load', onLoad, { once: true })
            const offRoute = options.onRouteChange
                ? ctx.onRouteChange(() => window.setTimeout(run, options.initialDelay))
                : () => undefined
            return () => {
                window.removeEventListener('load', onLoad)
                offRoute()
                ctxRef = null
            }
        },
        check(stage = 'manual') {
            return detect(stage)
        }
    }
}
