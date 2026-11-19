// 程序内打开 inspect 端口：`--inspect` 的代码等价形态。
// 运行：npm run 07inspector（进程保持存活，Ctrl+C 结束）
// 另开终端访问 http://127.0.0.1:9229/json/list 能看到本进程的调试目标——
// 此时任何调试器（VSCode attach 配置 / chrome://inspect）都可以连上来下断点。
// 9229 只是社区惯例端口；被占用时换任意空闲端口即可（坑见正文「9229 被占」）。
const inspector = require('node:inspector')

inspector.open(9229, '127.0.0.1')
console.log('[inspect] url =', inspector.url())
console.log('[inspect] 端口已打开，进程保持运行中……（Ctrl+C 退出）')

// 空转保活，模拟一个长期运行的服务；inspect 的监听句柄本身也会撑住事件循环
setInterval(() => {}, 1 << 30)
