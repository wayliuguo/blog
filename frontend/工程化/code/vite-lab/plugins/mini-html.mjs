// 手写 HTML 收尾插件：给首屏依赖补 modulepreload、给脚本加 CSP nonce
//
// apply: 'build' —— 只在 vite build 时加载，dev 完全不加载
// order: 'post'  —— 排在其它 HTML 变换之后，保证看到的是最终产物
export default function miniHtml(options = {}) {
    const nonce = options.nonce || 'lab-nonce'

    return {
        name: 'mini-html',
        apply: 'build',

        transformIndexHtml: {
            order: 'post',
            handler(html, ctx) {
                // ctx.bundle 只有构建期才有：里面是"文件名 → 产物"的映射
                const entry = Object.values(ctx.bundle).find(o => o.type === 'chunk' && o.isEntry)

                // Vite 默认已经注入过 modulepreload，不查重就会让同一个 chunk 被请求两次
                const deps = entry?.imports || []
                const missing = deps.filter(f => !html.includes(`href="/${f}"`))
                const preloads = missing
                    .map(f => `<link rel="modulepreload" href="/${f}" nonce="${nonce}">`)
                    .join('\n    ')

                const withNonce = html.replace(/<script /g, `<script nonce="${nonce}" `)
                console.log(
                    `  [mini-html] 入口依赖 ${deps.length} 条，Vite 已注入 ${deps.length - missing.length} 条，补 ${
                        missing.length
                    } 条；脚本加 nonce="${nonce}"`
                )

                return preloads ? withNonce.replace('</head>', `    ${preloads}\n  </head>`) : withNonce
            }
        }
    }
}
