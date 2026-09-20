/**
 * 打印 demos 的编译结果：产物、警告、编译期报错、rpx 换算表、选择器清单核对
 * 运行：npm run render
 */
const { run } = require('./mini/run-demos')

// 中文字符占两个西文字符宽，对齐要按显示宽度算
const wide = s => [...s].reduce((n, ch) => n + (ch.charCodeAt(0) > 0x2e80 ? 2 : 1), 0)
const pad = (s, width) => s + ' '.repeat(Math.max(0, width - wide(s)))

function heading(text) {
    console.log(`\n========== ${text} ==========`)
}

for (const section of run()) {
    heading(section.title)
    console.log(`源码：${section.files.join(' · ')}`)

    for (const c of section.cases) {
        if (c.label) console.log(`\n--- ${c.label}`)
        if (c.error) console.log(c.error)
        else console.log(c.output)
        for (const w of c.warnings) console.log(`[warn] 第 ${w.line} 行 ${w.message}`)
    }

    if (section.table) {
        const nameWidth = Math.max(...section.table.widths.map(w => wide(w.name))) + 2
        console.log(
            pad('机型', nameWidth) + pad('屏宽', 8) + section.table.rows.map(r => pad(`${r.rpx}rpx`, 11)).join('')
        )
        section.table.widths.forEach((w, i) => {
            console.log(
                pad(w.name, nameWidth) +
                    pad(String(w.width), 8) +
                    section.table.rows.map(r => pad(`${r.px[i].value}px`, 11)).join('')
            )
        })
        console.log(`\n${section.table.width} 屏宽下整份 WXSS 换算结果：`)
        console.log(section.table.converted)
    }

    if (section.selectors) {
        if (section.selectors.length === 0) console.log('全部在清单内')
        for (const s of section.selectors) {
            console.log(`[out] 第 ${s.line} 行 ${s.selector} 不在 WXSS 支持的选择器清单内`)
        }
    }
}
