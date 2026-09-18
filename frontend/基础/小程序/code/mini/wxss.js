/**
 * 迷你 WXSS 处理
 *
 * 两件事：
 *   1. rpx → px 换算。rpx 是响应式像素：规定 750rpx 正好等于屏幕宽度，
 *      所以 px = rpx × 屏幕宽度 / 750。这里按给定屏宽把样式里的 rpx 全部换算出来，
 *      便于看「同一份样式在不同机型上到底是多少 px」。
 *   2. 选择器检查。按官方文档给出的 WXSS 支持清单（.class / #id / element /
 *      element, element / ::after / ::before）逐条核对，清单之外的写法单独列出来。
 *      这是文档层面的 lint，不代表真机的最终行为。
 */

const SUPPORTED_SIMPLE = /^(?:[a-z][\w-]*|\.[\w-]+|#[\w-]+)$/
const PSEUDO = /::(?:after|before)$/

/** rpx → px：750rpx = 屏宽 */
function rpxToPx(rpx, screenWidth) {
    return (rpx * screenWidth) / 750
}

function round(value) {
    return Math.round(value * 10000) / 10000
}

/** 把 CSS 里所有 `Nrpx` 换成 px 文本（注释里的示例不动） */
function convertRpx(css, screenWidth) {
    const parts = css.split(/(\/\*[\s\S]*?\*\/)/)
    return parts
        .map((part, i) =>
            i % 2 ? part : part.replace(/(-?\d*\.?\d+)rpx\b/g, (_, n) => `${round(rpxToPx(Number(n), screenWidth))}px`)
        )
        .join('')
}

/** 按官方清单核对每个选择器，返回清单外的写法 */
function checkSelectors(css) {
    const source = css.replace(/\/\*[\s\S]*?\*\//g, '')
    const bad = []
    const rule = /(?:^|\})\s*([^{}@]+?)\s*\{/g
    let m
    while ((m = rule.exec(source))) {
        const line = source.slice(0, m.index).split('\n').length
        for (const one of m[1].split(',')) {
            const selector = one.trim().replace(/\s+/g, ' ')
            if (!selector) continue
            const parts = selector.split(' ')
            if (PSEUDO.test(selector)) {
                const head = selector.replace(PSEUDO, '')
                if (head === '' || SUPPORTED_SIMPLE.test(head)) continue
            }
            if (parts.length && parts.every(p => SUPPORTED_SIMPLE.test(p))) continue
            bad.push({ line, selector })
        }
    }
    return bad
}

/** rpx 换算表：几个常见机型的屏宽 */
function table(rpxValues, widths) {
    const widths_ = widths || [
        { name: 'iPhone SE · 320', width: 320 },
        { name: 'iPhone 8 · 375', width: 375 },
        { name: 'iPhone 14 · 390', width: 390 },
        { name: 'iPhone 14 Pro Max · 430', width: 430 }
    ]
    const rows = rpxValues.map(rpx => ({
        rpx,
        px: widths_.map(w => ({ name: w.name, value: round(rpxToPx(rpx, w.width)) }))
    }))
    return { widths: widths_, rows }
}

module.exports = { rpxToPx, convertRpx, checkSelectors, table }
