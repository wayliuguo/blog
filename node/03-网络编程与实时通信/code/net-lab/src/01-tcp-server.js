// 01 TCP 服务端：打印连接/断开，把收到数据以 hex 和 utf8 两种形式打印，并回执
// 运行方式：先在终端 A 跑 `npm run 01`，再到终端 B 跑 `npm run 02`
const net = require('node:net');

const server = net.createServer((socket) => {
  // 每个连接是一个 socket，带远程地址端口
  console.log(`客户端连入: ${socket.remoteAddress}:${socket.remotePort}`);

  socket.on('data', (chunk) => {
    // chunk 是 Buffer（字节流），可以按不同编码解读
    console.log('  收到数据(utf8):', chunk.toString('utf8'));
    console.log('  收到数据(hex) :', chunk.toString('hex'));
    // 回执：把字节原样确认回去
    socket.write(`已收到 ${chunk.length} 字节\n`);
  });

  socket.on('end', () => {
    console.log(`客户端半关闭(停止发送): ${socket.remoteAddress}:${socket.remotePort}`);
  });
  socket.on('close', () => {
    console.log(`连接关闭: ${socket.remoteAddress}:${socket.remotePort}`);
  });
  socket.on('error', (err) => console.log('socket error:', err.message));
});

server.listen(4000, () => {
  console.log('TCP 服务已启动，监听 4000。另开终端运行 `npm run 02` 连接本服务');
});
