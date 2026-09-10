// 06 HTTP Keep-Alive 对比：复用同一个 socket 与否
// 用 agent 分别开启/关闭 keepAlive 各发多次请求，观察 req.socket.localPort 是否变化
// （localPort 是客户端这侧的本地端口，复用时端口不变；不复用时每次都新建连接、端口变化）
const http = require('node:http');

const server = http.createServer((req, res) => {
  res.end('ok');
});

server.keepAliveTimeout = 5000; // 服务端保持空闲连接的时间

server.listen(5000, () => {
  console.log('server.keepAliveTimeout =', server.keepAliveTimeout);
  console.log('server.headersTimeout  =', server.headersTimeout);

  // maxSockets:1 强制走同一条连接，让“复用”一目了然（否则会在线程池里复用少数几条）
  const keepAgent = new http.Agent({ keepAlive: true, maxSockets: 1 });
  const noAgent = new http.Agent({ keepAlive: false });

  function request(agent, i, cb) {
    const req = http.request({ host: '127.0.0.1', port: 5000, path: '/', agent }, (res) => {
      res.resume(); // 丢弃响应体
      const port = req.socket.localPort; // 复用观察点：客户端本地端口
      console.log(`  请求#${i} 使用 socket 本地端口: ${port}`);
      res.on('end', cb);
    });
    req.end();
  }

  let i = 0;
  function seriesKeep() {
    if (i < 5) {
      request(keepAgent, i, () => { i += 1; seriesKeep(); });
    } else {
      console.log('结论：keepAlive 开启时，多次请求复用同一 socket（本地端口相同）\n');
      console.log('--- 对比：keepAlive:false（每次新建连接）---');
      let j = 0;
      function seriesNo() {
        if (j < 3) {
          request(noAgent, j, () => { j += 1; seriesNo(); });
        } else {
          console.log('结论：keepAlive 关闭时，每次请求端口变化（不复用）');
          server.close();
          keepAgent.destroy();
          noAgent.destroy();
          process.exit(0);
        }
      }
      seriesNo();
    }
  }
  seriesKeep();
});
