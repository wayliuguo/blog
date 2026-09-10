// 04 经典事件循环输出顺序题
// 关键心智模型（阶段顺序）：同步代码 -> nextTick 队列 -> 微任务(Promise.then) -> timer
console.log('start'); // 同步代码，最先执行

setTimeout(() => {
  console.log('timeout'); // 宏任务：进入 timer 阶段，排在最后
}, 0);

Promise.resolve().then(() => {
  console.log('promise'); // 微任务：在同步代码之后、timer 之前执行
});

process.nextTick(() => {
  // nextTick 队列优先级高于微任务队列，所以先于 promise 打印
  console.log('nextTick');
});

console.log('end'); // 同步代码

// 实际输出固定为：
// start
// end
// nextTick
// promise
// timeout
// 原因：先跑完所有同步 -> 清空 nextTick 队列 -> 清空微任务队列 -> 进入 timer 阶段跑 setTimeout
