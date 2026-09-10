// 14 错误的三层防线：同步 try/catch、异步 Promise.catch、进程级兜底
// 对应文档：node/01-运行环境/06-进程线程与优雅退出.md
// 演示：同步 / 异步 / 进程级三道防线，以及「没有兜底会怎样、有兜底会怎样」
// 运行命令：
//   node src/14-error-fallback.js            # 默认：只演示前两道防线（不会让进程崩掉）
//   node src/14-error-fallback.js uncaught   # 演示 uncaughtException 进程级兜底
//   node src/14-error-fallback.js unhandled  # 演示 unhandledRejection 进程级兜底

// ── 第三道防线：进程级兜底（先注册，确保后面触发的异常能被接住）──
// 注意：uncaughtException / unhandledRejection 只是「最后一道防线」。
// 业界共识与文档观点一致：正确做法是记录日志后「优雅退出」进程，
// 不要继续跑——因为进程状态可能已经不一致，继续运行会做出错误决策或污染数据。
process.on('uncaughtException', (err) => {
  console.error('[兜底·uncaughtException] 捕获到一个未处理异常：', err.message);
  console.error('[兜底·uncaughtException] 这只是最后一道防线，正确做法是记录日志后优雅退出，不要继续跑。');
  console.error('[兜底·uncaughtException] 这里为了演示直接退出（process.exit(1)）。');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[兜底·unhandledRejection] 捕获到一个未处理的 Promise 拒绝：', reason);
  console.error('[兜底·unhandledRejection] 这只是最后一道防线，正确做法是记录日志后优雅退出，不要继续跑。');
  console.error('[兜底·unhandledRejection] 这里为了演示直接退出（process.exit(1)）。');
  process.exit(1);
});

// ── 第一道防线：同步 try/catch ──
function layer1Sync() {
  console.log('=== ① 同步 try/catch ===');
  try {
    // 故意访问不存在的属性，抛出同步异常
    const obj = null;
    obj.foo.bar;
  } catch (err) {
    console.log('  被 try/catch 接住，进程继续运行：', err.message);
  }
  console.log('  同步防线演示结束，进程依然健康。\n');
}

// ── 第二道防线：async 函数里的 try/catch 与 Promise.catch ──
async function layer2Async() {
  console.log('=== ② 异步 Promise.catch / async 里的 try-catch ===');

  // 2a) 显式 .catch 兜底
  Promise.reject(new Error('异步拒绝（用 .catch 接住）'))
    .catch((err) => console.log('  被 .catch 接住，进程继续运行：', err.message));

  // 2b) await 配合 try/catch
  try {
    await Promise.reject(new Error('await 抛出的拒绝（用 try/catch 接住）'));
  } catch (err) {
    console.log('  被 async/try-catch 接住，进程继续运行：', err.message);
  }

  // 等上面两个微任务打印完，保证顺序清晰
  await new Promise((r) => setImmediate(r));
  console.log('  异步防线演示结束，进程依然健康。\n');
}

// ── 第三道防线的「反面教材」：不兜底会怎样 ──
function demoNoFallback() {
  console.log('=== ③ 进程级兜底（无兜底时进程会直接崩）===');
  console.log('  下面触发一个「没有任何 try/catch 接住」的异常……');
  // 下面的代码没有 try/catch，若没有上面注册的 process.on('uncaughtException')，
  // 进程会直接打印栈并退出（退出码 1）。现在被兜底接住，并主动优雅退出。
  setTimeout(() => {
    throw new Error('我没被任何 try/catch 接住，只能靠进程级兜底');
  }, 50);
}

function demoUnhandledRejection() {
  console.log('=== ③ 进程级兜底（unhandledRejection 分支）===');
  console.log('  下面创建一个「既没有 await 也没有 .catch」的 Promise 拒绝……');
  // 下面这个拒绝既没 await 也没 .catch，若没有兜底会触发警告并可能崩溃；
  // 现在被 process.on('unhandledRejection') 接住，并主动优雅退出。
  setTimeout(() => {
    Promise.reject(new Error('我既没 await 也没 .catch，只能靠进程级兜底'));
  }, 50);
}

async function main() {
  const mode = process.argv[2];

  // 默认：只演示前两道防线，进程正常结束，不会崩
  await layer1Sync();
  await layer2Async();

  if (mode === 'uncaught') {
    demoNoFallback();
    // 注意：此处不设 return，进程会在 setTimeout 触发后由兜底优雅退出
    return;
  }
  if (mode === 'unhandled') {
    demoUnhandledRejection();
    return;
  }

  console.log('=== 默认模式说明 ===');
  console.log('  默认只演示了前两层防线，进程正常退出，不会崩。');
  console.log('  想看「进程级兜底」演示，请加参数：');
  console.log('    node src/14-error-fallback.js uncaught   # 看 uncaughtException');
  console.log('    node src/14-error-fallback.js unhandled  # 看 unhandledRejection');
  console.log('  这两类演示都会由兜底接住后「优雅退出」，而不是默默继续跑。');
}

main().catch((err) => {
  console.error('运行出错：', err);
  process.exit(1);
});
