// 往 HTML 里插一段内容。
//
// 演示「同一个钩子，两端入参不同」：transformIndexHtml 在 dev 与 build 都会跑，
// 但 ctx 不一样——dev 侧有 server，build 侧有 bundle。写插件时不能想当然只按一端处理。
export function miniHtml() {
    return {
        name: 'mini-html',
        transformIndexHtml(html, ctx) {
            console.log(`  [mini-html] transformIndexHtml：ctx.server=${!!ctx.server} ctx.bundle=${!!ctx.bundle}`)
            return html.replace('</head>', '  <!-- injected by mini-html -->\n  </head>')
        }
    }
}
