// execFile：不经 shell 直接执行可执行文件，无 shell 注入面，比 exec 更安全
const { execFile } = require('node:child_process')

// execFile(file, args, callback)：同样缓冲输出一次性回调，但参数走数组不走 shell 拼接
execFile(process.execPath, ['-e', 'console.log("execFile 运行 node 输出: hello")'], (err, stdout) => {
    if (err) throw err
    console.log('execFile 结果:', stdout.trim())
})
