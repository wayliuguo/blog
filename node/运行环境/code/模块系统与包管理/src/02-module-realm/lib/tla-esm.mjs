// lib/tla-esm.mjs —— 带「顶层 await」的 ESM 模块（给 05-cjs-require-esm.cjs 演示失败场景用）
// 这一段在演示：模块体里有顶层 await 时，模块的求值是异步的，
// 同步的 require() 等不了它，只能改用动态 import()。
const start = Date.now()
await new Promise(resolve => setTimeout(resolve, 10))

export const readyMs = Date.now() - start
