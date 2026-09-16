// 02 CommonJS 侧：require 同步加载 · module.exports 导出
// 与 02-module-esm.mjs 互为对照，两个文件各只做两件事：
//   ① 亮出自己的本质特征（CommonJS 导出的是「值的拷贝」）
//   ② 互相导入（这里演示 CJS 怎么引 ESM）
// 运行：node src/02-module-cjs.cjs
//      node src/02-module-esm.mjs   ← 换一个入口跑，输出逐行相同

let count = 0;

// 导出的是一个「对象字面量」，count 在导出那一刻就被取值快照下来了
module.exports = {
    TAG: 'CommonJS',
    count, // 快照，永远是 0
    inc() {
        count += 1;
        return count;
    }, // 改的是模块内部的变量
    peek() {
        return count;
    }, // 开个口子，证明内部真的变了
};

console.log('[CJS 模块体] 执行完毕，导出 =', Object.keys(module.exports).join(', '));

// 互相导入：CJS 引 ESM。
// require 是同步的，等不到异步求值的 ESM，所以这里只能走动态 import()，
// 它返回 Promise，是渐进迁移时 CJS 触达 ESM 的桥。
import('./02-module-esm.mjs').then((esm) => {
    console.log('[互操作 CJS→ESM] 活绑定：调用前 count =', esm.count);
    esm.inc();
    console.log('[互操作 CJS→ESM] 调 inc() 后 count =', esm.count, '（立刻同步）');
});
