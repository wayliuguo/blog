// 06 Worker Pool + 任务队列：生产环境为什么不能“每个请求 new Worker”
// 对应文档《进程、线程与优雅退出》
// 反例：20 个任务各 new Worker —— 线程创建/调度开销与内存随并发线性膨胀
// 正例：预创建 4 个 Worker，任务进队列，空闲 Worker 取任务，跑完回收再接下一个
// Pool 结构：任务队列 -> 空闲 Worker 标记 -> 派发 -> 回收

const { Worker } = require('node:worker_threads');
const os = require('node:os');
const path = require('node:path');

const TASKS = 20;
const N = 5e7; // 单任务 CPU 计算量
// 为演示清晰固定为 4（生产可换成 os.availableParallelism() 按核数自适应）
const POOL_SIZE = 4;
const childPath = path.join(__dirname, '06-worker-pool-child.js');

// 采样 RSS 峰值
function samplePeak(intervalMs = 5) {
  let peak = process.memoryUsage().rss;
  const id = setInterval(() => {
    peak = Math.max(peak, process.memoryUsage().rss);
  }, intervalMs);
  return { stop: () => { clearInterval(id); return peak; } };
}

// ---- 反例：每个任务都 new Worker ----
async function antiPattern() {
  const peak = samplePeak();
  const start = process.hrtime.bigint();
  const promises = [];
  for (let i = 0; i < TASKS; i += 1) {
    // 这一段在演示：每个请求都创建一个 Worker，创建/调度开销随并发线性增加
    promises.push(new Promise((resolve) => {
      const w = new Worker(childPath);
      w.once('message', (m) => { w.terminate(); resolve(m.result); });
      w.once('error', () => { w.terminate(); resolve(0); });
      w.postMessage({ n: N });
    }));
  }
  await Promise.all(promises);
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  return { time: ms, peak: peak.stop() };
}

// ---- 正例：最小 Worker Pool ----
function createPool(size) {
  const workers = [];
  const idle = [];
  const queue = [];
  for (let i = 0; i < size; i += 1) {
    workers.push(new Worker(childPath));
    idle.push(workers[i]);
  }
  // 派发：队列有任务且有用空闲 Worker 就取一个执行
  function dispatch() {
    while (queue.length && idle.length) {
      const { data, resolve, reject } = queue.shift();
      const w = idle.pop();
      w.once('message', (m) => { idle.push(w); resolve(m.result); dispatch(); }); // 回收
      w.once('error', (e) => { idle.push(w); reject(e); dispatch(); });
      w.postMessage({ n: data }); // 派发
    }
  }
  return {
    run(data) {
      return new Promise((resolve, reject) => {
        queue.push({ data, resolve, reject }); // 进任务队列
        dispatch();
      });
    },
    workers,
    async close() { await Promise.all(workers.map((w) => w.terminate())); },
  };
}

async function poolPattern() {
  const peak = samplePeak();
  const start = process.hrtime.bigint();
  const pool = createPool(POOL_SIZE);
  const tasks = [];
  for (let i = 0; i < TASKS; i += 1) tasks.push(pool.run(N));
  await Promise.all(tasks);
  await pool.close(); // 这一段在演示：结束前终止所有 Worker，进程才能正常退出
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  return { time: ms, peak: peak.stop() };
}

(async () => {
  console.log(`任务数 = ${TASKS}，单任务 CPU 量 = ${N}，POOL_SIZE = ${POOL_SIZE}\n`);

  const anti = await antiPattern();
  console.log('=== 反例：每个任务 new Worker ===');
  console.log(`总耗时 ≈ ${anti.time.toFixed(0)} ms，峰值 RSS ≈ ${(anti.peak / 1024 / 1024).toFixed(1)} MB`);
  console.log('说明：20 个 Worker 被同时创建，线程创建与调度本身成为瓶颈，内存随并发线性膨胀\n');

  const pool = await poolPattern();
  console.log('=== 正例：Worker Pool（4 个复用）===');
  console.log(`总耗时 ≈ ${pool.time.toFixed(0)} ms，峰值 RSS ≈ ${(pool.peak / 1024 / 1024).toFixed(1)} MB`);
  console.log('说明：Worker 复用，并发被限制在 4，内存平稳、可控\n');

  console.log('对比：');
  console.log(`  耗时  反例 ${anti.time.toFixed(0)} ms  vs  正例 ${pool.time.toFixed(0)} ms`);
  console.log(`  内存  反例 ${(anti.peak / 1024 / 1024).toFixed(1)} MB  vs  正例 ${(pool.peak / 1024 / 1024).toFixed(1)} MB`);
  process.exit(0);
})();
