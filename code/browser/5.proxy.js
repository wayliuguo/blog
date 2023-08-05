var express = require('express')
var { createProxyMiddleware } = require('http-proxy-middleware')
var app = express()
app.use(
    '/',
    createProxyMiddleware({
        // 代理跨域目标接口
        target: 'http://localhost:8080',
        changeOrigin: true,
        // 修改响应头信息，实现跨域并允许带cookie
        onProxyRes: function (proxyRes, req, res) {
            res.header('Access-Control-Allow-Origin', 'http://localhost:8080')
            res.header('Access-Control-Allow-Credentials', 'true')
        },
        // 修改响应信息中的cookie域名
        cookieDomainRewrite: 'http://localhost:8080' // 可以为false，表示不修改
    })
)
app.listen(3000)
console.log('Proxy server is listen at port 3000...')
