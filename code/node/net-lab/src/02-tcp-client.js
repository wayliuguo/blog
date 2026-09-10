// 02 TCP 客户端：连接 01 的服务，连续发送 3 条消息
// 要点：TCP 是“字节流”而不是“消息协议”——它不保证一次 write 对应对端一次 data 事件
const net = require('node:net');

const socket = net.connect(4000, '127.0.0.1', () => {
  console.log('已连接到服务端');
  // 连续 write 三次。对端可能一次 data 收到全部，也可能分多次收到
  socket.write('你好');
  socket.write('我是客户端');
  socket.write('TCP是字节流');
});

socket.on('data', (chunk) => {
  console.log('服务端回执:', chunk.toString('utf8'));
});

socket.on('end', () => {
  console.log('服务端关闭了写入端，客户端退出');
  socket.end();
  process.exit(0);
});

// 兜底：若服务端不主动 end，2 秒后自己也退出，避免脚本挂住
setTimeout(() => {
  console.log('（兜底）2 秒超时，客户端主动退出');
  socket.end();
  process.exit(0);
}, 2000);
