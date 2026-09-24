/**
 * 极简 SVG 折线图渲染（零依赖）：输入一列数值，产出一段可以直接 innerHTML 的 SVG 字符串。
 * 仪表盘的「分区走势卡」用它画迷你趋势图 —— 它是 Dashboard 路由的真实依赖，
 * 也就因此是路由级代码分割收益的一部分（它有多大 × 上首屏概率多低，见实战篇构建层一节）。
 */

/** 数值序列 → 折线 path 的 d 属性（带 0.5 像素对齐，线宽 1 时更锐） */
export function linePath(data, w, h, pad = 2) {
    if (data.length < 2) return ''
    const min = Math.min(...data)
    const max = Math.max(...data)
    const span = max - min || 1
    const step = (w - pad * 2) / (data.length - 1)
    const y = v => h - pad - ((v - min) / span) * (h - pad * 2)
    return data.map((v, i) => `${i ? 'L' : 'M'}${(pad + i * step).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
}

/** 折线下方的面积 path（同一条线闭到低端），给图加一层淡淡的填充 */
export function areaPath(data, w, h, pad = 2) {
    const line = linePath(data, w, h, pad)
    if (!line) return ''
    const start = line.slice(1, line.indexOf('L'))
    return `${line} L${(w - pad).toFixed(1)},${h - pad} L${start},${h - pad} Z`
}

/** 整张迷你图：<svg> 折线 + 面积 + 最低点标记，直接 innerHTML 进容器 */
export function sparkline(data, { w = 220, h = 56, color = '#4b6ef5' } = {}) {
    const line = linePath(data, w, h)
    const area = areaPath(data, w, h)
    const min = Math.min(...data)
    const dotX = (data.indexOf(min) / (data.length - 1)) * (w - 4) + 2
    return (
        `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">` +
        (area ? `<path d="${area}" fill="${color}" opacity="0.08"/>` : '') +
        `<path d="${line}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/>` +
        `<circle cx="${dotX.toFixed(1)}" cy="${(h - 4).toFixed(1)}" r="2" fill="${color}"/>` +
        '</svg>'
    )
}
