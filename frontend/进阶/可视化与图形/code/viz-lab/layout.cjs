// 饼图布局：值数组 → 弧段（startAngle/endAngle，单位弧度）
function pie(values, { startAngle = 0, endAngle = Math.PI * 2 } = {}) {
    const total = values.reduce((s, v) => s + v, 0)
    const span = endAngle - startAngle
    let a = startAngle
    return values.map(v => {
        const angle = (v / total) * span // 值占比 → 角度占比
        const arc = { value: v, startAngle: a, endAngle: a + angle }
        a += angle
        return arc
    })
}

// 堆叠布局：多系列数据 → 每条数据的 y0/y1 区间（堆叠柱状图 / 面积图的地基）
function stack(rows, keys) {
    return rows.map(row => {
        let y0 = 0
        const parts = {}
        for (const k of keys) {
            parts[k] = { y0, y1: y0 + row[k] }
            y0 = parts[k].y1 // 上一段的顶端就是下一段的底端
        }
        return { label: row.label, ...parts }
    })
}

module.exports = { pie, stack }
