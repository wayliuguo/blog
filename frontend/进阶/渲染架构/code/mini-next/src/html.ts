// src/html.ts —— HTML 模板组装：SSR 字符串 + 注水数据 + 客户端入口
export function renderHtml(root: string, props: unknown, entry: string): string {
    // props 里的 < 转义成 \u003c，防止 JSON 里出现 </script> 提前闭合标签
    const payload = JSON.stringify(props).replace(/</g, '\\u003c')
    return `<!doctype html>
<html><body><div id="root">${root}</div>
<script>window.__PROPS__=${payload}</script>
<script src="${entry}"></script></body></html>`
}
