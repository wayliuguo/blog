// 04 自定义分包协议客户端：按 Length(4 字节大端) + Body 编码，发送多条消息
// 运行方式：先启动 04-protocol-server.js，再跑本文件
const net = require('node:net');

// 与服务端一致的编码函数
function encode(bodyStr) {
  const body = Buffer.from(bodyStr, 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32BE(body.length, 0);
  return Buffer.concat([header, body]);
}

const socket = net.connect(4002, '127.0.0.1', () => {
  console.log('已连接，按协议发送 3 条消息（这里一次性 write，可能被粘在一起发）');
  const msg = Buffer.concat([
    encode('你好'),
    encode('world'),
    encode('node-分包'),
  ]);
  // 一次性写入：即使服务端只收到 1 次 data（粘包），也能靠长度前缀正确拆成 3 条
  socket.write(msg);
});

// 客户端不需要解析，发完等一会儿退出即可
setTimeout(() => {
  console.log('发送完毕，退出');
  socket.end();
  process.exit(0);
}, 1000);
