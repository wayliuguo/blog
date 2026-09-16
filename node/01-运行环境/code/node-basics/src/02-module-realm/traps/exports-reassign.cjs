// traps/exports-reassign.cjs —— 「直接给 exports 赋值」的陷阱模块（给 02-exports-trap.cjs 用）
// 这一段在演示：exports 只是模块外层包裹函数收到的一个参数（局部变量）。
// 给它整体重新赋值，只是把局部变量指向了新对象，module.exports 一动不动。
const exported = { viaReassignedExports: true };

// 下面这行只是把局部变量指到新对象，外界 require 到的仍然是那个最初的空对象 {}
exports = exported;
