/**
 * 输出格式化：带中英混排对齐的表格与单位换算
 * 中文字符占 2 列宽，直接用 padEnd 会错位，所以自己算显示宽度
 */
const WIDE = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe6f\uff00-\uff60\uffe0-\uffe6]/

export function width(text) {
    let n = 0
    for (const ch of String(text)) n += WIDE.test(ch) ? 2 : 1
    return n
}

export function pad(text, len, align = 'left') {
    const s = String(text)
    const gap = len - width(s)
    if (gap <= 0) return s
    return align === 'right' ? ' '.repeat(gap) + s : s + ' '.repeat(gap)
}

/** 打印一张对齐的表，首行为表头 */
export function table(head, rows) {
    const all = [head, ...rows].map((r) => r.map((c) => String(c)))
    const widths = head.map((_, i) => Math.max(...all.map((r) => width(r[i] ?? ''))))
    const line = (r) => '| ' + r.map((c, i) => pad(c ?? '', widths[i])).join(' | ') + ' |'
    const sep = '|' + widths.map((n) => '-'.repeat(n + 2)).join('|') + '|'
    return [line(head), sep, ...rows.map(line)].join('\n')
}

export const ms = (v) => (v == null ? '—' : `${Math.round(v)} ms`)
export const num = (v, digits = 1) => (v == null ? '—' : Number(v).toFixed(digits))
export const pct = (v, digits = 1) => (v == null ? '—' : `${(v * 100).toFixed(digits)}%`)

export function median(list) {
    const a = [...list].sort((x, y) => x - y)
    if (!a.length) return null
    const mid = a.length >> 1
    return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2
}

export const title = (text) => `\n${'='.repeat(64)}\n${text}\n${'='.repeat(64)}`
export const section = (text) => `\n---- ${text} ----`
