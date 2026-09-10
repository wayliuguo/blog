// 05 证明：微任务不是“整轮事件循环结束才执行一次”，而是在「每个 callback 回到调度层时的检查点」执行
// 用两个 setTimeout，第一个内部再注册一个 .then
console.log('脚本开始（同步）');

setTimeout(() => {
  console.log('第一个 timer 回调开始');
  // 关键：在 timer 回调内部注册的微任务，会在“这个回调返回之前”被立刻清空
  Promise.resolve().then(() => console.log('第一个 timer 里的微任务'));
  console.log('第一个 timer 回调结束');
}, 0);

setTimeout(() => {
  console.log('第二个 timer 回调');
}, 0);

console.log('脚本结束（同步）');

// 输出顺序：
// 脚本开始
// 脚本结束
// 第一个 timer 回调开始
// 第一个 timer 回调结束
// 第一个 timer 里的微任务
// 第二个 timer 回调
// 说明：第一个 timer 的回调刚一返回，调度层就检查到微任务并立即执行，
//       所以「第一个 timer 里的微任务」夹在它和第二个 timer 之间，
//       而不是等到所有 timer 都跑完才统一执行。
