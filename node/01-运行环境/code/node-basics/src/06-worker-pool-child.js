// Worker 线程（被 06-worker-pool.js 通过 new Worker 调用）
// 在独立线程执行 CPU 密集任务，通过 parentPort 与主线程通信
const { parentPort } = require('node:worker_threads');

// 演示：累计求和，纯 CPU 密集
function cpuTask(n) {
  let sum = 0;
  for (let i = 0; i < n; i += 1) sum += i;
  return sum;
}

parentPort.on('message', (msg) => {
  const result = cpuTask(msg.n || 1e8);
  parentPort.postMessage({ result }); // 把计算结果回传主线程
});
