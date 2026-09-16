// 07 模块解析算法：require.resolve 到底把标识符解析成了什么
// 这一段在演示：Node 拿到一个模块标识符后怎么定位文件 ——
// 内置模块走内置表；相对路径按「补后缀 / 找目录」规则解析；包名则从当前目录逐级向上找 node_modules。

const path = require('node:path');

// 逐个目标单独 try/catch：解析失败本身就是这里要演示的现象之一
function tryResolve(label, target, fn) {
  try {
    console.log(`  [${label}] ${target}  ->  ${fn()}`);
  } catch (err) {
    console.log(`  [${label}] ${target}  ->  失败(${err.code})`);
  }
}

console.log('=== 1) 三类目标分别解析成什么 ===');
tryResolve('内置模块', 'node:path', () => require.resolve('node:path'));
tryResolve('内置模块', 'path', () => require.resolve('path'));
tryResolve('内置模块', 'fs', () => require.resolve('fs'));
tryResolve('内置模块', 'os', () => require.resolve('os'));
tryResolve('相对路径', './lib/store.cjs', () => require.resolve('./lib/store.cjs'));
tryResolve('相对路径', './lib/counter.mjs', () => require.resolve('./lib/counter.mjs'));
tryResolve('上一级目录', '../02-module-realm/lib/store.cjs', () => require.resolve('../02-module-realm/lib/store.cjs'));
console.log('  带 node: 前缀与裸名字都是内置模块，解析结果原样返回，不会去磁盘上找文件');

console.log('\n=== 2) 后缀补全规则：省略后缀时只认 .js / .json / .node ===');
tryResolve('省略 .cjs 后缀', './lib/store', () => require.resolve('./lib/store'));
tryResolve('省略 .mjs 后缀', './lib/counter', () => require.resolve('./lib/counter'));
console.log('  说明：.cjs / .mjs 不在默认补全列表里，写相对路径时必须带全后缀；');
console.log('        带全后缀的 ./lib/store.cjs 反而是绝对可靠的写法。');

console.log('\n=== 3) 包名解析：本仓库没装依赖，所以走完整个向上查找链后会抛错 ===');
tryResolve('不存在的第三方包', 'some-pkg-not-installed', () => require.resolve('some-pkg-not-installed'));

console.log('\n=== 4) module.paths：从当前目录逐级向上找 node_modules 的路径链 ===');
module.paths.forEach((p, i) => console.log(`  [${i}] ${p}`));
console.log(`  当前文件名: ${__filename}`);
console.log(`  当前目录  : ${__dirname}`);

console.log('\n=== 5) require.resolve.paths()：指定包名时实际会去搜的目录 ===');
const searchPaths = require.resolve.paths('some-pkg-not-installed');
console.log('  some-pkg-not-installed ->', searchPaths);
console.log('  node:path 这种内置模块不参与查找，直接返回 null:', require.resolve.paths('node:path'));

console.log('\n=== 6) 查找顺序示意 ===');
console.log(`  require('some-pkg') 从 ${__dirname} 开始`);
module.paths.forEach((p, i) => console.log(`    ${i === 0 ? '第 1 站' : `第 ${i + 1} 站`}: ${path.join(p, 'some-pkg')}`));
console.log('    ...继续向上直到文件系统根目录 /node_modules');
console.log('    全都没有 -> 抛 MODULE_NOT_FOUND');

console.log('\n结论：内置模块查表命中；相对路径按补后缀/目录规则解析；');
console.log('      包名走「就近优先、逐级向上」算法 —— 这也是为什么顶层 node_modules 里的包能被任意子目录 require 到。');
