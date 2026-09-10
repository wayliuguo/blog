// 11 对比：① 主线程直接跑 CPU 密集任务（阻塞心跳）② 放进 Worker（不阻塞）
const { Worker } = require('node:worker_threads');
const path = require('node:path');

// CPU 密集任务：大循环求和
function heavy() {
  let sum = 0;
  for (let i = 0; i < 5e8; i += 1) sum += i;
  return sum;
}

// 心跳：每 100ms 打印一次。若主线程被阻塞，数字会“卡住”不跳
let beat = 0;
const timer = setInterval(() => {
  beat += 1;
  console.log(`心跳 #${beat}`);
}, 100);

setTimeout(() => {
  console.log('\n=== 方案①：主线程直接算（观察心跳是否停滞）===');
  console.time('主线程计算耗时');
  const r1 = heavy();
  console.timeEnd('主线程计算耗时');
  console.log('主线程结果（尾 6 位）:', String(r1).slice(-6));
  console.log('注意：上面这段时间里，心跳是“没跳”的——主线程被算满了');

  // 让心跳再跳几拍，再跑 Worker 方案
  setTimeout(() => {
    console.log('\n=== 方案②：放进 Worker（心跳应持续跳动）===');
    const w = new Worker(path.join(__dirname, 'worker-thread-child.js'));
    w.on('message', (msg) => {
      console.log('Worker 返回结果（尾 6 位）:', String(msg.result).slice(-6));
      console.log('可见：主线程心跳始终在跳，重活交给了另一条线程');
      w.terminate();
      clearInterval(timer);
      process.exit(0);
    });
    w.postMessage({ type: 'heavy' });
  }, 400);
}, 300);
