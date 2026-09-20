// viz-bench 服务：静态托管 index.html，接收页面 POST 回来的帧率报告
// 零依赖（Node 内置模块）。benchmark 脚本通过轮询 .last-report.json 拿到结果。
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

const PORT = 5193
const ROOT = __dirname
const REPORT = path.join(ROOT, '.last-report.json')

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' }

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/report') {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      try {
        const data = JSON.parse(body)
        fs.writeFileSync(REPORT, JSON.stringify(data))
      } catch (e) {}
      res.writeHead(200, { 'Content-Type': 'text/plain' }).end('ok')
    })
    return
  }
  let name = req.url.split('?')[0]
  if (name === '/' || name === '') name = '/index.html'
  const file = path.join(ROOT, name)
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404).end('Not Found')
    return
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'text/plain' })
  res.end(fs.readFileSync(file))
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`viz-bench server on http://127.0.0.1:${PORT}/`)
})
