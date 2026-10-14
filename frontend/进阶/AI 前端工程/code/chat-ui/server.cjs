// server.cjs — 流式对话 UI 的后端：静态托管 public/ + POST /api/chat SSE 流式应答
// 双模式：.env 里有 DEEPSEEK_API_KEY 就转发真实 DeepSeek（stream:true，SSE 原样透传）；
// 没有 key 则回退本地 mock（逐 token 推一段含代码块的固定回复，正好验证前端半开 fence 守卫）。
'use strict'
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

// 极简 .env 读取（零依赖）
const envPath = path.join(__dirname, '.env')
let API_KEY = process.env.DEEPSEEK_API_KEY || ''
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*DEEPSEEK_API_KEY\s*=\s*(\S+)\s*$/)
    if (m && !m[1].startsWith('粘贴')) API_KEY = m[1]
  }
}
const PORT = process.env.PORT || 3121
const MOCK_REPLY = [
  '收到！流式回复是这样一段一段推过来的。',
  '下面是一段代码示例：\n\n```js\nconst reader = res.body.getReader()\nwhile (true) {\n  const { done, value } = await reader.read()\n  if (done) break\n}\n```',
  '\n\n代码块闭合之后，这段话应该恢复正常渲染。'
].join('')

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' }

function serveStatic(req, res) {
  const urlPath = req.url === '/' ? '/index.html' : req.url
  const file = path.join(__dirname, 'public', path.normalize(urlPath).replace(/^([.][.][/\\])+/, ''))
  if (!file.startsWith(path.join(__dirname, 'public')) || !fs.existsSync(file)) {
    res.writeHead(404).end('not found')
    return
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
}

function sseHead(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })
}

// SSE 事件帧：OpenAI chunk 格式
function frame(content, finished = false) {
  const body = JSON.stringify({
    choices: [{ delta: content == null ? {} : { content }, finish_reason: finished ? 'stop' : null }],
  })
  return `data: ${body}\n\n`
}

// mock 模式：把固定回复切成 3~6 字符的 token，间隔推送（真实感）
function mockStream(res) {
  sseHead(res)
  let i = 0
  const timer = setInterval(() => {
    if (i >= MOCK_REPLY.length) {
      clearInterval(timer)
      res.write(frame(null, true))
      res.write('data: [DONE]\n\n')
      res.end()
      return
    }
    res.write(frame(MOCK_REPLY.slice(i, i + 4)))
    i += 4
  }, 40)
}

// 真实模式：转发 DeepSeek，上游 SSE 原样透传（含 [DONE]）
async function deepseekStream(req, res) {
  let raw = ''
  for await (const chunk of req) raw += chunk
  let messages
  try {
    messages = JSON.parse(raw).messages
  } catch {
    res.writeHead(400).end('bad json')
    return
  }
  const upstream = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ model: 'deepseek-chat', messages, stream: true }),
  })
  if (!upstream.ok) {
    res.writeHead(upstream.status, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end(`upstream ${upstream.status}: ${(await upstream.text()).slice(0, 300)}`)
    return
  }
  sseHead(res)
  const reader = upstream.body.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    res.write(value)
  }
  res.end()
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/chat') {
    if (API_KEY) {
      deepseekStream(req, res).catch(e => {
        if (!res.headersSent) res.writeHead(502)
        res.end('upstream error: ' + e.message)
      })
    } else {
      mockStream(res)
    }
    return
  }
  serveStatic(req, res)
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`chat-ui server on http://127.0.0.1:${PORT}  mode=${API_KEY ? 'deepseek(真实)' : 'mock(无 key)'}`)
})
