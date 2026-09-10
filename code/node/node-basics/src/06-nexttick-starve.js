// 06 process.nextTick 递归导致事件循环饥饿
// nextTick 队列永远排在 timer 之前：如果一直往里塞，setTimeout 永远排不上
// 这里用计数器限制递归 10 次，保证脚本能自动结束（否则会卡死）
let count = 0;
const MAX = 10;

function starve() {
  count += 1;
  console.log(`nextTick 第 ${count} 次`);
  if (count < MAX) {
    process.nextTick(starve); // 递归塞入 nextTick 队列
  }
}
starve();

setTimeout(() => {
  console.log(`setTimeout 终于执行了（排在 ${MAX} 次 nextTick 之后）`);
  console.log('说明：如果上面是无限递归，这一行永远不会打印——这就是“饥饿”');
}, 0);
