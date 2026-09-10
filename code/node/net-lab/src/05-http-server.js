// 05 用 node:http 手写最小 HTTP Server
// 要点：req 是可读流（请求体要像流一样累积），res 是可写流（用 end 写出响应）
// 运行方式：`npm run 05`，另开终端用 curl 测试
const http = require('node:http');

const server = http.createServer((req, res) => {
  // req.method / req.url 是解析出来的首行信息
  console.log(`收到请求: ${req.method} ${req.url}`);

  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('首页');
    return;
  }

  if (req.method === 'GET' && req.url === '/api/users') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify([{ id: 1, name: '张三' }, { id: 2, name: '李四' }]));
    return;
  }

  if (req.method === 'POST' && req.url === '/api/echo') {
    // 请求体是流：用 chunks[] 累积，结束后再 Buffer.concat 起来
    const chunks = [];
    req.on('data', (c) => chunks.push(c)); // req 是可读流
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ echo: body, len: body.length }));
    });
    return;
  }

  // 其他路径返回 404
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found');
});

server.listen(3000, () => {
  console.log('最小 HTTP 服务已启动: http://localhost:3000');
  console.log('测试:');
  console.log('  curl localhost:3000/');
  console.log('  curl localhost:3000/api/users');
  console.log('  curl -XPOST localhost:3000/api/echo -d "hello"');
  console.log('  curl localhost:3000/unknown');
});
