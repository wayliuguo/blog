// ipc.cjs — 多进程探针：崩溃隔离 / 内存不共享 / 序列化代价 / 每进程固定开销
// 对应《Chrome 多进程与渲染管线》：用 Node 的多进程把这四个结论跑出来。
// 注意：绝对数值和 Chrome 不一样（这里每个进程是 Node），但结论是同构的。
'use strict';
const assert = require('node:assert');
const { fork } = require('node:child_process');
const { once } = require('node:events');
const path = require('node:path');

const spawn = (mode) => fork(path.join(__dirname, 'ipc.cjs'), ['__child', mode], { stdio: 'ignore' });

// ── 子进程分支：alive 一直干活，crash 会在 30ms 后自己炸掉 ──────────────
if (process.argv[2] === '__child') {
  const mode = process.argv[3];
  if (mode === 'crash') {
    setTimeout(() => { throw new Error('渲染进程崩溃'); }, 30);
  } else {
    let n = 0;
    setInterval(() => { n++; }, 50);
    process.on('message', (msg) => {
      if (msg.type === 'mutate') {
        msg.payload.n = 999; // 改的是自己这份副本
        process.send({ type: 'mutated', payload: msg.payload });
      }
      if (msg.type === 'ping') process.send({ type: 'pong', n, rss: process.memoryUsage().rss });
    });
  }
} else {
  main().catch((err) => { console.error(err); process.exit(1); });
}

async function main() {
  // ---------- 场景一：崩溃隔离——一个进程炸了，另一个照常干活 ----------
  const alive = spawn('alive');
  const crasher = spawn('crash');
  const [code] = await once(crasher, 'exit');
  assert.notEqual(code, 0, '崩溃进程非 0 退出');
  alive.send({ type: 'ping' });
  const [reply] = await once(alive, 'message');
  assert.equal(reply.type, 'pong', '另一个进程没受影响');
  console.log(`[1] 崩溃隔离：一个进程抛异常退出（code ${code}），另一个进程仍能正常应答 —— 这就是「一个标签页崩了不带走浏览器」的底层机制`);
  alive.kill();

  // ---------- 场景二：内存不共享——传过去的是副本，改不到原对象 ----------
  const child = spawn('alive');
  const payload = { n: 1 };
  child.send({ type: 'mutate', payload });
  const [back] = await once(child, 'message');
  assert.equal(back.payload.n, 999, '子进程改的是自己那份');
  assert.equal(payload.n, 1, '父进程的原对象没被改动');
  console.log(`[2] 内存不共享：子进程把 n 改成 ${back.payload.n}，父进程这边仍是 ${payload.n} —— 跨进程传值走的是结构化克隆，拿到的是副本，所以两端不会互相踩内存`);
  child.kill();

  // ---------- 场景三：序列化代价——postMessage 传大对象为什么会卡 ----------
  // 同进程里传个引用是 0 成本；跨进程必须整份复制，代价随数据量线性增长。
  const cloneCost = (size, rounds = 10) => {
    const obj = Array.from({ length: size }, (_, i) => ({ i, s: 'x'.repeat(20) }));
    let t0 = performance.now();
    for (let k = 0; k < rounds; k++) structuredClone(obj);
    const clone = (performance.now() - t0) / rounds;
    t0 = performance.now();
    for (let k = 0; k < rounds; k++) { let sum = 0; for (const it of obj) sum += it.i; void sum; }
    const pass = (performance.now() - t0) / rounds;
    return { clone, pass };
  };
  const sizes = [1e4, 1e5, 1e6];
  const costs = sizes.map((n) => ({ n, ...cloneCost(n) }));
  for (const c of costs) {
    console.log(`      ${c.n.toLocaleString('en-US')} 条：克隆 ${c.clone.toFixed(1)}ms · 同进程直接遍历 ${c.pass.toFixed(2)}ms · 相差 ${(c.clone / c.pass).toFixed(0)} 倍`);
  }
  assert.ok(costs[2].clone > costs[0].clone * 10, '数据量涨 100 倍，克隆耗时也涨了一个量级以上');
  console.log(`[3] 序列化代价：1 万条克隆 ${costs[0].clone.toFixed(1)}ms，100 万条 ${costs[2].clone.toFixed(0)}ms —— 跨进程通信是**按字节付费**的，一帧 16ms 的预算里，一次大 postMessage 就能吃掉一大块`);

  // ---------- 场景四：每进程固定开销——为什么要有进程数上限 ----------
  // 每起一个进程就要付一份「运行时基础内存」，所以不能一个标签页一个进程地无限开。
  // 口径：父进程的 RSS 不含子进程，所以让每个子进程自报，再取平均
  const perProcessRss = async (count) => {
    const kids = Array.from({ length: count }, () => spawn('alive'));
    await new Promise((r) => setTimeout(r, 400));
    let total = 0;
    for (const k of kids) {
      k.send({ type: 'ping' });
      const [msg] = await once(k, 'message');
      total += msg.rss || 0;
      k.kill();
    }
    return total / count;
  };
  const per = await perProcessRss(3);
  assert.ok(per > 10 * 1024 * 1024, `单个进程基础内存 ${(per / 1024 / 1024).toFixed(0)}MB`);
  console.log(`[4] 每进程固定开销：这里每个进程一启动就占 ${(per / 1024 / 1024).toFixed(0)}MB（Chrome 的渲染进程量级不同，但同构）—— 所以浏览器要按站点复用进程、并给进程数设上限，而不是一个标签页开一个`);
}
