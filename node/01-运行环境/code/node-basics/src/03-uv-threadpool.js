// 03 libuv 线程池默认只有 4 个线程
// 对应文档《事件循环：六个阶段与微任务》
// 这一段在演示：crypto.pbkdf2 这类“类阻塞”操作会占用 libuv 线程池里的线程。
// 默认线程池大小 = 4（见 process.env.UV_THREADPOOL_SIZE || 4）。
// 发起 10 个 pbkdf2，会看到前 4 个同时跑、第 5 个起要等线程释放 —— 排队可见。
//
// 想验证扩容效果，用下面命令再跑一次对比（注意：必须在进程启动前设置，运行时改无效）：
//   UV_THREADPOOL_SIZE=8 node src/03-uv-threadpool.js

const crypto = require('node:crypto');

const TASKS = 10;
// 让单次 pbkdf2 约 100~300ms。本机实测 100000 次迭代 sha512 约 150ms；若跑太快可调大
const ITERATIONS = 100000;
const poolSize = Number(process.env.UV_THREADPOOL_SIZE) || 4;

const start = process.hrtime.bigint();
let done = 0;
const rows = [];

for (let i = 0; i < TASKS; i += 1) {
  // 这一段在演示：每个 pbkdf2 占用线程池里的一个线程，直到算完才释放
  crypto.pbkdf2('password', 'salt', ITERATIONS, 64, 'sha512', () => {
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
    rows.push({ i, elapsedMs, poolSize });
    done += 1;
    if (done === TASKS) printSummary();
  });
}

function printSummary() {
  console.log(`UV_THREADPOOL_SIZE = ${poolSize}`);
  console.log('序号 | 距开始(ms) | 占用线程池');
  console.log('-'.repeat(44));
  for (const r of rows) {
    console.log(
      String(r.i).padEnd(6) + '| ' +
      r.elapsedMs.toFixed(0).padEnd(11) + '| ' +
      `1 / ${r.poolSize}`,
    );
  }
  console.log('-'.repeat(44));

  // 按完成顺序分析批次（线程池一次只能并发 poolSize 个）
  const sorted = [...rows].sort((a, b) => a.elapsedMs - b.elapsedMs);
  const firstBatch = sorted.slice(0, poolSize);
  const last = sorted[sorted.length - 1];
  const firstAvg = firstBatch.reduce((s, r) => s + r.elapsedMs, 0) / firstBatch.length;
  console.log(`前 ${poolSize} 个完成于约 ${firstAvg.toFixed(0)} ms（几乎同时开跑）；`);
  console.log(`第 ${poolSize + 1} 个起要等线程释放，最晚约 ${last.elapsedMs.toFixed(0)} ms。`);
  console.log('结论：libuv 线程池默认 4 线程，超出部分必须排队 —— 印证“线程池只有 4 个”。');
}
