// os 模块：机器信息，是多进程 / 多 Worker 数量决策的依据
const os = require('node:os')

console.log('CPU 核数（os.cpus().length）:', os.cpus().length)
console.log('可用并行度（os.availableParallelism）:', os.availableParallelism())
console.log('总内存:', (os.totalmem() / 1024 / 1024 / 1024).toFixed(1), 'GB')
console.log('空闲内存:', (os.freemem() / 1024 / 1024 / 1024).toFixed(1), 'GB')
console.log('用户主目录:', os.homedir())
console.log('系统临时目录:', os.tmpdir())
console.log('平台:', os.platform(), '，主机名:', os.hostname())
