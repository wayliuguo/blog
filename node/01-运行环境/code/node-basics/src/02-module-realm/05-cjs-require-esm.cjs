// 05 CommonJS 里用 require() 加载 ESM
// 这一段在演示：Node 22.12+ 已支持「同步 require ESM」，但这属于新版本能力。
// 老版本（Node 20 及以前 / 22.12 之前）会直接抛 ERR_REQUIRE_ESM。
const nodePath = require('node:path');

console.log('当前 Node 版本:', process.version);
console.log('当前文件被当成哪种模块解析:', nodePath.extname(__filename) === '.cjs' ? 'CommonJS（.cjs 后缀强制）' : '其他');

console.log('\n=== 1) require 一个纯 ESM 模块（无顶层 await）===');
try {
  const esm = require('./lib/only-esm.mjs');
  console.log('require() 成功，没有抛 ERR_REQUIRE_ESM');
  console.log('返回值类型:', Object.prototype.toString.call(esm));
  console.log('命名导出 flavor =', esm.flavor);
  console.log('命名导出 features =', esm.features);
  console.log('命中 hello():', esm.hello('CommonJS'));
  console.log('default 导出 =', esm.default);
  console.log('__esModule 标记 =', esm.__esModule);
  console.log('返回对象上的键 =', Object.keys(esm));
  console.log('说明：拿到的基本就是 ESM 的模块命名空间对象，命名导出和 default 都在上面；');
  console.log('      需要整份 default 时写 esm.default，不能直接当普通导出用。');
} catch (err) {
  console.log('require(ESM) 失败，code =', err.code);
  console.log('原因:', err.message);
  console.log('这说明当前 Node 版本不支持同步 require ESM（需要 Node 20.17+ / 22.12+），');
  console.log('请改用 06-dynamic-import.cjs 里的 await import() 方案。');
}

console.log('\n=== 2) 反例：带顶层 await 的 ESM，同步 require 一定失败 ===');
try {
  const tla = require('./lib/tla-esm.mjs');
  console.log('居然成功了，readyMs =', tla.readyMs);
} catch (err) {
  console.log('失败，code =', err.code);
  console.log('原因:', err.message);
  console.log('原因说明：模块体里有顶层 await，它的求值是异步的，而 require 是同步的，等不了 Promise。');
  console.log('正确做法：用 await import("./lib/tla-esm.mjs")，见 06-dynamic-import.cjs。');
}

console.log('\n结论：require(ESM) 让 CJS 少了一次改写成本，但仅限「同步就能求值完」的 ESM；');
console.log('      带顶层 await 的模块，仍然只能走动态 import()。');
