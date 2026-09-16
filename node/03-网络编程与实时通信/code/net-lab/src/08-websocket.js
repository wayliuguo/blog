// 08 WebSocket 服务端 + 自动客户端演示（基于 ws 库）
// 服务端处理 connection / message / close，并实现 Ping/Pong 心跳保活
// 启动后自动创建一个客户端连上去发 3 条消息并打印回显，5 秒后关闭退出
const { WebSocketServer, WebSocket } = require('ws');

const server = new WebSocketServer({ port: 4003 });

server.on('connection', (ws, req) => {
  console.log('客户端连入:', req.socket.remoteAddress);

  ws.on('message', (data) => {
    console.log('服务端收到消息:', data.toString());
    ws.send(`回显: ${data}`); // 简单回显
  });
  ws.on('close', () => console.log('客户端断开'));

  // 心跳：每 3 秒 ping 一次，若上一次 pong 没回来(isAlive=false)就 terminate
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; }); // 收到 pong 标记为活着
  const pingTimer = setInterval(() => {
    if (ws.isAlive === false) {
      console.log('心跳超时，终止连接');
      clearInterval(pingTimer);
      return ws.terminate();
    }
    ws.isAlive = false; // 发 ping 前先置否，等 pong 把它改回 true
    ws.ping();
  }, 3000);
  ws.on('close', () => clearInterval(pingTimer));
});

server.on('listening', async () => {
  console.log('WebSocket 服务已启动(4003)，自动连入一个客户端...\n');

  const ws = new WebSocket('ws://127.0.0.1:4003');

  ws.on('open', () => {
    let i = 0;
    const sendTimer = setInterval(() => {
      i += 1;
      ws.send(`消息${i}`);
      if (i >= 3) clearInterval(sendTimer); // 发 3 条后停
    }, 300);
  });

  ws.on('message', (data) => {
    console.log('客户端收到回显:', data.toString());
  });

  // 5 秒后整体关闭退出
  setTimeout(() => {
    console.log('\n5 秒到，关闭退出');
    ws.close();
    server.close();
    process.exit(0);
  }, 5000);
});
