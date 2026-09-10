// 01 ESM 模块写法（.mjs 强制以 ESM 解析）
// 特点：import / export 是静态声明的；且支持「顶层 await」（CommonJS 做不到）
import os from 'node:os';

export function userInfo() {
  return `主机名: ${os.hostname()}，平台: ${os.platform()}`;
}

// 顶层 await：模块顶层可以直接 await，模块会等这里完成后才算是“加载完成”
const start = Date.now();
await new Promise((r) => setTimeout(r, 100));
const bootMs = Date.now() - start;

// 动态 import 同样可用（ESM 推荐用 import()，CommonJS 才用 require）
const m = await import('node:os');
console.log('ESM 导出结果:', userInfo());
console.log('动态 import node:os 的 EOL 存在:', m.EOL ? '是' : '否');
console.log(`顶层 await 演示：模块加载等待了约 ${bootMs}ms`);
console.log('import.meta.url =', import.meta.url);
