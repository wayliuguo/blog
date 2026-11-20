// spawn：最基础的子进程 API，输出走流（不缓存），适合长时间运行 / 大输出程序
const { spawn } = require('node:child_process')

// spawn(command, args, options)：直接执行可执行文件，不经 shell，输出以流的方式边产边吐
const sp = spawn('node', ['-e', 'console.log("spawn 子进程输出: hello")'], { stdio: 'inherit' })
// stdio: 'inherit' 让子进程直接共用父进程的标准输入输出，输出实时出现在当前终端

sp.on('close', code => {
    console.log('--- spawn 退出码:', code)
})
