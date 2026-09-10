// 07 SSE（Server-Sent Events）完整示例，单文件即可跑通
// 服务端用 text/event-stream 持续推送；启动后本文件自动作为客户端用 fetch 读取流并打印
// 这是 Agent 应用“流式输出”的原型：一条长连接，服务端不断推 data
const http = require('node:http');

const server = http.createServer((req, res) => {
  if (req.url === '/stream') {
    // SSE 的三个固定响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    let n = 0;
    const timer = setInterval(() => {
      n += 1;
      const payload = JSON.stringify({ time: new Date().toISOString(), seq: n });
      // SSE 格式：每条消息以 `data: ...\n\n` 结尾
      res.write(`data: ${payload}\n\n`);
      if (n >= 6) {
        clearInterval(timer);
        res.end(); // 推完 6 条后关闭流
      }
    }, 500);
    return;
  }
  res.writeHead(200);
  res.end('SSE demo, 访问 /stream');
});

server.listen(3001, async () => {
  console.log('SSE 服务已启动(3001)，启动内部客户端用 fetch 读取流...\n');

  // 自动作为客户端读取流
  const resp = await fetch('http://127.0.0.1:3001/stream');
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      console.log('流结束');
      break;
    }
    const text = decoder.decode(value);
    // 按 SSE 分块（两个换行分隔）解析每条消息
    text.split('\n\n').forEach((block) => {
      const line = block.replace(/^data: /, '');
      if (line.trim()) console.log('收到 SSE:', line);
    });
  }
  server.close();
  process.exit(0);
});
