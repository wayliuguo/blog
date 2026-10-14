// src/html.ts —— HTML 模板组装：SSR 字符串 + 注水数据 + 客户端入口（与 mini-next 同构思路）
export function renderHtml(root, props, entry) {
    const payload = JSON.stringify(props).replace(/</g, '\\u003c')
    return `<!doctype html>
<html><body><div id="root">${root}</div>
<script>window.__PROPS__=${payload}</script>
<script src="${entry}"></script></body></html>`
}
