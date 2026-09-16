// 02 ES Module 侧：import 静态导入 · export 导出
// 与 02-module-cjs.cjs 互为对照，两个文件各只做两件事：
//   ① 亮出自己的本质特征（ESM 导出的是「活绑定 live binding」）
//   ② 互相导入（这里演示 ESM 怎么引 CJS）
// 运行：node src/02-module-esm.mjs
//      node src/02-module-cjs.cjs   ← 换一个入口跑，输出逐行相同

export const TAG = 'ES Module';
export let count = 0; // 外部读到的 count 会跟着变，不是快照
export function inc() {
    count += 1;
    return count;
}

// 互相导入：ESM 引 CJS —— 直接默认导入，拿到对方的 module.exports。
// import 声明会被提升，写在哪儿都先执行，放后面只是让对照读起来更顺。
import cjs from './02-module-cjs.cjs';

console.log('[ESM 模块体] 开始执行');
console.log('[互操作 ESM→CJS] 值的拷贝：调用前 count =', cjs.count);
cjs.inc();
console.log(
    '[互操作 ESM→CJS] 调 inc() 后 count =', cjs.count,
    '但 cjs.peek() =', cjs.peek(),
    '（内部变了，外部看不到）'
);
