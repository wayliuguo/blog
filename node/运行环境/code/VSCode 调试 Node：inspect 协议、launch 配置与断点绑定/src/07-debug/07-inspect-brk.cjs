// `--inspect-brk` 的演示脚本：进程在「第一行代码执行之前」就挂起，等调试器连上并 Continue 才往下走。
// 运行：node --inspect-brk src/07-debug/07-inspect-brk.cjs
//   —— 终端只会打印 Debugger listening，然后停住；attach 并 Continue 后才看得到下面的输出。
// 不带 --inspect-brk 直接跑也能跑完：`debugger` 语句在没有调试器时是空操作。
console.log('[1] 进程已启动（--inspect-brk 下，这行要等调试器 Continue 之后才会打印）')
debugger // 调试器在场时，执行到这里会停；不在场时是空操作
console.log('[2] debugger 语句已越过')
console.log('[3] 运行结束')
