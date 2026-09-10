// 04 自定义分包协议服务端：Length(4 字节大端) + Body
// 处理半包与粘包：用「缓冲区累积 + while 循环解析」反复从 buffer 里拆出完整消息
// 运行方式：终端 A 跑 `npm run 04s`，终端 B 跑 `npm run 04c`
const net = require('node:net');

// 编码：4 字节大端长度 + 包体
function encode(bodyStr) {
  const body = Buffer.from(bodyStr, 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32BE(body.length, 0); // 大端写入长度
  return Buffer.concat([header, body]);
}

const server = net.createServer((socket) => {
  let buffer = Buffer.alloc(0); // 累积缓冲区：把多次 data 拼起来再解析

  // 客户端异常断开(RST)时捕获，避免未处理 error 事件让进程崩溃
  socket.on('error', (err) => console.log('socket error:', err.message));

  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]); // 不断累积新到的字节

    // 循环解析：只要缓冲里还有“一条完整消息”，就拆出来
    while (buffer.length >= 4) {
      const len = buffer.readUInt32BE(0); // 前 4 字节是包体长度
      if (buffer.length < 4 + len) {
        break; // 半包：还不到一条完整消息，等下一段 data 再来
      }
      const body = buffer.slice(4, 4 + len).toString('utf8');
      console.log(`解析出一条完整消息(len=${len}): ${body}`);
      buffer = buffer.slice(4 + len); // 消费掉这条，剩余继续循环
    }
  });
});

server.listen(4002, () => {
  console.log('分包协议服务已启动(4002)，运行 `npm run 04c` 发送消息。');
  console.log('无论客户端是分别发还是一次性粘着发，服务端都能正确拆成 3 条。');
});
