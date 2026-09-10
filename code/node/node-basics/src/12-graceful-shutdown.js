// 12 优雅关闭：收到 SIGTERM/SIGINT 时不立刻退出
// ① server.close() 停止接收新连接 ② 等待在途请求结束（这里有个 2 秒慢接口）
// ③ 关闭模拟的数据库连接 ④ 日志后 process.exit(0)
const http = require('node:http');

// 模拟一个数据库连接
const db = {
  close(cb) {
    console.log('[db] 正在关闭数据库连接...');
    setTimeout(cb, 200);
  },
};

const server = http.createServer((req, res) => {
  console.log(`[req] ${req.method} ${req.url}`);
  if (req.url === '/slow') {
    // 模拟一个 2 秒的慢接口，用来观察“在途请求”是否被等待
    setTimeout(() => res.end('慢接口处理完成'), 2000);
  } else {
    res.end('ok');
  }
});

let shuttingDown = false;

server.listen(3000, () => {
  console.log('服务已启动: http://localhost:3000 （/slow 是 2 秒慢接口）');
  console.log('测试方式：另开终端执行  curl http://localhost:3000/slow  ，然后在本窗口按 Ctrl+C');
});

let serverClosed = false;
let dbClosed = false;
function maybeExit() {
  if (serverClosed && dbClosed) {
    console.log('优雅关闭完成，进程退出');
    process.exit(0);
  }
}

function gracefulShutdown(signal) {
  if (shuttingDown) return; // 防止重复触发
  shuttingDown = true;
  console.log(`\n收到信号 ${signal}，开始优雅关闭...`);

  // ① 停止接收新连接，但已建立的连接在途请求会继续处理完
  server.close(() => {
    console.log('[http] 已停止接收新连接，在途请求已处理完');
    serverClosed = true;
    maybeExit();
  });

  // ③ 关闭数据库连接
  db.close(() => {
    console.log('[db] 数据库连接已关闭');
    dbClosed = true;
    maybeExit();
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
