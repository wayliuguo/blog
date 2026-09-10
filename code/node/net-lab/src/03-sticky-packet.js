// 03 粘包/拆包复现实验（单文件即可跑，无需开两个终端）
// 服务端收到 data 时打印「第 N 次 data 事件，本次收到 X 字节：<内容>」
// 客户端快速连续 write 三次短消息（hello / world / node），
// 读者很可能看到“3 次 write 被合并成 1 次 data 事件”（粘包）
const net = require('node:net');

let n = 0;
const server = net.createServer((socket) => {
  socket.on('data', (chunk) => {
    n += 1;
    // 关键：一次 data 事件里可能包含多条“逻辑消息”
    console.log(`第 ${n} 次 data 事件，本次收到 ${chunk.length} 字节：<${chunk.toString('utf8')}>`);
  });
});

server.listen(4001, () => {
  console.log('粘包实验服务已启动(4001)，客户端将快速连发 3 条短消息...\n');

  const client = net.connect(4001, '127.0.0.1', () => {
    // 连续快速 write：Nagle 算法 + 内核发送缓冲可能把三次合并成一个 TCP 段
    client.write('hello');
    client.write('world');
    client.write('node');
  });

  // 等一会儿观察结果后自动退出
  setTimeout(() => {
    console.log('\n（结果因机器/系统/网络而异，但“TCP 是字节流、没有消息边界”这一原理不变）');
    console.log('想要稳定收消息，必须像 04 那样用「长度前缀」自己做分包');
    server.close();
    client.end();
    process.exit(0);
  }, 500);
});

// 说明：Nagle 算法会把小包攒一攒再发；加上内核缓冲区，多个 write 常被合并成一个 data 事件
//       这就是“粘包”。反之一个大数据包也可能被拆成多次 data 事件，即“拆包”。
