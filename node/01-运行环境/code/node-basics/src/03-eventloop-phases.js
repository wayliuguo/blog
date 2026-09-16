// 03 事件循环多阶段观测：timers / poll / check / close callbacks 各自什么时候被点亮
//
// 前面的 04 / 05 / 06 三个脚本都在推"输出顺序"；这个脚本换一个角度 —— 当"阶段观测器"：
// 用四类来源不同的回调，把事件循环的几个主要阶段依次点亮，让你看到"回调究竟是在哪个阶段跑的"。
//
// 四个观测点：
//   timers 阶段          -> setTimeout 的回调
//   poll 阶段            -> fs.readFile 的 I/O 回调（就绪的 I/O 回调在 poll 阶段被调度）
//   check 阶段           -> setImmediate 的回调
//   close callbacks 阶段 -> 真实 socket 被销毁后的 'close' 事件
//
// 另外还有两条"插队"队列，它们不属于任何阶段，而是在每个回调返回处被清空：
//   process.nextTick 队列（优先级更高）与 Promise 微任务队列
//
// 运行：node src/03-eventloop-phases.js
// 本机 Node 22 实测输出与阶段归属见文件末尾注释。

const fs = require('node:fs');
const net = require('node:net');

console.log('==== 同步代码开始 ====');

// 观测点 1：timers 阶段的宏任务
setTimeout(() => {
    console.log('[timers] setTimeout callback');
    // 回调里注册的微任务，会在本回调返回时立刻被清空 —— 这就是微任务检查点
    Promise.resolve().then(() => {
        console.log('[微任务] setTimeout promise then');
    });
}, 0);

// 观测点 2：poll 阶段 —— fs.readFile 的 I/O 回调在 poll 阶段执行
fs.readFile(__filename, () => {
    console.log('[poll] fs.readFile I/O callback');

    // 此刻正处在 poll 阶段内部：
    //   setImmediate 会在本轮的 check 阶段执行（poll 的下一步就是 check，所以很近）
    //   setTimeout 虽然延时 0，但要等到下一轮的 timers 阶段
    setImmediate(() => {
        console.log('[check] readFile 里的 setImmediate');
    });
    setTimeout(() => {
        console.log('[timers] readFile 里的 setTimeout');
    }, 0);

    Promise.resolve().then(() => {
        console.log('[微任务] readFile promise then');
    });
});

// 观测点 3：check 阶段 —— setImmediate 的回调
setImmediate(() => {
    console.log('[check] 顶层 setImmediate');
});

// 观测点 4：close callbacks 阶段 —— 真实 socket 被销毁后的 'close' 事件
const server = net.createServer();
server.listen(0, () => {
    const client = net.createConnection(server.address().port, () => {
        // 连上之后主动销毁这条真实连接，让底层 handle 走一次 uv_close
        client.destroy();
    });
    client.on('close', () => {
        console.log('[close callbacks] client socket close');
        server.close();
    });
});

// 对照实验：无连接的服务端，close() 触发的 'close' 事件并不在 close callbacks 阶段
const idle = net.createServer().listen(0);
idle.on('listening', () => idle.close());
idle.on('close', () => {
    console.log('[对照] 无连接 server 的 close（由 nextTick 派发，不是 close callbacks 阶段）');
});

// 两条微任务队列：nextTick 优先级高于 Promise
process.nextTick(() => {
    console.log('[nextTick] 顶层 nextTick');
});
Promise.resolve().then(() => {
    console.log('[微任务] 顶层 promise then');
});

console.log('==== 同步代码结束 ====');

// 预期输出（本机 Node 22 连跑 5 次稳定）：
//
//   ==== 同步代码开始 ====                       <- 同步代码最先跑完，此时所有回调都只是"注册"
//   ==== 同步代码结束 ====
//   [nextTick] 顶层 nextTick                     <- nextTick 队列，优先级最高
//   [对照] 无连接 server 的 close                 <- 也是 nextTick 队列里的（见文末说明）
//   [微任务] 顶层 promise then                    <- Promise 微任务队列
//   [timers] setTimeout callback                 <- 进入事件循环，第一个 timers 阶段
//   [微任务] setTimeout promise then              <- 每个回调返回处都是微任务检查点
//   [check] 顶层 setImmediate                    <- 第一轮的 poll 没有就绪的 I/O，直接进 check
//   [poll] fs.readFile I/O callback              <- 第二轮：文件读完了，回调在 poll 阶段执行
//   [微任务] readFile promise then
//   [check] readFile 里的 setImmediate            <- 同一轮的 check，紧跟在 poll 之后
//   [timers] readFile 里的 setTimeout             <- 再下一轮 timers
//   [close callbacks] client socket close        <- 真实 socket 销毁，落在 close callbacks 阶段
//
// 三个可以直接看出来的结论：
//   1. 同步代码 -> nextTick -> Promise 微任务 -> 宏任务，这层顺序永远不变；
//   2. 写在 poll 回调里的 setImmediate 会"插队"到同一轮的 check 阶段，而 setTimeout(fn, 0)
//      要等下一轮 timers —— 这就是"写在 I/O 回调里的 setImmediate 通常确定先于 setTimeout"的原因；
//   3. close callbacks 是独立的一个阶段，但它**只服务于真正经历过 uv_close 的 handle**。
//
// 那个"对照"是本脚本最值得记住的一点：net.Server.close() 在没有活跃连接时，
// 'close' 事件是通过 process.nextTick 派发的（所以它出现在 nextTick 之后、Promise 之前），
// 根本没有走 close callbacks 阶段。同理，顶层 setTimeout(fn, 0) 与顶层 setImmediate 的先后
// 也受进程启动耗时影响，不是固定契约 —— 想验证就把脚本连跑几次对比。
