// exec：整段 shell 字符串，输出全缓冲在内存后一次性回调，适合短命令 / 小量文本输出
const { exec } = require('node:child_process')

// exec(command, callback)：走 shell，输出特别大会撑爆 maxBuffer（默认 1MB）
// 注意：这里用纯 ASCII 命令，避免 Windows 下 cmd 代码页导致中文乱码
exec('echo exec child process output: hello', (err, stdout) => {
    if (err) throw err
    console.log('exec 结果:', stdout.trim())
})
