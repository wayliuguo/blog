// 10 对照四个子进程 API：spawn / exec / execFile / fork
const { spawn, exec, execFile } = require('node:child_process');
const { fork } = require('node:child_process');
const path = require('node:path');

console.log('=== 1) spawn：以流的方式把子进程输出吐出来（不缓存）===');
// spawn 适合二进制/大输出，stdio 直接继承到当前终端
const sp = spawn('node', ['-e', 'console.log("spawn 子进程输出: hello")'], { stdio: 'inherit' });
sp.on('close', (code) => {
  console.log('--- spawn 退出码:', code);

  console.log('\n=== 2) exec：整段 shell 字符串，缓冲输出一次性回调 ===');
  // exec 会把 stdout 缓存到回调里，适合小量文本输出
  // 注意：这里用纯 ASCII 命令，避免 Windows 下 cmd 代码页导致中文乱码
  exec('echo exec child process output: hello', (err, stdout) => {
    if (err) throw err;
    console.log('exec 结果:', stdout.trim());

    console.log('\n=== 3) execFile：直接执行可执行文件，不走 shell ===');
    // execFile 更安全（无 shell 注入风险），这里直接跑 node 可执行文件
    execFile(process.execPath, ['-e', 'console.log("execFile 运行 node 输出: hello")'], (err, stdout) => {
      if (err) throw err;
      console.log('execFile 结果:', stdout.trim());

      console.log('\n=== 4) fork：专门跑 node 子模块，内置 IPC 通道 ===');
      // fork 是 spawn('node', [子文件]) 的语法糖，且自动建立 IPC
      const child = fork(path.join(__dirname, 'worker-fork-child.js'));
      child.on('message', (msg) => {
        console.log('父进程收到子进程消息:', msg);
        child.send({ from: 'parent', text: '收到你的问候' }); // 回一句让子进程退出
      });
      child.on('exit', (code) => {
        console.log('fork 子进程退出码:', code);
        console.log('\n四个 API 对照完成');
        process.exit(0);
      });
      child.send({ from: 'parent', text: '你好，子进程' });
    });
  });
});
