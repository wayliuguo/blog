/**
 * 场景：前端安全里能实测的那部分——SRI、CSP 判定、安全响应头
 * 运行：npm run security
 *
 * 三件事：
 *   1. 子资源完整性：算出脚本的 sha384，改一个字节立刻对不上
 *   2. 拿真实响应的 CSP 策略跑一遍判定：哪些资源会被拦
 *   3. 安全响应头体检：一个页面该带哪些头、缺了会怎样
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { startHttp1, table, title, section } from '../harness/index.mjs'

const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site')
const sri = (buf, algo = 'sha384') => `${algo}-${crypto.createHash(algo).update(buf).digest('base64')}`

/** 一个最小 CSP 判定器：按指令取值顺序决定 allow / block */
function allows(policy, candidate) {
    const directives = new Map()
    for (const part of policy.split(';')) {
        const [name, ...values] = part.trim().split(/\s+/)
        if (name) directives.set(name, values)
    }
    const values = directives.get(candidate.directive) || directives.get('default-src') || []
    const via = directives.has(candidate.directive) ? candidate.directive : 'default-src'

    if (candidate.type === 'inline') {
        if (candidate.nonce && values.some(v => v === `'nonce-${candidate.nonce}'`)) {
            return { allow: true, via, why: 'nonce 匹配' }
        }
        if (values.includes("'unsafe-inline'")) return { allow: true, via, why: "'unsafe-inline'" }
        return { allow: false, via, why: '没有 nonce，也没有 unsafe-inline' }
    }
    if (candidate.type === 'eval') {
        return values.includes("'unsafe-eval'")
            ? { allow: true, via, why: "'unsafe-eval'" }
            : { allow: false, via, why: '默认禁止 eval / new Function' }
    }
    const url = new URL(candidate.url)
    if (values.includes('*')) return { allow: true, via, why: '通配 *' }
    if (values.includes("'self'") && url.origin === candidate.origin) return { allow: true, via, why: "'self'" }
    const host = values.find(v => v.startsWith('http') && new URL(v).host === url.host)
    if (host) return { allow: true, via, why: `源 ${host}` }
    return { allow: false, via, why: '不在允许的来源清单里' }
}

const SECURITY_HEADERS = [
    ['Content-Security-Policy', '限制能加载/执行哪些资源，是 XSS 的第二道闸'],
    ['Strict-Transport-Security', '强制后续访问走 HTTPS，防降级与 Cookie 劫持'],
    ['X-Content-Type-Options', 'nosniff，禁止浏览器猜类型，防上传文件被当脚本执行'],
    ['Referrer-Policy', '控制 Referer 带多少信息出去，防内网地址泄露'],
    ['X-Frame-Options', '禁止被 iframe 嵌套，防点击劫持（CSP frame-ancestors 的旧写法）']
]

export default async function run() {
    // —— 1. SRI
    const original = fs.readFileSync(path.join(SITE, 'vendor.js'))
    const tampered = Buffer.concat([original, Buffer.from("\nconsole.log('additional payload')\n")])
    console.log(title('子资源完整性：同一个文件被改一个字节'))
    console.log(
        table(
            ['脚本', 'sha384', 'sha512'],
            [
                ['site/vendor.js', sri(original).slice(0, 28) + '…', sri(original, 'sha512').slice(0, 28) + '…'],
                ['被追加一段代码后', sri(tampered).slice(0, 28) + '…', sri(tampered, 'sha512').slice(0, 28) + '…']
            ]
        )
    )
    console.log(section('浏览器是怎么用它的'))
    console.log(`- 页面写 integrity="${sri(original)}"，浏览器下载完先算哈希，对不上就整块丢弃、不执行`)
    console.log(`- 追加一个字节后哈希是 ${sri(tampered)}，两串完全不同——哈希对不上就是 CDN 被篡改或被中间人换了内容`)
    console.log('- SRI 必须配 crossorigin：跨域脚本不带 CORS 响应头，浏览器拿不到可校验的响应体')

    // —— 2. CSP：拿真实响应的策略做判定
    const h1 = await startHttp1()
    const base = `http://127.0.0.1:${h1.port}`
    try {
        const res = await fetch(`${base}/site/security.html`)
        const page = await res.text()
        const policy = res.headers.get('content-security-policy')
        const nonce = (policy.match(/'nonce-([^']+)'/) || [])[1]

        console.log(title('这个页面实际拿到的 CSP'))
        console.log(policy.replaceAll('; ', ';\n  '))

        const candidates = [
            { label: '内联 <script>（带 nonce）', directive: 'script-src', type: 'inline', nonce },
            { label: '内联 <script>（没带 nonce）', directive: 'script-src', type: 'inline', nonce: null },
            { label: '页面里的 onclick="…"', directive: 'script-src', type: 'inline', nonce: null },
            { label: 'eval / new Function', directive: 'script-src', type: 'eval' },
            {
                label: '第三方 CDN 的脚本',
                directive: 'script-src',
                type: 'url',
                url: 'https://cdn.example.com/app.js',
                origin: base
            },
            {
                label: '同源脚本 vendor.js',
                directive: 'script-src',
                type: 'url',
                url: `${base}/site/vendor.js`,
                origin: base
            },
            {
                label: '第三方 CDN 的图片',
                directive: 'img-src',
                type: 'url',
                url: 'https://img.example.com/a.png',
                origin: base
            }
        ]
        console.log(title('同一份策略下的判定结果'))
        console.log(
            table(
                ['要加载的东西', '命中指令', '判定', '依据'],
                candidates.map(c => {
                    const r = allows(policy, c)
                    return [c.label, r.via, r.allow ? '允许' : '拦截', r.why]
                })
            )
        )
        console.log(section('这条策略挡住了什么'))
        console.log('- 内联脚本必须有 nonce，`onclick="…"` 这种属性写法与 innerHTML 注入的脚本都会被执行拦截')
        console.log('- 所有脚本只能来自同源，第三方 CDN 脚本直接拦掉——真要放行就写死域名，别用 `*`')
        console.log('- 图片放行了 `data:` 与 img.example.com 这一个域名：来源清单是白名单，不是「外链一律禁止」')
        console.log("- `object-src 'none'` 关掉插件入口，`base-uri 'self'` 防 `<base>` 被改写劫持相对路径")
        console.log('- 页面里那段没有 nonce 的内联脚本：在 DevTools Console 会看到一条 CSP 违规报错，脚本不会执行')
        console.log(`- 本次页面注入的 nonce 是 ${nonce}（每次请求都换），攻击者猜不到，所以注入的脚本过不了这道闸`)

        // —— 3. 安全响应头体检
        const audit = SECURITY_HEADERS.map(([name, why]) => {
            const value = res.headers.get(name)
            const short = name === 'Content-Security-Policy' ? value.split(';')[0] + '; …' : value
            return [name, value ? short : '缺失', value ? '已设' : '未设', why]
        })
        console.log(title('安全响应头体检（对 site/security.html 的真实响应）'))
        console.log(table(['头部', '值', '状态', '作用'], audit))

        const pageHasInline = /<script(?![^>]*nonce)/.test(page)
        console.log(section('还要注意的两件事'))
        console.log(`- 页面里确实存在没有 nonce 的内联脚本：${pageHasInline}`)
        console.log('- sourcemap 泄露：构建产物里 `//# sourceMappingURL=` 指向的 .map 文件一旦跟着上线，等于公开源码')
        console.log('- 依赖供应链：package.json 里的每一个包都能执行 postinstall，锁文件 + 审计 + 私服代理才算有控制')
    } finally {
        h1.close()
    }
}
