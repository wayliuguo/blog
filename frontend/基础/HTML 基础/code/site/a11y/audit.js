/**
 * 无障碍审查：把"肉眼看不出来"的问题跑成可核对的输出
 *
 * 页面里有两块内容：一块故意写坏（#bad-zone），一块是改对之后的版本（#good-zone）。
 * 脚本对两块跑同一套检查，给出对比。
 *
 * 这些检查是在页面里自己实现的简化版：
 *   对比度按 WCAG 相对亮度公式算，是精确值；
 *   "可访问名"只按 文本 / aria-label / aria-labelledby / title / 内部 img 的 alt 拼，是简化版。
 * 浏览器自己算的 role 与 name 要用 CDP 的 Accessibility 域读（见本篇《配套代码》里的命令）。
 */
const lines = []
const log = line => lines.push(line)

const zone = id => document.getElementById(id)
const flat = el => (el.textContent || '').replace(/\s+/g, ' ').trim()

/* ------------------------------------------------------------------ 可访问名（简化版） */
function accessibleName(el) {
    const ariaLabel = el.getAttribute('aria-label')
    if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim()
    const labelledBy = el.getAttribute('aria-labelledby')
    if (labelledBy) {
        const target = document.getElementById(labelledBy)
        if (target) return flat(target)
    }
    const own = flat(el)
    if (own) return own
    const img = el.querySelector('img[alt]')
    if (img && img.getAttribute('alt').trim()) return img.getAttribute('alt').trim()
    const title = el.getAttribute('title')
    return title ? title.trim() : ''
}

/* ------------------------------------------------------------------ 对比度（WCAG 公式，精确） */
const toLinear = c => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}
const luminance = rgb => 0.2126 * toLinear(rgb[0]) + 0.7152 * toLinear(rgb[1]) + 0.0722 * toLinear(rgb[2])

function parseColor(value) {
    const m = String(value).match(/rgba?\(([^)]+)\)/)
    if (!m) return null
    const parts = m[1].split(',').map(s => parseFloat(s))
    return { rgb: parts.slice(0, 3), alpha: parts.length > 3 ? parts[3] : 1 }
}

/** 对比度 = (亮色 + 0.05) / (暗色 + 0.05)，正文要求 ≥ 4.5:1 */
function contrastRatio(fg, bg) {
    const sorted = [luminance(fg), luminance(bg)].sort((a, b) => b - a)
    return (sorted[0] + 0.05) / (sorted[1] + 0.05)
}

/** 元素的有效背景色：自己是透明的就往上找祖先，直到找到不透明的为止 */
function effectiveBackground(el) {
    let node = el
    while (node && node !== document.documentElement) {
        const c = parseColor(getComputedStyle(node).backgroundColor)
        if (c && c.alpha > 0) return c.rgb
        node = node.parentElement
    }
    return [255, 255, 255]
}

/* ------------------------------------------------------------------ 各项检查 */
const checkImages = root => {
    const imgs = [...root.querySelectorAll('img')]
    return { total: imgs.length, missingAlt: imgs.filter(i => i.getAttribute('alt') === null).length }
}

const checkLabels = root => {
    const fields = [...root.querySelectorAll('input:not([type=hidden]), select, textarea')]
    const orphans = fields.filter(el => {
        if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) return false
        if (el.id && root.querySelector('label[for="' + el.id + '"]')) return false
        return !el.closest('label')
    })
    return { total: fields.length, noLabel: orphans.length }
}

const checkButtonNames = root => {
    const btns = [...root.querySelectorAll('button, [role=button]')]
    return { total: btns.length, anonymous: btns.filter(b => !accessibleName(b)).length }
}

/** 标题层级只能一级一级往下走，h2 直接跳到 h4 会让读屏用户失去结构感 */
const checkHeadings = root => {
    const hs = [...root.querySelectorAll('h1, h2, h3, h4, h5, h6')]
    const skips = []
    let prev = 0
    for (const h of hs) {
        const level = Number(h.tagName[1])
        if (prev && level > prev + 1) skips.push('h' + prev + ' -> h' + level + '（' + flat(h).slice(0, 10) + '）')
        prev = level
    }
    return { total: hs.length, skips }
}

/** focus() 对"不可聚焦"的元素是空操作，所以比对 activeElement 就能看出它能不能拿到焦点 */
const checkFocus = id => {
    const el = document.getElementById(id)
    el.focus()
    const focused = document.activeElement === el
    const outline = focused ? getComputedStyle(el).outlineStyle : '(未聚焦)'
    el.blur()
    return { focused, tabIndex: el.tabIndex, outline }
}

const checkContrast = root => {
    const out = []
    for (const el of root.querySelectorAll('*')) {
        if (el.children.length || !flat(el)) continue
        const style = getComputedStyle(el)
        if (style.display === 'none' || style.visibility === 'hidden') continue
        const fg = parseColor(style.color)
        if (!fg) continue
        const ratio = contrastRatio(fg.rgb, effectiveBackground(el))
        out.push({ text: flat(el).slice(0, 14), ratio: Math.round(ratio * 100) / 100, pass: ratio >= 4.5 })
    }
    return out
}

/* ------------------------------------------------------------------ 输出 */
function report(name, root, focusIds) {
    const imgs = checkImages(root)
    const labels = checkLabels(root)
    const btns = checkButtonNames(root)
    const heads = checkHeadings(document)
    const contrasts = checkContrast(root)

    log('【' + name + '】')
    log('  图片 alt：' + imgs.total + ' 张图，缺 alt ' + imgs.missingAlt + ' 张')
    log('  表单关联：' + labels.total + ' 个控件，没有标签 ' + labels.noLabel + ' 个')
    log('  按钮名字：' + btns.total + ' 个按钮，可访问名为空 ' + btns.anonymous + ' 个')
    log(
        '  标题层级：全页共 ' +
            heads.total +
            ' 个标题，跳级 ' +
            heads.skips.length +
            ' 处' +
            (heads.skips.length ? ' → ' + heads.skips.join('、') : '')
    )
    for (const [label, id] of focusIds) {
        const f = checkFocus(id)
        log(
            '  键盘可达（' +
                label +
                '）：focus() 后 activeElement ' +
                (f.focused ? '就是它自己 → 可聚焦' : '仍是 body → 不可聚焦') +
                '，tabIndex = ' +
                f.tabIndex +
                '，聚焦时 outline-style = ' +
                f.outline
        )
    }
    const fails = contrasts.filter(c => !c.pass)
    const lowest = contrasts.reduce((min, c) => Math.min(min, c.ratio), Infinity)
    log(
        '  对比度：检查 ' +
            contrasts.length +
            ' 处文本，不达标 ' +
            fails.length +
            ' 处（最低 ' +
            lowest +
            ':1，正文要求 ≥ 4.5:1）' +
            (fails.length ? ' → ' + fails.map(c => '「' + c.text + '」' + c.ratio + ':1').join('、') : '')
    )
    log('')
}

report('坏例子 #bad-zone', zone('bad-zone'), [
    ['div 假按钮', 'bad-fake-btn'],
    ['链接是否保留焦点轮廓', 'bad-link']
])
report('改对之后 #good-zone', zone('good-zone'), [
    ['真 button', 'good-real-btn'],
    ['链接是否保留焦点轮廓', 'good-link']
])
log('说明：标题层级这一项必须扫全页（层级是整篇文档的结构），所以两块共用同一个结果')

document.getElementById('probe').textContent = lines.join('\n')
