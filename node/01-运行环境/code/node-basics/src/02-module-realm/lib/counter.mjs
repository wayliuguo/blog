// lib/counter.mjs —— ESM 风格的计数器（给 03-cjs-value-vs-esm-binding.mjs 做对照用）
// 这一段在演示：ESM 导出的是「活绑定（live binding）」。
// count 与模块内部那个变量是同一个绑定，increase() 一改，所有导入方立刻看到新值。
export let count = 0;

export function increase() {
    count += 1; // 改的就是被导出的那个绑定
    return count;
}
