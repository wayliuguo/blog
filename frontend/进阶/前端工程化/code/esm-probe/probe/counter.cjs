// CJS 导出的是「值」：导出那一刻拷一份，之后导出方再变也传不出去
let count = 0

exports.bump = () => {
    count += 1
}
exports.snapshot = count // 导出这一刻的值
exports.read = () => count // 每次调用重新读原变量
