// Worker 线程（被 11-worker-thread.js 通过 new Worker 调用）
// 在独立线程跑 CPU 密集任务，通过 parentPort 与主线程通信
const { parentPort } = require('node:worker_threads');

function heavy() {
  let sum = 0;
  for (let i = 0; i < 5e8; i += 1) sum += i; // 大循环求和，纯 CPU
  return sum;
}

parentPort.on('message', (msg) => {
  if (msg && msg.type === 'heavy') {
    const r = heavy();
    parentPort.postMessage({ result: r });
  }
});
