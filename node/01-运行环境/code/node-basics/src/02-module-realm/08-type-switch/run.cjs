// 08-type-switch/run.cjs —— 入口脚本（自己也是 .cjs，所以即使在 "type": "module" 的目录里也按 CJS 跑）
// 这一段在演示：同一个目录、同一个 package.json，「整包开关」和「后缀强制」分别把文件指到了哪套模块系统。
// 运行方式：node src/02-module-realm/08-type-switch/run.cjs
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const dir = __dirname;
const pkg = require('./package.json'); // CJS 可以直接 require JSON

console.log('目录:', dir);
console.log('该目录的 package.json 内容:', JSON.stringify(pkg), '  <- 这就是「整包开关」');
console.log('入口文件本身是 run.cjs，所以入口也按 CommonJS 解析');

// 把两个文件各自当成独立入口丢给 node 跑，看到的解析结果才最真实
const targets = [
  ['esm-default.js', '.js 没有后缀强制，继承上面的 type -> ESM'],
  ['cjs-forced.cjs', '.cjs 后缀强制 -> CommonJS，无视 type'],
];

for (const [file, note] of targets) {
  console.log(`\n----- 单独作为入口运行 ${file}（${note}）-----`);
  const result = spawnSync(process.execPath, [path.join(dir, file)], { encoding: 'utf8' });
  process.stdout.write(result.stdout || '');
  if (result.stderr) process.stderr.write(result.stderr);
  console.log(`  退出码: ${result.status}`);
}

console.log('\n=== 判定优先级小结 ===');
console.log('  1. 文件后缀强制：.cjs 永远 CommonJS，.mjs 永远 ESM，优先级最高');
console.log('  2. 否则看最近的 package.json 的 "type" 字段：module 即 ESM，缺省或 commonjs 即 CommonJS');
console.log('  所以同一个目录里可以共存两套模块系统，混用时的唯一开关就是后缀。');
