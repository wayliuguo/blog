// 往 HTML 里插一段内容。
//
// 演示 transformIndexHtml：build 侧它拿到的 ctx 带 bundle（已生成的产物），
// 所以插件既能改 HTML，也能按产物内容做处理。真实 Vite 在 dev 侧还会传 server——
// 同一个钩子两端入参不同，写插件时不能想当然只按一端处理。
export function miniHtml() {
    return {
        name: 'mini-html',
        transformIndexHtml(html, ctx) {
            console.log(`  [mini-html] transformIndexHtml：ctx.bundle=${!!ctx.bundle}`)
            return html.replace('</head>', '  <!-- injected by mini-html -->\n  </head>')
        }
    }
}
