// fork 子进程（被 10-child-process.js 通过 fork 调用）
// 通过 process.on('message') 收父进程消息，用 process.send 回传，走 IPC 通道
console.log('[fork 子进程] 启动');

process.on('message', (msg) => {
  console.log('[fork 子进程] 收到:', msg);
  // 回传给父进程
  process.send({ echo: msg.text, time: Date.now() });
  // 双向通信完成（父进程发来“收到”后）主动退出
  if (msg.text && msg.text.includes('收到')) {
    process.exit(0);
  }
});
