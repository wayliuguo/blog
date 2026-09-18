/**
 * 预览页：把 demos 的编译结果 + 实际的渲染效果放在一页里看
 * 启动：npm start （或 node server.js）
 * 访问：http://localhost:5185/
 *
 * 页面是每次请求时现编译生成的，没有构建产物，改完 demos 刷新即可。
 * 端口被占用会自动 +1 重试（最多 20 个），实际端口以启动日志为准
 */
const http = require('http')
const { run } = require('./mini/run-demos')

const PORT = 5185

const esc = s =>
    String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

const STYLE = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
body {
    margin: 0; padding: 32px 24px 64px; background: #f6f7f9; color: #1f2329;
    font: 14px/1.7 -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
}
main { max-width: 960px; margin: 0 auto; }
h1 { font-size: 22px; margin: 0 0 8px; }
h2 { font-size: 16px; margin: 36px 0 12px; padding-bottom: 6px; border-bottom: 1px solid #e5e6eb; }
p.lead { color: #4e5969; margin: 0 0 4px; }
code { background: #eef0f3; border-radius: 3px; padding: 1px 4px; font-size: 12.5px; }
.files { color: #86909c; font-size: 12.5px; margin: 0 0 12px; }
.case { background: #fff; border: 1px solid #e5e6eb; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; }
.case > .label { font-weight: 600; color: #165dff; margin-bottom: 8px; }
.cols { display: flex; gap: 12px; flex-wrap: wrap; }
.col { flex: 1 1 320px; min-width: 0; }
.col > .cap { color: #86909c; font-size: 12px; margin-bottom: 4px; }
pre {
    margin: 0; padding: 10px 12px; background: #f2f3f5; border-radius: 6px;
    overflow-x: auto; font: 12.5px/1.6 Consolas, Menlo, monospace; white-space: pre-wrap; word-break: break-all;
}
.preview { border: 1px dashed #c9cdd4; border-radius: 6px; padding: 10px 12px; background: #fff; }
.warn { color: #d97706; font-size: 12.5px; margin-top: 8px; }
.err { color: #d92b2b; font-size: 12.5px; margin-top: 8px; }
table { border-collapse: collapse; background: #fff; border: 1px solid #e5e6eb; border-radius: 8px; overflow: hidden; }
th, td { border-bottom: 1px solid #f0f1f3; padding: 6px 12px; text-align: left; font-size: 13px; }
th { background: #f7f8fa; font-weight: 600; }
tr:last-child td { border-bottom: none; }
.tip { color: #4e5969; margin: 8px 0 0; }
`

function renderCase(c) {
    const title = c.label ? `<div class="label">${esc(c.label)}</div>` : ''
    const warn = c.warnings.map(w => `<div class="warn">[warn] 第 ${w.line} 行 ${esc(w.message)}</div>`).join('')
    const err = c.error ? `<div class="err">${esc(c.error)}</div>` : ''
    const body = c.error
        ? `<div class="cols"><div class="col"><div class="cap">WXML 源码</div><pre>${esc(c.source)}</pre></div></div>${err}`
        : `<div class="cols">
            <div class="col"><div class="cap">WXML 源码</div><pre>${esc(c.source)}</pre></div>
            <div class="col"><div class="cap">编译产物 / 渲染效果</div><pre>${esc(c.output)}</pre>
                <div class="preview">${c.output}</div></div>
        </div>${warn}`
    return `<div class="case">${title}${body}</div>`
}

function renderSection(section) {
    const files = `<p class="files">源码：${section.files.map(f => `<code>${esc(f)}</code>`).join(' · ')}</p>`
    let body = section.cases.map(renderCase).join('')

    if (section.table) {
        const { widths, rows, width, converted } = section.table
        const head = `<tr><th>机型</th><th>屏宽</th>${rows.map(r => `<th>${r.rpx}rpx</th>`).join('')}</tr>`
        const lines = widths
            .map(
                w =>
                    `<tr><td>${esc(w.name)}</td><td>${w.width}</td>${rows
                        .map(r => `<td>${r.px[widths.indexOf(w)].value}px</td>`)
                        .join('')}</tr>`
            )
            .join('')
        body += `<table>${head}${lines}</table>
            <p class="tip">${width} 屏宽下整份 WXSS 换算结果：</p><pre>${esc(converted)}</pre>`
    }

    if (section.selectors) {
        const lines = section.selectors.length
            ? section.selectors.map(s => `<div class="warn">[out] 第 ${s.line} 行 ${esc(s.selector)} 不在 WXSS 支持的选择器清单内</div>`).join('')
            : '<p class="tip">全部在清单内</p>'
        body += lines
    }

    return `<h2>${esc(section.title)}</h2>${files}${body}`
}

const server = http.createServer((req, res) => {
    if (req.url.split('?')[0] !== '/') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        return res.end('Not Found')
    }
    const page = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>小程序语法 · 迷你编译器预览</title><style>${STYLE}</style></head>
<body><main>
<h1>小程序语法 · 迷你编译器预览</h1>
<p class="lead">下面每一段都是 demos/ 里的真实源码，由 <code>mini/</code> 现场编译。</p>
<p class="lead">它只覆盖文中讨论的几条规则（{{ }} 表达式、wx:if / wx:elif / wx:else、wx:for 与 wx:key、hidden、rpx）。
真机上这些规则由微信的 WXML / WXSS 编译器实现，这里的作用是让「写法 → 产物」可对照。</p>
${run().map(renderSection).join('')}
</main></body></html>`
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
    res.end(page)
})

// 端口被占用时自动 +1 重试（最多 20 个），实际端口以启动日志为准
function listen(port, tries = 0) {
    server.removeAllListeners('error')
    server.on('error', (err) => {
        if (err.code !== 'EADDRINUSE' || tries >= 20) throw err
        console.log(`  端口 ${port} 被占用，自动改用 ${port + 1}`)
        listen(port + 1, tries + 1)
    })
    server.listen(port, () => {
        if (port !== PORT) console.log(`  文档里的默认端口是 ${PORT}，现在实际跑在 ${port}，请以这里的为准`)
        console.log(`小程序语法预览 -> http://localhost:${port}/`)
    })
}
listen(PORT)
