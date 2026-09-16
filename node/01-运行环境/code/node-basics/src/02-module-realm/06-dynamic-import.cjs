// 06 CommonJS 里用 await import() 动态导入 ESM
// 这一段在演示：import() 是「保留字形式的函数」，返回 Promise，
// 是 CJS 早期加载 ESM 的唯一手段，也能在 ESM 里用来做按需加载。

// 先用 require 复习一下同步加载：调用那一刻返回值就已经在手里了
console.log('=== 1) require 是同步的：立刻拿到值 ===');
const store = require('./lib/store.cjs');
console.log('require 返回值的类型:', typeof store, '| name =', store.name);

// 再对比 import()：它返回 Promise，必须 await 或 .then 才拿得到模块
console.log('\n=== 2) import() 是异步的：拿到的是一个 Promise ===');
const pending = import('./lib/only-esm.mjs');
console.log('import() 的返回值是 Promise 吗:', pending instanceof Promise);
console.log('同一行代码后面，模块还没加载完，只能等它 resolve');

(async () => {
  const esm = await pending;
  console.log('\n=== 3) await 之后拿到的模块命名空间对象 ===');
  console.log('命名导出 flavor =', esm.flavor);
  console.log('命名导出 features =', esm.features);
  console.log('default 导出 =', esm.default);
  console.log('对象上的键 =', Object.keys(esm));

  console.log('\n=== 4) import() 对 CJS 同样有效（会包一层 default）===');
  const cjsNs = await import('./lib/store.cjs');
  console.log('import CJS 得到的键 =', Object.keys(cjsNs));
  console.log('cjsNs.default.name =', cjsNs.default.name);
  console.log('cjsNs.name（命名绑定） =', cjsNs.name);

  console.log('\n=== 5) 动态路径：import() 可以用变量拼路径，静态 import 不行 ===');
  const which = 'only-esm';
  const picked = await import(`./lib/${which}.mjs`);
  console.log(`import(\`./lib/${which}.mjs\`) 的 flavor =`, picked.flavor);

  console.log('\n结论：');
  console.log('  require()  -> 同步、返回导出值本身、只能读 CJS（新版可读同步求值的 ESM）');
  console.log('  import()   -> 异步、返回 Promise<模块命名空间>、ESM/CJS 都能读，路径可动态拼');
  console.log('  在只能同步加载的老版本 Node 里，import() 是 CJS 触达 ESM 的唯一桥梁');
})();
