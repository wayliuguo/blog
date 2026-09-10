// 09 背压（backpressure）：写太快、消费太慢时的保护机制
// 自定义一个极慢的 Writable，write 里要 10ms 才 callback；用很小的 highWaterMark 让背压很快触发
// 用「写一条 -> 若 write 返回 false 就等 drain 再继续」的规范写法，drain 必然可见
const { Writable } = require('node:stream');

const COUNT = 100; // 写入条数
const DELAY = 10;  // 每条消费耗时(ms)
let backpressureEvents = 0;
let drained = 0;

const slow = new Writable({
  highWaterMark: 50, // 内部缓冲上限仅 50 字节，很快就会被填满 -> 触发背压
  write(chunk, encoding, callback) {
    // 模拟极慢消费：10ms 后才通知“这条写完了”
    setTimeout(() => callback(), DELAY);
  },
});

slow.on('drain', () => {
  drained += 1;
  console.log(`触发 drain 事件 第 ${drained} 次（内部缓冲已排空，可以继续写入）`);
});

// 规范的“生产者”写法：背压时暂停，等 drain 再继续
let i = 0;
function pump() {
  while (i < COUNT) {
    const ok = slow.write(`第${i}条\n`);
    i += 1;
    if (!ok) {
      // write 返回 false：缓冲已满，暂停写入，等 drain 信号再继续
      backpressureEvents += 1;
      console.log(`写入第 ${i - 1} 条后 write() 返回 false（发生背压），暂停，等待 drain`);
      slow.once('drain', () => {
        console.log('  drain 来了，继续写剩余数据');
        pump();
      });
      return; // 必须 return，否则会继续往满缓冲硬塞
    }
  }
  slow.end(); // 全部提交完，结束写入
}

console.log(`开始往慢速流写入 ${COUNT} 条数据（每条消费 ${DELAY}ms）...\n`);
pump();

slow.on('finish', () => {
  console.log(`\n全部写完。共触发背压 ${backpressureEvents} 次，drain ${drained} 次`);
  console.log('结论：生产快于消费时，Node 用背压机制（write 返回 false + drain）保护内存不被写爆');
  if (slow.writableFinished) process.exit(0);
});
